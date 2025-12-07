import React, { useState, useCallback, useEffect, useRef } from 'react'; // useRef eklendi
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes/types';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs, startAfter, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { auth } from '../firebase';
import { useThemeContext } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFavoriteItems, FavoriteItem } from '../contexts/FavoritesContext';

const screenWidth = Dimensions.get('window').width;
const columnWidth = (screenWidth - 45) / 2;
const RECENT_SEARCHES_KEY = '@recent_searches_general';

const HomeScreen = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageHeights, setImageHeights] = useState<{ [key: string]: number }>({});
  const [userNames, setUserNames] = useState<{ [key: string]: string }>({});

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
  const insets = useSafeAreaInsets();
  const { colors, isDarkTheme } = useThemeContext();
  const { favoriteItems, addFavorite, removeFavorite } = useFavoriteItems();

  const styles = React.useMemo(() => createStyles(colors), [colors]);

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

  const fetchData = async () => {
    try {
      const [productSnap, usersSnap] = await Promise.all([
        getDocs(
          query(collection(db, 'products'), where('isSold', '==', false), limit(50))
        ),
        getDocs(collection(db, 'users'))
      ]);

      const userNamesMap: { [key: string]: string } = {};
      const usersList: any[] = [];
      usersSnap.docs.forEach(userDoc => {
        const userData = userDoc.data();
        userNamesMap[userData.username] = userData.fullName || userData.username;
        usersList.push({ id: userDoc.id, ...userData });
      });
      setUserNames(userNamesMap);
      setAllUsers(usersList);

      const productList = productSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
      }));
      setProducts(shuffleArray(productList));

    } catch (error) {
      console.error('Veriler alınırken hata:', error);
    }
  };

  // Veri çekme efekti
  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        setLoading(true);
        await fetchData();
        setLoading(false);
      };
      loadData();
    }, [])
  );
  // Load Recent Searches
  // Load Recent Searches
  useEffect(() => {
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
  }, []);

  const saveRecentSearches = async (searches: string[]) => {
    try {
      const user = auth.currentUser;
      const key = user ? `recentSearches_${user.uid}` : 'recentSearches_guest';
      await AsyncStorage.setItem(key, JSON.stringify(searches));
    } catch (error) {
      console.error('Failed to save recent searches', error);
    }
  };

  // --- FILTER LOGIC (Mirrored from SearchScreen) ---
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

    // Using 'products' (which has 50 items). 
    // User awareness: Only searches loaded products.

    if (searchScope === 'All') {
      currentProductResults = products.filter(product => {
        const titleMatch = product.title?.toLowerCase().includes(queryLower) ?? false;
        const descriptionMatch = product.description?.toLowerCase().includes(queryLower) ?? false;
        const categoryMatch = product.category?.toLowerCase().includes(queryLower) ?? false;
        const usernameMatch = product.username?.toLowerCase().includes(queryLower) ?? false;
        // Owner name match needs looking up owner in allUsers or userNames?
        // products has ownerId? HomeScreen products might not have ownerId mapped, or it assumes username is valid.
        // Let's use username match from product.
        const priceMatch = product.price?.toString().includes(queryLower) ?? false;
        const yearMatch = product.year?.toString().includes(queryLower) ?? false;
        return titleMatch || descriptionMatch || categoryMatch || usernameMatch || priceMatch || yearMatch;
      });
      currentUserResults = allUsers.filter(user => {
        const usernameMatch = user.username?.toLowerCase().includes(queryLower) ?? false;
        const fullNameMatch = user.fullName?.toLowerCase().includes(queryLower) ?? false;
        return usernameMatch || fullNameMatch;
      });
    } else if (searchScope === 'Artwork') {
      currentProductResults = products.filter(p => p.title?.toLowerCase().includes(queryLower) || p.description?.toLowerCase().includes(queryLower) || p.category?.toLowerCase().includes(queryLower));
    } else if (searchScope === 'Artist') {
      currentUserResults = allUsers.filter(user => user.username?.toLowerCase().includes(queryLower) || user.fullName?.toLowerCase().includes(queryLower));
      // Products by artist?
      const artistProducts = products.filter(p => p.username?.toLowerCase().includes(queryLower));
      // Note: HomeScreen products might rely on `username` field.
      currentProductResults = artistProducts;
    } else if (searchScope === 'Price') {
      currentProductResults = products.filter(p => p.price?.toString().includes(queryLower));
    } else if (searchScope === 'Size') {
      currentProductResults = products.filter(p => p.dimensions?.width?.toString().includes(queryLower) || p.dimensions?.height?.toString().includes(queryLower) || p.dimensions?.depth?.toString().includes(queryLower));
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

      // If user hits enter, maybe we STILL go to SearchScreen for FULL results?
      // "Clicking one of these buttons should list the search results accordingly." -> This referred to Filter Chips.
      // "In HomeScreen... Filtering should begin...". 
      // If I am typing, I see results. If I hit Enter, what happens?
      // Usually "Search" button on keyboard commits search. 
      // Navigating to SearchScreen is a safe bet for "Global Search". 
      // The inline results are a preview of visible data.

      navigation.navigate('SearchTab' as any, {
        screen: 'Search',
        params: {
          initialQuery: trimmedQuery,
          initialScope: searchScope
        }
      });

      // Reset Home Search state
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
    // If cleared, logic above sets filtered to empty.
    searchInputRef.current?.focus();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const handleImageLoad = (productId: string, width: number, height: number) => {
    const imageWidth = columnWidth - 20; // card padding (10+10)
    if (width > 0) {
      const aspectRatio = height / width;
      const calculatedHeight = imageWidth * aspectRatio;
      const clampedHeight = Math.max(100, Math.min(calculatedHeight, screenWidth * 1.2));
      setImageHeights(prev => ({ ...prev, [productId]: clampedHeight }));
    } else {
      setImageHeights(prev => ({ ...prev, [productId]: 200 }));
    }
  };


  const distributeProducts = () => {
    const leftColumn: any[] = [];
    const rightColumn: any[] = [];
    let leftHeight = 0;
    let rightHeight = 0;

    products.forEach((product) => {
      const imageHeight = imageHeights[product.id] || 250;
      // GÜNCELLEME: Orijinal koddaki info alanı tahmini (padding hariç ~70-90 idi, padding ile ~110)
      const infoHeightEstimate = 12 + 15 + 6 + 20 + 8 + 20 + 12; // padding + username + margin + title + margin + price + padding
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
  };

  const { leftColumn, rightColumn } = distributeProducts();

  const handleFavoriteToggle = (item: any) => {
    const isFav = favoriteItems.some(fav => fav.id === item.id);
    const imageUrl = item.imageUrls?.[0] || item.imageUrl || null;

    const favItem: FavoriteItem = {
      id: item.id,
      title: item.title || 'Başlık Yok',
      username: item.username || 'Bilinmeyen',
      imageUrl: imageUrl,
      price: item.price || 0,
      year: item.year || '',
    };
    isFav ? removeFavorite(item.id) : addFavorite(favItem);
  };

  // --- GÜNCELLEME: renderProductCard Orijinal Haline Döndürüldü ---
  // (createdAt için handlePress eklendi)
  const renderProductCard = (item: any) => {
    const isFavorite = favoriteItems.some(fav => fav.id === item.id);
    const imageHeight = imageHeights[item.id] || 250;
    const firstImage = item.imageUrls?.[0] || item.imageUrl;

    const displayName = userNames[item.username] || item.username || 'Bilinmeyen';

    // Non-serializable hatasını önlemek için handlePress
    const handlePress = () => {
      const serializableProduct = {
        ...item,
        // createdAt'in Date objesi olup olmadığını kontrol et ve string'e çevir
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : new Date().toISOString(), // Eğer Date değilse şimdiki zamanı kullan
      };
      navigation.navigate('ProductDetail', { product: serializableProduct });
    };

    return (
      <View key={item.id} style={[styles.card, { width: columnWidth }]}>
        <TouchableOpacity
          onPress={handlePress} // handlePress kullanılıyor
          activeOpacity={0.7}
        >
          <View style={styles.imageContainer}>
            {firstImage ? (
              <Image
                source={{ uri: firstImage }}
                style={[styles.image, { height: imageHeight }]}
                onLoad={(e) => {
                  const { width, height } = e.nativeEvent.source;
                  handleImageLoad(item.id, width, height);
                }}
              />
            ) : (
              <View style={[styles.image, styles.noImage, { height: 200 }]}>
                {/* Orijinalde Text kullanılıyordu */}
                <Text style={styles.noImageText}>Resim yok</Text>
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
                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.title} numberOfLines={2}>
              {item.title}{item.year ? `, ${item.year}` : ''}
            </Text>

            <Text style={styles.price}>
              ₺{item.price ? item.price.toLocaleString('tr-TR') : '0'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };
  // --- GÜNCELLEME Sonu ---


  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={{ backgroundColor: colors.background, paddingBottom: 8 }}>
        <View style={styles.searchWrapper}>
          <View style={styles.searchInputContainer}>
            {/* Left Icon (Back or Search) */}
            {isSearchActive ? (
              <TouchableOpacity onPress={handleExitSearch}>
                <Ionicons name="arrow-back" size={20} color={colors.secondaryText} style={styles.searchIcon} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="search" size={20} color={colors.secondaryText} style={styles.searchIcon} />
            )}

            {/* Input Field */}
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
                <Text style={styles.searchPlaceholder}>Ara...</Text>
              </TouchableOpacity>
            )}

            {/* Clear Button */}
            {isSearchActive && searchQuery.length > 0 && (
              <TouchableOpacity style={styles.clearButton} onPress={clearSearchText}>
                <Ionicons name="close" size={20} color={colors.secondaryText} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Scope Chips */}
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
                  {scope === 'Artwork' ? 'Eser' : scope === 'Artist' ? 'Sanatçı' : scope === 'Price' ? 'Fiyat' : scope === 'Size' ? 'Boyut' : 'Tümü'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Main Content Area */}
      {isSearchActive ? (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }} keyboardShouldPersistTaps="handled">
          {searchQuery.length > 0 ? (
            /* --- FILTERED RESULTS VIEW --- */
            <View style={{ padding: 16 }}>
              {/* Users Horizontal Scroll */}
              {filteredUsers.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 10 }}>Kullanıcılar</Text>
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

              {/* Products List */}
              {filteredProducts.length > 0 ? (
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 10 }}>Eserler</Text>
                  {filteredProducts.map(item => (
                    <TouchableOpacity key={item.id} style={{ flexDirection: 'row', marginBottom: 12, alignItems: 'center' }} onPress={() => navigation.navigate('ProductDetail', { product: { ...item, createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : new Date().toISOString() } })}>
                      <Image source={{ uri: Array.isArray(item.imageUrls) ? item.imageUrls[0] : item.imageUrls || item.imageUrl }} style={{ width: 50, height: 50, borderRadius: 8, marginRight: 12, backgroundColor: '#eee' }} />
                      <View>
                        <Text style={{ color: colors.text, fontWeight: '600' }}>{item.title}</Text>
                        <Text style={{ color: colors.secondaryText, fontSize: 12 }}>{item.price} ₺</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                filteredUsers.length === 0 && (
                  <Text style={{ color: colors.secondaryText, textAlign: 'center', marginTop: 20 }}>Sonuç bulunamadı.</Text>
                )
              )}
            </View>
          ) : (
            /* --- RECENT SEARCHES --- */
            recentSearches.length > 0 && (
              <View style={{ padding: 16 }}>
                <Text style={{ color: colors.secondaryText, marginBottom: 10, fontSize: 14 }}>Son Aramalar</Text>
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
        /* --- DEFAULT HOMESCREEN CONTENT --- */
        <>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.text} />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.text}
                  colors={[colors.text]}
                />
              }
              contentContainerStyle={{ paddingBottom: tabBarHeight }}
            >
              <View style={styles.masonryContainer}>
                <View style={styles.column}>
                  {leftColumn.map(renderProductCard)}
                </View>
                <View style={styles.column}>
                  {rightColumn.map(renderProductCard)}
                </View>
              </View>
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
};

export default HomeScreen;

// --- GÜNCELLEME: Stiller Orijinal Haline Döndürüldü ---
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background
  },
  scopeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
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
// --- GÜNCELLEME Sonu ---