import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Modal,
  Image,
  Keyboard,
  NativeSyntheticEvent
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Product } from '../routes/types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { query, collection, where, limit, getDocs } from '@react-native-firebase/firestore';
import { db, auth } from '../firebase';
import { useFavoriteItems, FavoriteItem } from '../contexts/FavoritesContext';
import { useThemeContext } from '../contexts/ThemeContext';

const screenWidth = Dimensions.get('window').width;
const boxSize = (screenWidth - 48) / 2;
const columnWidth = (screenWidth - 45) / 2;

const categoryHeights = [220, 180, 160, 240, 240, 190, 180, 260, 200, 220, 160];

const CATEGORY_DATA = [
  { label: 'Yağlı Boya', value: 'yagli_boya' },
  { label: 'Suluboya', value: 'suluboya' },
  { label: 'Akrilik', value: 'akrilik' },
  { label: 'Heykel', value: 'heykel' },
  { label: 'Fotoğraf', value: 'fotograf' },
  { label: 'Dijital Sanat', value: 'dijital' },
  { label: 'Çizim', value: 'cizim' },
  { label: 'Grafik Tasarım', value: 'grafik' },
  { label: 'Seramik', value: 'seramik' },
  { label: 'Kolaj', value: 'kolaj' },
  { label: 'Diğer', value: 'diger' }
];

const categories = CATEGORY_DATA.map((item, index) => ({
  name: item.label,
  value: item.value,
  height: categoryHeights[index % categoryHeights.length],
  imageUrl: `https://picsum.photos/seed/${item.value}/300/${200 + (index % 5) * 50}`
}));

const leftCategories = categories.filter((_, i) => i % 2 === 0);
const rightCategories = categories.filter((_, i) => i % 2 !== 0);

type UserSearchResult = {
  id: string;
  username?: string;
  fullName?: string;
  photoURL?: string;
};

