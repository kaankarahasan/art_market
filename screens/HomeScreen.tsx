import React, { useState, useCallback, useEffect, useRef } from 'react'; // useRef eklendi
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  ScrollView,
  RefreshControl,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes/types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDocs, onSnapshot, collection, query, where, limit, orderBy, startAfter, FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { useThemeContext } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFavoriteItems, FavoriteItem } from '../contexts/FavoritesContext';
import { useLanguage } from '../contexts/LanguageContext';

const screenWidth = Dimensions.get('window').width;
const columnWidth = (screenWidth - 45) / 2;
const RECENT_SEARCHES_KEY = '@recent_searches_general';

const HomeScreen = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageHeights, setImageHeights] = useState<{ [key: string]: number }>({});
  const [userNames, setUserNames] = useState<{ [key: string]: string }>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastVisible, setLastVisible] = useState<FirebaseFirestoreTypes.QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Search States
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'All' | 'Artwork' | 'Artist' | 'Price' | 'Size'>('All');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Inline Search Filtering States
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);

  const searchInputRef = useRef<TextInput>(null);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDarkTheme } = useThemeContext();
  const { favoriteItems, addFavorite, removeFavorite } = useFavoriteItems();

  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { t } = useLanguage();

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (route.params?.refreshTimeStamp) {
      setIsSearchActive(false);
      setSearchQuery('');
      setSearchScope('All');
      setFilteredProducts([]);
      setFilteredUsers([]);
      Keyboard.dismiss();
      
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      onRefresh();
      
      navigation.setParams({ refreshTimeStamp: undefined });
    }
  }, [route.params?.refreshTimeStamp, navigation]);

  // Dinamik tab bar yüksekliği
  const tabBarHeight = 60 + insets.bottom;

  // HomeScreen her görüntülendiğinde Tab Bar'ı doğru stile getirir.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        tabBarStyle: {
          display: 'flex',
          position: 'absolute',
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: isDarkTheme ? '#333' : '#F0F0F0',
          height: tabBarHeight,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
        }
      });
    }, [navigation, insets.bottom, tabBarHeight, colors, isDarkTheme])
  );

  const fetchData = async (isLoadMore = false) => {
    if (isLoadMore && (!hasMore || loadingMore)) return;

    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setHasMore(true);
        setLastVisible(null);
      }

      // Modular Native Firestore Fetch
      const productsRef = collection(db, 'products');
      
      let q;
      if (isLoadMore && lastVisible) {
        q = query(
          productsRef,
          where('isSold', '==', false),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(20)
        );
      } else {
        q = query(
          productsRef,
          where('isSold', '==', false),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
      }

      // Fetch users once on initial load
      let userList = allUsers;
      if (!isLoadMore) {
        const usersRef = collection(db, 'users');
        const uq = query(usersRef, limit(100));
        const usersSnap = await getDocs(uq);
        userList = usersSnap.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        }));
        setAllUsers(userList);
      }

      const productSnap = await getDocs(q);
      
      if (productSnap.docs.length > 0) {
        // Update last visible document for next pagination
        setLastVisible(productSnap.docs[productSnap.docs.length - 1]);
        
        const newProducts = productSnap.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
        }));

        if (isLoadMore) {
          setProducts(prev => [...prev, ...shuffleArray(newProducts)]);
        } else {
          setProducts(shuffleArray(newProducts));
        }

        // If we got fewer items than limit, we might be near the end
        if (productSnap.docs.length < 20) {
          setLastVisible(null); // End reached, next load will start from top
        }
      } else {
        // No more docs, reset for infinite scrolling
        setLastVisible(null);
        // Explicitly fetch the first page to keep it seamless if they are at the bottom
        if (isLoadMore) {
          const resetQ = query(
            productsRef,
            where('isSold', '==', false),
            orderBy('createdAt', 'desc'),
            limit(20)
          );
          const resetSnap = await getDocs(resetQ);
          if (resetSnap.docs.length > 0) {
            setLastVisible(resetSnap.docs[resetSnap.docs.length - 1]);
            const resetProducts = resetSnap.docs.map((doc: any) => ({
              id: `${doc.id}_loop_${Date.now()}`, // Append loop suffix to avoid key collisions
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
            }));
            setProducts(prev => [...prev, ...shuffleArray(resetProducts)]);
          }
        }
      }

    } catch (error) {
      console.error('Veriler alınırken hata:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    loadData();
  }, []);

  // Realtime listener: Firestore'da isSold değişince anında UI'dan kaldır
  useEffect(() => {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('isSold', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.docs.length > 0) {
        const soldIds = new Set(snapshot.docs.map((d: any) => d.id));
        setProducts(prev => prev.filter(p => !soldIds.has(p.id)));
      }
    });
    return () => unsubscribe();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadRecentSearches = async () => {
        try {
          const user = auth.currentUser;
          const key = user ? `recentSearches_${user.uid}` : 'recentSearches_guest';
          const savedSearches = await AsyncStorage.getItem(key);
          if (savedSearches) {
            setRecentSearches(JSON.parse(savedSearches));
          }
        } catch (error) {
          console.error('Failed to load recent searches', error);
        }
      };
      loadRecentSearches();
    }, [])
  );

  const saveRecentSearches = async (searches: string[]) => {
    try {
      const user = auth.currentUser;
      const key = user ? `recentSearches_${user.uid}` : 'recentSearches_guest';
      await AsyncStorage.setItem(key, JSON.stringify(searches));
    } catch (error) {
      console.error('Failed to save recent searches', error);
    }
  };

  useEffect(() => {
    if (!isSearchActive) return;

    const queryLower = searchQuery.trim().toLowerCase();
    if (queryLower === '') {
      setFilteredProducts([]);
      setFilteredUsers([]);
      return;
    }

    let currentProductResults: any[] = [];
    let currentUserResults: any[] = [];

    if (searchScope === 'All') {
      currentProductResults = products.filter(product => {
        const titleMatch = product.title?.toLowerCase().includes(queryLower) ?? false;
        const descriptionMatch = product.description?.toLowerCase().includes(queryLower) ?? false;
        const categoryMatch = product.category?.toLowerCase().includes(queryLower) ?? false;
        const usernameMatch = product.username?.toLowerCase().includes(queryLower) ?? false;
        const priceMatch = product.price?.toString().includes(queryLower) ?? false;
        const yearMatch = product.year?.toString().includes(queryLower) ?? false;

        const aiTagsMatch = product.aiVisualTags ? (
          Array.isArray(product.aiVisualTags)
            ? product.aiVisualTags.some((tag: string) => tag?.toLowerCase().includes(queryLower))
            : String(product.aiVisualTags).toLowerCase().includes(queryLower)
        ) : false;

        const widthMatch = product.dimensions?.width?.toString().includes(queryLower) ?? false;
        const heightMatch = product.dimensions?.height?.toString().includes(queryLower) ?? false;

        return titleMatch || descriptionMatch || categoryMatch || usernameMatch || priceMatch || yearMatch || aiTagsMatch || widthMatch || heightMatch;
      });
      currentUserResults = allUsers.filter(user => {
        const usernameMatch = user.username?.toLowerCase().includes(queryLower) ?? false;
        const fullNameMatch = user.fullName?.toLowerCase().includes(queryLower) ?? false;
        return usernameMatch || fullNameMatch;
      });
    } else if (searchScope === 'Artwork') {
      currentProductResults = products.filter(p => {
        const titleMatch = p.title?.toLowerCase().includes(queryLower) ?? false;
        const descriptionMatch = p.description?.toLowerCase().includes(queryLower) ?? false;
        const categoryMatch = p.category?.toLowerCase().includes(queryLower) ?? false;
        const aiTagsMatch = p.aiVisualTags ? (
          Array.isArray(p.aiVisualTags)
            ? p.aiVisualTags.some((tag: string) => tag?.toLowerCase().includes(queryLower))
            : String(p.aiVisualTags).toLowerCase().includes(queryLower)
        ) : false;

        const widthMatch = p.dimensions?.width?.toString().includes(queryLower) ?? false;
        const heightMatch = p.dimensions?.height?.toString().includes(queryLower) ?? false;

        return titleMatch || descriptionMatch || categoryMatch || aiTagsMatch || widthMatch || heightMatch;
      });
    } else if (searchScope === 'Artist') {
      currentUserResults = allUsers.filter(user => user.username?.toLowerCase().includes(queryLower) || user.fullName?.toLowerCase().includes(queryLower));
      const artistProducts = products.filter(p => p.username?.toLowerCase().includes(queryLower));
      currentProductResults = artistProducts;
    } else if (searchScope === 'Price') {
      currentProductResults = products.filter(p => p.price?.toString().includes(queryLower));
    } else if (searchScope === 'Size') {
      currentProductResults = products.filter(p => p.dimensions?.width?.toString().includes(queryLower) || p.dimensions?.height?.toString().includes(queryLower));
    }

    setFilteredProducts(currentProductResults);
    setFilteredUsers(currentUserResults);

  }, [searchQuery, searchScope, isSearchActive, products, allUsers]);


  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      const trimmedQuery = searchQuery.trim();
      const newSearches = [trimmedQuery, ...recentSearches.filter(s => s !== trimmedQuery)].slice(0, 6);
      setRecentSearches(newSearches);
      saveRecentSearches(newSearches);

      navigation.navigate('SearchTab' as any, {
        screen: 'Search',
        params: {
          initialQuery: trimmedQuery,
          initialScope: searchScope
        }
      });

      setIsSearchActive(false);
      setSearchQuery('');
      setSearchScope('All');
      Keyboard.dismiss();
    }
  };

  const handleRecentSearchPress = (query: string) => {
    navigation.navigate('SearchTab' as any, { screen: 'Search', params: { initialQuery: query } });
    setIsSearchActive(false);
    setSearchQuery('');
  }

  const handleDeleteRecentSearch = (searchToDelete: string) => {
    const newSearches = recentSearches.filter(s => s !== searchToDelete);
    setRecentSearches(newSearches);
    saveRecentSearches(newSearches);
  };

  const handleExitSearch = () => {
    setIsSearchActive(false);
    setSearchQuery('');
    setSearchScope('All');
    setFilteredProducts([]);
    setFilteredUsers([]);
    Keyboard.dismiss();
  };

  const clearSearchText = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Helper to shuffle array (used later if needed)
  const shuffleArray = (array: any[]) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }: any) => {
    const paddingToBottom = 800; // Reduced from 1500 for better control
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  };

  const loadMoreData = () => {
    if (loadingMore || !hasMore) return;
    fetchData(true);
  };

  const handleImageLoad = (productId: string, width: number, height: number) => {
    const imageWidth = columnWidth - 20;
    if (width > 0) {
      const aspectRatio = height / width;
      const calculatedHeight = imageWidth * aspectRatio;
      const clampedHeight = Math.max(100, Math.min(calculatedHeight, screenWidth * 1.2));
      setImageHeights(prev => ({ ...prev, [productId]: clampedHeight }));
    } else {
      setImageHeights(prev => ({ ...prev, [productId]: 200 }));
    }
  };


  const distributeProducts = useCallback(() => {
    const leftColumn: any[] = [];
    const rightColumn: any[] = [];
    let leftHeight = 0;
    let rightHeight = 0;

    products.forEach((product) => {
      // Hızla asimetrik düzen oluşturmak için: 
      // Eğer görsel daha yüklenmediyse, ID'ye dayalı "sabit ama rastgele" bir yükseklik ata.
      // Bu sayede sayfa açılır açılmaz düzgün bir masonry görünümü olur.
      const stableRandomHeight = (parseInt(product.id.substring(0, 8), 16) % 150) + 200;
      const imageHeight = imageHeights[product.id] || stableRandomHeight;
      
      const infoHeightEstimate = 100; // Metin alanları için tahmini pay
      const cardHeight = imageHeight + infoHeightEstimate;

      if (leftHeight <= rightHeight) {
        leftColumn.push(product);
        leftHeight += cardHeight;
      } else {
        rightColumn.push(product);
        rightHeight += cardHeight;
      }
    });
    return { leftColumn, rightColumn };
  }, [products, imageHeights]);

  const { leftColumn, rightColumn } = distributeProducts();

  const handleFavoriteToggle = (item: any) => {
    const isFav = favoriteItems.some(fav => fav.id === item.id);
    const imageUrl = item.imageUrls?.[0] || item.imageUrl || null;

    const favItem: FavoriteItem = { id: item.id, title: item.title || 'Başlık Yok', username: item.username || 'Bilinmeyen', imageUrl: imageUrl, price: item.price || 0, year: item.year || '', createdAt: item.createdAt };
    isFav ? removeFavorite(item.id) : addFavorite(favItem);
  };

  const renderProductCard = (item: any) => {
    const isFavorite = favoriteItems.some(fav => fav.id === item.id);
    
    // Asimetrik düzen için stabil rastgele başlangıç yüksekliği
    const stableRandomHeight = (parseInt(item.id.substring(0, 8), 16) % 150) + 200;
    const imageHeight = imageHeights[item.id] || stableRandomHeight;
    const firstImage = Array.isArray(item.imageUrls) && item.imageUrls.length > 0 
      ? item.imageUrls[0] 
      : (item.mainImageUrl || item.imageUrl || (typeof item.imageUrls === 'string' ? item.imageUrls : null));

    const displayName = userNames[item.username] || item.username || 'Bilinmeyen';
    
    const isProductNew = (() => {
      if (!item.createdAt) return false;
      const date = item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt);
      return (new Date().getTime() - date.getTime()) < 48 * 60 * 60 * 1000;
    })();

    const handlePress = () => {
      const serializableProduct = {
        ...item,
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : new Date().toISOString(),
      };
      navigation.navigate('ProductDetail', { product: serializableProduct });
    };

    return (
      <View key={item.id} style={[styles.card, { width: columnWidth }]}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <View style={styles.imageContainer}>
            {firstImage ? (
              <Image
                source={{ uri: typeof firstImage === 'string' ? firstImage : undefined }}
                style={[styles.image, { height: imageHeight, backgroundColor: isDarkTheme ? '#2a2a2a' : '#f0f0f0' }]}
                onLoad={(e) => {
                  const { width, height } = e.nativeEvent.source;
                  handleImageLoad(item.id, width, height);
                }}
              />
            ) : (
              <View style={[styles.image, styles.noImage, { height: 200 }]}>
                <Text style={styles.noImageText}>Resim yok</Text>
              </View>
            )}
            
            {isProductNew && (
              <View style={styles.newBadgeContainer}>
                <View style={styles.newBadgeBackground}>
                  <Text style={styles.newBadgeText}>{t('newBadge')}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.userRow}>
              <Text style={styles.username} numberOfLines={1}>
                {displayName}
              </Text>
              <TouchableOpacity
                onPress={() => handleFavoriteToggle(item)}
                style={styles.favoriteButton}
              >
                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={18} color={isFavorite ? '#FF3040' : colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.title} numberOfLines={2}>
              {item.title}{item.year ? `, ${item.year}` : ''}
            </Text>

            <Text style={styles.price}>
              ₺{item.price ? Number(item.price).toLocaleString('tr-TR') : '0'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };


  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={{ backgroundColor: colors.background, paddingBottom: 8 }}>
        <View style={styles.searchWrapper}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.searchInputContainer, { flex: 1 }]}>
              {isSearchActive ? (
                <TouchableOpacity onPress={handleExitSearch}>
                  <Ionicons name="arrow-back" size={20} color={colors.secondaryText} style={styles.searchIcon} />
                </TouchableOpacity>
              ) : (
                <Ionicons name="search" size={20} color={colors.secondaryText} style={styles.searchIcon} />
              )}

              {isSearchActive ? (
                <TextInput
                  ref={searchInputRef}
                  style={styles.input}
                  placeholder={
                    searchScope === 'All' ? "İsim, kategori, yıl, fiyat..." :
                      searchScope === 'Artwork' ? "Eser adı, açıklama..." :
                        searchScope === 'Artist' ? "Sanatçı ara..." :
                          searchScope === 'Price' ? "Fiyat ara..." : "Boyut ara..."
                  }
                  placeholderTextColor={colors.secondaryText}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearchSubmit}
                  returnKeyType="search"
                  autoFocus
                />
              ) : (
                <TouchableOpacity
                  style={{ flex: 1, justifyContent: 'center' }}
                  onPress={() => setIsSearchActive(true)}
                  activeOpacity={1}
                >
                  <Text style={styles.searchPlaceholder}>{t('searchPlaceholder')}</Text>
                </TouchableOpacity>
              )}

              {isSearchActive && searchQuery.length > 0 && (
                <TouchableOpacity style={styles.clearButton} onPress={clearSearchText}>
                  <Ionicons name="close" size={20} color={colors.secondaryText} />
                </TouchableOpacity>
              )}
            </View>

            {!isSearchActive && (
              <TouchableOpacity
                style={{
                  marginLeft: 10,
                  width: 48,
                  height: 48,
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: isDarkTheme ? '#333' : '#F0F0F0',
                }}
                onPress={() => navigation.navigate('GeminiChat' as any)}
              >
                <Ionicons name="sparkles" size={24} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isSearchActive && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }} keyboardShouldPersistTaps="handled">
            {(['All', 'Artwork', 'Artist', 'Price', 'Size'] as const).map((scope) => (
              <TouchableOpacity
                key={scope}
                style={[
                  styles.scopeChip,
                  searchScope === scope && styles.scopeChipSelected,
                  { borderColor: colors.border || '#e0e0e0' }
                ]}
                onPress={() => setSearchScope(scope)}
              >
                <Text style={[
                  styles.scopeChipText,
                  searchScope === scope && styles.scopeChipTextSelected,
                  { color: searchScope === scope ? colors.background : colors.text }
                ]}>
                  {scope === 'Artwork' ? t('artwork') : scope === 'Artist' ? t('artist') : scope === 'Price' ? t('price') : scope === 'Size' ? t('sizeScope') : t('all')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {isSearchActive ? (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }} keyboardShouldPersistTaps="handled">
          {searchQuery.length > 0 ? (
            <View style={{ padding: 16 }}>
              {filteredUsers.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 10 }}>{t('users')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {filteredUsers.map(user => (
                      <TouchableOpacity key={user.id} style={{ marginRight: 16, alignItems: 'center' }} onPress={() => navigation.navigate('OtherProfile', { userId: user.id })}>
                        <Image source={user.photoURL ? { uri: user.photoURL } : require('../assets/default-profile.png')} style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#e0e0e0', marginBottom: 4 }} />
                        <Text style={{ color: colors.text, fontSize: 12 }}>{user.username}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {filteredProducts.length > 0 ? (
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 10 }}>{t('artworksSection')}</Text>
                  {filteredProducts.map(item => (
                    <TouchableOpacity key={item.id} style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'center' }} onPress={() => navigation.navigate('ProductDetail', { product: { ...item, createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : new Date().toISOString() } })}>
                      <Image source={{ uri: Array.isArray(item.imageUrls) && item.imageUrls[0] ? item.imageUrls[0] : (item.mainImageUrl || item.imageUrl) }} style={{ width: 50, height: 50, borderRadius: 8, marginRight: 12, backgroundColor: '#eee' }} />
                      <View>
                        <Text style={{ color: colors.text, fontWeight: '600' }}>{item.title}</Text>
                        <Text style={{ color: colors.secondaryText, fontSize: 12 }}>₺{Number(item.price).toLocaleString('tr-TR')}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                filteredUsers.length === 0 && (
                  <Text style={{ color: colors.secondaryText, textAlign: 'center', marginTop: 20 }}>{t('noResults')}</Text>
                )
              )}
            </View>
          ) : (
            recentSearches.length > 0 && (
              <View style={{ padding: 16 }}>
                <Text style={{ color: colors.secondaryText, marginBottom: 10, fontSize: 14 }}>{t('recentSearches')}</Text>
                {recentSearches.map((item, index) => (
                  <View key={index} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border || '#e0e0e0' }}>
                    <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => handleRecentSearchPress(item)}>
                      <Ionicons name="time-outline" size={20} color={colors.secondaryText} style={{ marginRight: 10 }} />
                      <Text style={{ color: colors.text, fontSize: 16 }}>{item}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteRecentSearch(item)} style={{ padding: 4 }}>
                      <Ionicons name="close" size={18} color={colors.secondaryText} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )
          )}
        </ScrollView>
      ) : (
        <>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.text} />
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.text}
                  colors={[colors.text]}
                />
              }
              contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
              onScroll={({ nativeEvent }) => {
                if (isCloseToBottom(nativeEvent)) {
                  loadMoreData();
                }
              }}
              scrollEventThrottle={16}
            >
              <View style={styles.masonryContainer}>
                <View style={styles.column}>
                  {leftColumn.map((item) => renderProductCard(item))}
                </View>
                <View style={styles.column}>
                  {rightColumn.map((item) => renderProductCard(item))}
                </View>
              </View>
              {loadingMore && (
                <View style={{ paddingVertical: 20 }}>
                  <ActivityIndicator size="small" color={colors.text} />
                </View>
              )}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
};

export default HomeScreen;

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  searchPlaceholder: {
    color: colors.secondaryText,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  masonryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  column: {
    flex: 1,
    paddingHorizontal: 5,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  imageContainer: {
    padding: 10
  },
  image: {
    width: '100%',
    resizeMode: 'contain',
    borderRadius: 8
  },
  noImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background
  },
  noImageText: {
    color: colors.secondaryText
  },
  infoContainer: {
    padding: 12,
    paddingTop: 0,
    backgroundColor: colors.card
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  username: {
    fontSize: 13,
    color: colors.text,
    flex: 1
  },
  favoriteButton: {
    padding: 2
  },
  title: {
    fontSize: 15,
    color: colors.secondaryText,
    marginBottom: 8,
    lineHeight: 20
  },
  price: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text
  },
  newBadgeContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 60,
    height: 60,
    overflow: 'hidden',
  },
  newBadgeBackground: {
    position: 'absolute',
    top: 5,
    right: -20,
    backgroundColor: '#FF3040',
    width: 80,
    height: 24,
    transform: [{ rotate: '45deg' }],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background
  },
  scopeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  scopeChipSelected: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  scopeChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scopeChipTextSelected: {
    fontWeight: '700',
  },
});