type SearchScreenRouteProp = RouteProp<{ params: { initialQuery?: string } }, 'params'>;

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [allUsers, setAllUsers] = useState<UserSearchResult[]>([]);
  const [textFilteredProducts, setTextFilteredProducts] = useState<Product[]>([]);
  const [textFilteredUsers, setTextFilteredUsers] = useState<UserSearchResult[]>([]);
  const [finalFilteredProducts, setFinalFilteredProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [filteringLoader, setFilteringLoader] = useState<boolean>(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [newProducts, setNewProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
  const [sortModalVisible, setSortModalVisible] = useState<boolean>(false);
  const [selectedSort, setSelectedSort] = useState<string | null>(null);
  const [filteredLeftColumn, setFilteredLeftColumn] = useState<Product[]>([]);
  const [filteredRightColumn, setFilteredRightColumn] = useState<Product[]>([]);
  const [imageAspectRatios, setImageAspectRatios] = useState<{ [key: string]: number }>({});
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const [searchScope, setSearchScope] = useState<'All' | 'Artwork' | 'Artist' | 'Price' | 'Size'>('All');

  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [filterWidth, setFilterWidth] = useState<string>('');
  const [filterHeight, setFilterHeight] = useState<string>('');
  const [filterDepth, setFilterDepth] = useState<string>('');

  const [tempMinPrice, setTempMinPrice] = useState<string>('');
  const [tempMaxPrice, setTempMaxPrice] = useState<string>('');
  const [tempWidth, setTempWidth] = useState<string>('');
  const [tempHeight, setTempHeight] = useState<string>('');
  const [tempDepth, setTempDepth] = useState<string>('');

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<SearchScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { favoriteItems, addFavorite, removeFavorite } = useFavoriteItems();
  const inputRef = useRef<TextInput>(null);
  const debounceTimeout = useRef<any>(null);

  const { colors, isDarkTheme } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const userMap = React.useMemo(() => {
    const map: { [key: string]: UserSearchResult } = {};
    allUsers.forEach(u => map[u.id] = u);
    return map;
  }, [allUsers]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent<BottomTabNavigationProp<any>>()?.setOptions({
        tabBarStyle: { display: 'none' }
      });
    }, [navigation])
  );

  useEffect(() => {
    loadRecentSearches();

    if (route.params?.initialQuery) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [navigation, route.params?.initialQuery]);

  useEffect(() => {
    if (route.params?.initialQuery) {
      const query = route.params.initialQuery;
      setSearchQuery(query);
      setDebouncedSearchQuery(query);
    }
  }, [route.params?.initialQuery]);

  const saveRecentSearches = async (searches: string[]) => {
    try {
      const user = auth.currentUser;
      const key = user ? `recentSearches_${user.uid}` : 'recentSearches_guest';
      await AsyncStorage.setItem(key, JSON.stringify(searches));
    } catch (e) {
      console.error('Arama geçmişi kaydedilirken hata:', e);
    }
  };

  const loadRecentSearches = async () => {
    try {
      const user = auth.currentUser;
      const key = user ? `recentSearches_${user.uid}` : 'recentSearches_guest';
      const jsonValue = await AsyncStorage.getItem(key);
      if (jsonValue != null) {
        setRecentSearches(JSON.parse(jsonValue));
      }
    } catch (e) {
      console.error('Arama geçmişi yüklenirken hata:', e);
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);

      // Project ID kontrolü (Script ile aynı mı?)
      console.log(`🔗 [DEBUG] Firebase Project ID: ${db.app.options.projectId}`);

      // Modular Native Firestore Fetches - Cache'i atlayıp doğrudan sunucudan çekelim
      // @ts-ignore
      const productSnap = await collection(db, 'products')
        .where('isSold', '==', false)
        .limit(1000)
        .get(); // Not: Native SDK varsayılan olarak taze veriyi çekmeye çalışır

      const productList: Product[] = productSnap.docs.map((doc: any) => {
        const dataFromFirestore = doc.data();
        return {
          id: doc.id,
          ...dataFromFirestore,
          createdAt: dataFromFirestore.createdAt?.toDate?.() || new Date(),
          viewCount: dataFromFirestore.viewCount || 0
        } as unknown as Product;
      });

      setProducts(productList);

      // --- KRİTİK DEBUG LOGLARI ---
      const taggedProducts = productList.filter((p: Product) => p.aiVisualTags && p.aiVisualTags.length > 0);
      console.log(`📦 Toplam Yüklenen: ${productList.length} ürün.`);
      console.log(`✨ Etiketli Ürün Sayısı: ${taggedProducts.length}`);

      if (taggedProducts.length > 0) {
        console.log(`🎯 İlk Etiketli Ürün (${taggedProducts[0].title}):`, taggedProducts[0].aiVisualTags);
      } else {
        console.warn('⚠️ DİKKAT: Hiçbir üründe aiVisualTags bulunamadı!');
      }
      // ----------------------------

      setFinalFilteredProducts(productList);
      setTextFilteredProducts(productList);

      // Kullanıcı verileri
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(500)));
      const userList: UserSearchResult[] = usersSnap.docs.map((doc: any) => {
        const data = doc.data();
        return { id: doc.id, username: data.username, fullName: data.fullName, photoURL: data.photoURL };
      });
      setAllUsers(userList);

      const popularList = [...productList].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
      setPopularProducts(popularList);

      const newList = [...productList].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      setNewProducts(newList);
    } catch (error) {
      console.error('Veriler alınırken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    saveRecentSearches(recentSearches);
  }, [recentSearches]);

  const hasActiveFilters = useCallback(() => {
    return !!(minPrice || maxPrice || filterWidth || filterHeight || filterDepth);
  }, [minPrice, maxPrice, filterWidth, filterHeight, filterDepth]);

  useEffect(() => {
    if (debounceTimeout.current) { clearTimeout(debounceTimeout.current); }

    if (searchQuery === debouncedSearchQuery) {
      setIsSearching(searchQuery.trim().length > 0);
      return;
    }

    if (searchQuery.trim().length > 0 || hasActiveFilters()) {
      setFilteringLoader(true);
      setIsSearching(true);
    } else {
      setFilteringLoader(false);
      setIsSearching(false);
      setTextFilteredProducts(products);
      setTextFilteredUsers([]);
      setFinalFilteredProducts(products);
    }

    debounceTimeout.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      if (debounceTimeout.current) { clearTimeout(debounceTimeout.current); }
    };
  }, [searchQuery, products, hasActiveFilters, debouncedSearchQuery]);


  useEffect(() => {
    if (!products.length && !allUsers.length || loading) return;

    const queryLower = debouncedSearchQuery.trim().toLowerCase();

    if (queryLower === '') {
      setTextFilteredProducts(products);
      setTextFilteredUsers([]);
      return;
    }

    setFilteringLoader(true);

    let currentProductResults: Product[] = [];
    let currentUserResults: UserSearchResult[] = [];

    if (searchScope === 'All') {
      currentProductResults = products.filter(product => {
        const titleMatch = product.title?.toLowerCase().includes(queryLower) ?? false;
        const descriptionMatch = product.description?.toLowerCase().includes(queryLower) ?? false;
        const categoryMatch = product.category?.toLowerCase().includes(queryLower) ?? false;
        const usernameMatch = product.username?.toLowerCase().includes(queryLower) ?? false;
        const owner = userMap[product.ownerId || ''];
        const fullNameMatch = owner?.fullName?.toLowerCase().includes(queryLower) ?? false;
        const priceMatch = product.price?.toString().includes(queryLower) ?? false;
        const yearMatch = product.year?.toString().includes(queryLower) ?? false;

        // AI Tag matching - handles both array of tags and single string containing tags
        const aiTagsMatch = product.aiVisualTags ? (
          Array.isArray(product.aiVisualTags)
            ? product.aiVisualTags.some(tag => {
              const match = tag?.toLowerCase().includes(queryLower);
              if (match) console.log(`🎯 Match found in tag: "${tag}" for product: ${product.title}`);
              return match;
            })
            : String(product.aiVisualTags).toLowerCase().includes(queryLower)
        ) : false;

        const widthMatch = product.dimensions?.width?.toString().includes(queryLower) ?? false;
        const heightMatch = product.dimensions?.height?.toString().includes(queryLower) ?? false;
        const depthMatch = product.dimensions?.depth?.toString().includes(queryLower) ?? false;

        return titleMatch || descriptionMatch || categoryMatch || usernameMatch || fullNameMatch || priceMatch || yearMatch || aiTagsMatch || widthMatch || heightMatch || depthMatch;
      });
      currentUserResults = allUsers.filter(user => {
        const usernameMatch = user.username?.toLowerCase().includes(queryLower) ?? false;
        const fullNameMatch = user.fullName?.toLowerCase().includes(queryLower) ?? false;
        return usernameMatch || fullNameMatch;
      });

    } else if (searchScope === 'Artwork') {
      currentProductResults = products.filter(product => {
        const titleMatch = product.title?.toLowerCase().includes(queryLower) ?? false;
        const descriptionMatch = product.description?.toLowerCase().includes(queryLower) ?? false;
        const categoryMatch = product.category?.toLowerCase().includes(queryLower) ?? false;
        const aiTagsMatch = product.aiVisualTags ? (
          Array.isArray(product.aiVisualTags)
            ? product.aiVisualTags.some(tag => {
              const match = tag?.toLowerCase().includes(queryLower);
              if (match) console.log(`🎯 Match found in tag: "${tag}" for product: ${product.title}`);
              return match;
            })
            : String(product.aiVisualTags).toLowerCase().includes(queryLower)
        ) : false;

        const widthMatch = product.dimensions?.width?.toString().includes(queryLower) ?? false;
        const heightMatch = product.dimensions?.height?.toString().includes(queryLower) ?? false;
        const depthMatch = product.dimensions?.depth?.toString().includes(queryLower) ?? false;

        return titleMatch || descriptionMatch || categoryMatch || aiTagsMatch || widthMatch || heightMatch || depthMatch;
      });
    } else if (searchScope === 'Artist') {
      currentUserResults = allUsers.filter(user => {
        const usernameMatch = user.username?.toLowerCase().includes(queryLower) ?? false;
        const fullNameMatch = user.fullName?.toLowerCase().includes(queryLower) ?? false;
        return usernameMatch || fullNameMatch;
      });
      const artistProducts = products.filter(p => {
        const owner = userMap[p.ownerId || ''];
        const nameMatch = owner?.fullName?.toLowerCase().includes(queryLower) ?? false;
        const usernameMatch = p.username?.toLowerCase().includes(queryLower) ?? false;
        return nameMatch || usernameMatch;
      });
      currentProductResults = artistProducts;

    } else if (searchScope === 'Price') {
      currentProductResults = products.filter(product => {
        return product.price?.toString().includes(queryLower) ?? false;
      });
    } else if (searchScope === 'Size') {
      currentProductResults = products.filter(product => {
        const widthMatch = product.dimensions?.width?.toString().includes(queryLower) ?? false;
        const heightMatch = product.dimensions?.height?.toString().includes(queryLower) ?? false;
        const depthMatch = product.dimensions?.depth?.toString().includes(queryLower) ?? false;
        return widthMatch || heightMatch || depthMatch;
      });
    }

    setTextFilteredProducts(currentProductResults);
    setTextFilteredUsers(currentUserResults);
    console.log(`🔍 Search Results: Found ${currentProductResults.length} products for query "${queryLower}"`);

  }, [debouncedSearchQuery, products, allUsers, loading, searchScope]);

  useEffect(() => {
    if (loading) return;

    if (isSearching || hasActiveFilters()) {
      setFilteringLoader(true);
    } else {
      setFinalFilteredProducts(products);
      setFilteringLoader(false);
      return;
    }

    let currentlyFilteredProducts = textFilteredProducts;

    const numericMinPrice = minPrice ? parseFloat(minPrice) : null;
    const numericMaxPrice = maxPrice ? parseFloat(maxPrice) : null;
    if (numericMinPrice !== null || numericMaxPrice !== null) {
      currentlyFilteredProducts = currentlyFilteredProducts.filter(p => {
        const price = p.price ?? null;
        if (price === null) return false;
        const meetsMin = (numericMinPrice !== null && !isNaN(numericMinPrice)) ? price >= numericMinPrice : true;
        const meetsMax = (numericMaxPrice !== null && !isNaN(numericMaxPrice)) ? price <= numericMaxPrice : true;
        return meetsMin && meetsMax;
      });
    }

    const numericWidth = filterWidth ? parseFloat(filterWidth) : null;
    const numericHeight = filterHeight ? parseFloat(filterHeight) : null;
    const numericDepth = filterDepth ? parseFloat(filterDepth) : null;

    if (numericWidth !== null || numericHeight !== null || numericDepth !== null) {
      currentlyFilteredProducts = currentlyFilteredProducts.filter(p => {
        const dims = p.dimensions;
        if (!dims) return false;
        let productWidth: number | null = null;
        if (dims.width != null) { if (typeof dims.width === 'string') { const parsed = parseInt(dims.width, 10); if (!isNaN(parsed)) productWidth = parsed; } else if (typeof dims.width === 'number') { productWidth = dims.width; } }
        let productHeight: number | null = null;
        if (dims.height != null) { if (typeof dims.height === 'string') { const parsed = parseInt(dims.height, 10); if (!isNaN(parsed)) productHeight = parsed; } else if (typeof dims.height === 'number') { productHeight = dims.height; } }
        let productDepth: number | null = null;
        if (dims.depth != null) { if (typeof dims.depth === 'string') { const parsed = parseInt(dims.depth, 10); if (!isNaN(parsed)) productDepth = parsed; } else if (typeof dims.depth === 'number') { productDepth = dims.depth; } }
        let widthMatch = true; if (numericWidth !== null && !isNaN(numericWidth)) { if (productWidth === null || productWidth !== numericWidth) widthMatch = false; }
        let heightMatch = true; if (numericHeight !== null && !isNaN(numericHeight)) { if (productHeight === null || productHeight !== numericHeight) heightMatch = false; }
        let depthMatch = true; if (numericDepth !== null && !isNaN(numericDepth)) { if (productDepth === null || productDepth !== numericDepth) depthMatch = false; }
        return widthMatch && heightMatch && depthMatch;
      });
    }

    currentlyFilteredProducts = sortProducts(currentlyFilteredProducts);
    setFinalFilteredProducts(currentlyFilteredProducts);
    setFilteringLoader(false);

  }, [
    textFilteredProducts, minPrice, maxPrice, filterWidth, filterHeight, filterDepth, loading, isSearching, hasActiveFilters, products, selectedSort
  ]);


  const distributeColumns = useCallback((items: Product[]) => {
    if (!Array.isArray(items)) return { leftColumn: [], rightColumn: [] };

    const leftColumn: Product[] = [];
    const rightColumn: Product[] = [];
    let leftHeight = 0;
    let rightHeight = 0;

    items.forEach(product => {
      const aspectRatio = imageAspectRatios[product.id] || 1.2;
      const imageWidth = columnWidth - 20;
      let imageHeight = imageWidth * aspectRatio;

      if (isNaN(imageHeight)) imageHeight = imageWidth * 1.2;

      const infoHeightEstimate = 110;
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
  }, [imageAspectRatios, columnWidth]);

  useEffect(() => {
    const { leftColumn, rightColumn } = distributeColumns(finalFilteredProducts);
    setFilteredLeftColumn(leftColumn);
    setFilteredRightColumn(rightColumn);
  }, [finalFilteredProducts, distributeColumns]);

  const handleImageLoad = (productId: string, event: NativeSyntheticEvent<{ source: { width: number; height: number } }>) => {
    const { width, height } = event.nativeEvent.source;
    if (width > 0 && height > 0) {
      const aspectRatio = height / width;
      if (imageAspectRatios[productId] !== aspectRatio) {
        setImageAspectRatios(prev => ({ ...prev, [productId]: aspectRatio }));
      }
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    inputRef.current?.focus();
  };

  const handleBackPress = () => {
    if (isSearching || isFocused || searchQuery.length > 0) {
      setIsSearching(false);
      setSearchQuery('');
      setDebouncedSearchQuery('');
      Keyboard.dismiss();
      inputRef.current?.blur();
    } else {
      navigation.goBack();
    }
  };

  const clearFilters = () => {
    setTempMinPrice(''); setTempMaxPrice('');
    setTempWidth(''); setTempHeight(''); setTempDepth('');
    setMinPrice(''); setMaxPrice(''); setFilterWidth(''); setFilterHeight(''); setFilterDepth('');
  };

  const applyFilters = () => {
    setMinPrice(tempMinPrice);
    setMaxPrice(tempMaxPrice);
    setFilterWidth(tempWidth);
    setFilterHeight(tempHeight);
    setFilterDepth(tempDepth);
    setFilterModalVisible(false);
  };

  useEffect(() => {
    if (filterModalVisible) {
      setTempMinPrice(minPrice);
      setTempMaxPrice(maxPrice);
      setTempWidth(filterWidth);
      setTempHeight(filterHeight);
      setTempDepth(filterDepth);
    }
  }, [filterModalVisible]);

  const sortProducts = (productsToSort: Product[]): Product[] => {
    if (!selectedSort) return productsToSort;
    const sorted = [...productsToSort];
    switch (selectedSort) {
      case 'price_high':
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'price_low':
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'date_new':
        return sorted.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      case 'date_old':
        return sorted.sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));
      case 'year_new':
        return sorted.sort((a, b) => {
          const yrA = parseInt(a.year?.toString() || '0', 10);
          const yrB = parseInt(b.year?.toString() || '0', 10);
          return (yrB || 0) - (yrA || 0);
        });
      case 'year_old':
        return sorted.sort((a, b) => {
          const yrA = parseInt(a.year?.toString() || '9999', 10);
          const yrB = parseInt(b.year?.toString() || '9999', 10);
          return (yrA || 0) - (yrB || 0);
        });
      case 'name_az':
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr'));
      case 'name_za':
        return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || '', 'tr'));
      default:
        return sorted;
    }
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      Keyboard.dismiss();
      setRecentSearches((prev: string[]) => {
        const trimmedQuery = searchQuery.trim();
        const filtered = prev.filter(s => s.toLowerCase() !== trimmedQuery.toLowerCase());
        const newSearches: string[] = [trimmedQuery, ...filtered].slice(0, 6);
        return newSearches;
      });
      setDebouncedSearchQuery(searchQuery);
    }
  };

  const handleRemoveRecentSearch = (itemToRemove: string) => {
    setRecentSearches(prev => {
      const updated = prev.filter(item => item !== itemToRemove);
      saveRecentSearches(updated);
      return updated;
    });
  };

  const renderCategoryCard = (cat: { name: string, value: string, height: number, imageUrl: string }) => (
    <TouchableOpacity
      key={cat.name}
      style={{
        width: '100%',
        height: cat.height,
        marginBottom: 10,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#eee'
      }}
      onPress={() => {
        setSearchQuery(cat.value);
        setDebouncedSearchQuery(cat.value);
      }}
    >
      <Image
        source={{ uri: cat.imageUrl }}
        style={{ width: '100%', height: '100%', position: 'absolute' }}
        resizeMode="cover"
      />
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', padding: 4 }}>{cat.name}</Text>
      </View>
    </TouchableOpacity>
  );

  const handleFavoriteToggle = (item: Product) => {
    const isFav = favoriteItems.some(fav => fav.id === item.id);
    const imageUrl = Array.isArray(item.imageUrls) ? item.imageUrls[0] : item.imageUrls || undefined;
    const favItem: FavoriteItem = { id: item.id, title: item.title || 'Başlık Yok', username: item.username || 'Bilinmeyen', imageUrl: imageUrl, price: item.price || 0, year: item.year || '', };
    isFav ? removeFavorite(item.id) : addFavorite(favItem);
  };

  const renderProductCard = (item: Product, cardStyle?: object) => {
    const isFavorite = favoriteItems.some(fav => fav.id === item.id);
    const firstImage = Array.isArray(item.imageUrls) ? item.imageUrls[0] : item.imageUrls;
    const owner = userMap[item.ownerId || ''];
    const displayName = owner?.fullName || owner?.username || item.username || 'Bilinmeyen';

    const targetWidth = (cardStyle && (cardStyle as any).width) ? (cardStyle as any).width : columnWidth;
    const aspectRatio = imageAspectRatios[item.id] || 1.2;
    let calculatedHeight = targetWidth * aspectRatio;

    if (isNaN(calculatedHeight)) calculatedHeight = targetWidth * 1.2;
    const finalHeight = Math.max(100, Math.min(calculatedHeight, screenWidth * 1.5));

    const handlePress = () => {
      const serializableProduct = {
        ...item,
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : (typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString()),
      };
      navigation.navigate('ProductDetail', { product: serializableProduct });
    };

    return (
      <TouchableOpacity key={item.id} style={[styles.card, cardStyle || { width: columnWidth }]} onPress={handlePress} activeOpacity={0.7}>
        <View style={styles.imageContainer}>
          {firstImage ? (
            <Image
              source={{ uri: firstImage || undefined }}
              style={[styles.image, { height: finalHeight }]}
              resizeMode="cover"
              onLoad={(e) => handleImageLoad(item.id, e)}
            />
          ) : (
            <View style={[styles.noImage, { height: finalHeight }]}>
              <Text style={styles.noImageText}>Resim yok</Text>
            </View>
          )}
        </View>
        <View style={styles.infoContainer}>
          <View style={styles.userRow}>
            <Text style={styles.username} numberOfLines={1}>{displayName}</Text>
            <TouchableOpacity onPress={() => handleFavoriteToggle(item)} style={styles.favoriteButton}>
              <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.title} numberOfLines={2}>{item.title}{item.year ? `, ${item.year}` : ''}</Text>
          <Text style={styles.price}>₺{item.price ? Number(item.price).toLocaleString('tr-TR') : '0'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderProfileCard = (user: UserSearchResult) => {
    return (
      <TouchableOpacity key={user.id} style={styles.profileCard} onPress={() => navigation.navigate('OtherProfile', { userId: user.id })} activeOpacity={0.7}>
        <Image source={user.photoURL ? { uri: user.photoURL } : require('../assets/default-profile.png')} style={styles.profileCardImage} resizeMode="cover" />
        <Text style={styles.profileCardUsername} numberOfLines={2}> {user.fullName || user.username || 'Kullanıcı'} </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={{ backgroundColor: colors.background, paddingBottom: 10, paddingTop: 10 }}>
        <View style={styles.searchWrapper}>
          <View style={[styles.searchInputContainer, { borderRadius: 30, height: 50, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 }]}>
            {isSearching || isFocused ? (
              <TouchableOpacity onPress={handleBackPress}>
                <Ionicons name="arrow-back" size={24} color={colors.text} style={{ marginRight: 10 }} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="search" size={24} color={colors.secondaryText} style={{ marginRight: 10 }} />
            )}

            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.text, fontSize: 16 }]}
              placeholder="Ara..."
              placeholderTextColor={colors.secondaryText}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
                <Ionicons name="close-circle" size={20} color={colors.secondaryText} />
              </TouchableOpacity>
            )}
          </View>

          {!isSearching && !isFocused && (
            <TouchableOpacity style={{ marginLeft: 10 }} onPress={() => setFilterModalVisible(true)}>
              <Ionicons name="options" size={28} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.text} /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
        >
          {isSearching || hasActiveFilters() || (isFocused && searchQuery.length === 0) ? (
            <View style={styles.resultsContainer}>
              {!isSearching && !hasActiveFilters() && isFocused ? (
                <View style={{ padding: 16 }}>
                  <Text style={[styles.filterSectionTitle, { marginBottom: 10 }]}>Son Aramalar</Text>
                  {recentSearches.map((term, index) => (
                    <TouchableOpacity key={index} onPress={() => { setSearchQuery(term); setDebouncedSearchQuery(term); }} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}>
                      <Ionicons name="time-outline" size={20} color={colors.secondaryText} style={{ marginRight: 10 }} />
                      <Text style={{ color: colors.text, fontSize: 16, flex: 1 }}>{term}</Text>
                      <TouchableOpacity onPress={() => handleRemoveRecentSearch(term)}>
                        <Ionicons name="close" size={18} color={colors.secondaryText} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                filteringLoader ?
                  <ActivityIndicator size="small" color={colors.text} style={{ marginVertical: 20 }} /> :
                  (textFilteredUsers.length === 0 && finalFilteredProducts.length === 0 ?
                    <Text style={styles.noResultsText}>Sonuç bulunamadı.</Text> :
                    <View style={{ padding: 10 }}>
                      {textFilteredUsers.length > 0 && searchScope !== 'Artwork' && (
                        <View style={{ marginBottom: 20 }}>
                          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 10, marginLeft: 5 }}>Sanatçılar</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {textFilteredUsers.map(user => renderProfileCard(user))}
                          </ScrollView>
                        </View>
                      )}
                      {finalFilteredProducts.length > 0 && (
                        <View style={{ flexDirection: 'row' }}>
                          <View style={{ flex: 1, paddingRight: 5 }}>
                            {filteredLeftColumn.map(item => renderProductCard(item, { width: (screenWidth - 30) / 2, marginBottom: 10 }))}
                          </View>
                          <View style={{ flex: 1, paddingLeft: 5 }}>
                            {filteredRightColumn.map(item => renderProductCard(item, { width: (screenWidth - 30) / 2, marginBottom: 10 }))}
                          </View>
                        </View>
                      )}
                    </View>
                  )
              )}
            </View>
          ) : (
            <View style={{ padding: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 15, marginLeft: 5 }}>Keşfedin</Text>

              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, paddingRight: 5 }}>
                  {leftCategories.map(renderCategoryCard)}
                </View>
                <View style={{ flex: 1, paddingLeft: 5 }}>
                  {rightCategories.map(renderCategoryCard)}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrele</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.filterLabel}>Fiyat Aralığı (₺)</Text>
              <View style={styles.priceRow}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Min"
                  placeholderTextColor={colors.secondaryText}
                  keyboardType="numeric"
                  value={tempMinPrice}
                  onChangeText={setTempMinPrice}
                />
                <TextInput
                  style={styles.priceInput}
                  placeholder="Max"
                  placeholderTextColor={colors.secondaryText}
                  keyboardType="numeric"
                  value={tempMaxPrice}
                  onChangeText={setTempMaxPrice}
                />
              </View>

              <Text style={styles.filterLabel}>Boyutlar (cm)</Text>
              <View style={styles.priceRow}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="Genişlik"
                  placeholderTextColor={colors.secondaryText}
                  keyboardType="numeric"
                  value={tempWidth}
                  onChangeText={setTempWidth}
                />
                <TextInput
                  style={styles.priceInput}
                  placeholder="Yükseklik"
                  placeholderTextColor={colors.secondaryText}
                  keyboardType="numeric"
                  value={tempHeight}
                  onChangeText={setTempHeight}
                />
                <TextInput
                  style={styles.priceInput}
                  placeholder="Derinlik"
                  placeholderTextColor={colors.secondaryText}
                  keyboardType="numeric"
                  value={tempDepth}
                  onChangeText={setTempDepth}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                <Text style={styles.clearBtnText}>Temizle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <Text style={styles.applyBtnText}>Uygula</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={sortModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSortModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sortModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sıralama</Text>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sortModalContent}>
              {[
                { key: 'price_high', label: 'Fiyat: Yüksekten Düşüğe' },
                { key: 'price_low', label: 'Fiyat: Düşükten Yükseğe' },
                { key: 'date_new', label: 'Tarih: Önce Yeni' },
                { key: 'date_old', label: 'Tarih: Önce Eski' },
                { key: 'year_new', label: 'Yıl: Önce Yeni' },
                { key: 'year_old', label: 'Yıl: Önce Eski' },
                { key: 'name_az', label: 'İsim: A-Z' },
                { key: 'name_za', label: 'İsim: Z-A' },
              ].map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.sortItem}
                  onPress={() => { setSelectedSort(item.key); setSortModalVisible(false); }}
                >
                  <Text style={[styles.sortItemText, selectedSort === item.key && { color: colors.primary, fontWeight: '700' }]}>{item.label}</Text>
                  {selectedSort === item.key && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SearchScreen;

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingHorizontal: 15 },
  input: { flex: 1, height: '100%' },
  clearButton: { padding: 5 },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  resultsContainer: { flex: 1 },
  noResultsText: { textAlign: 'center', marginTop: 50, color: colors.secondaryText },
  profileCard: { marginRight: 15, alignItems: 'center', width: 80 },
  profileCardImage: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#eee', marginBottom: 5 },
  profileCardUsername: { color: colors.text, fontSize: 12, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden' },
  imageContainer: { width: '100%' },
  image: { width: '100%' },
  noImage: { width: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#eee' },
  noImageText: { color: colors.secondaryText },
  infoContainer: { padding: 10 },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  username: { color: colors.secondaryText, fontSize: 12, flex: 1 },
  favoriteButton: { padding: 2 },
  title: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 5 },
  price: { color: colors.text, fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30, maxHeight: '80%' },
  sortModalContainer: { backgroundColor: colors.background, paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  modalContent: { padding: 20 },
  sortModalContent: { padding: 10 },
  filterLabel: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 15, marginBottom: 10 },
  priceRow: { flexDirection: 'row', gap: 10 },
  priceInput: { flex: 1, height: 45, backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 15, color: colors.text, borderWidth: 1, borderColor: colors.border },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 15 },
  clearBtn: { flex: 1, height: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  clearBtnText: { color: colors.text, fontWeight: '600' },
  applyBtn: { flex: 1, height: 50, backgroundColor: colors.text, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  applyBtnText: { color: colors.background, fontWeight: '600' },
  sortItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  sortItemText: { fontSize: 16, color: colors.text },
  filterSectionTitle: { fontSize: 14, fontWeight: '700', color: colors.secondaryText, textTransform: 'uppercase' },
  smallBox: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, marginRight: 10, marginBottom: 10 },
  smallBoxSelected: { backgroundColor: colors.text, borderColor: colors.text },
  smallBoxText: { color: colors.text, fontSize: 14 },
  smallBoxTextSelected: { color: colors.background, fontWeight: '700' },
});