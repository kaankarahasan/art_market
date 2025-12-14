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
import AsyncStorage from '@react-native-async-storage/async-storage'; // <-- YENİ IMPORT
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit, DocumentData } from 'firebase/firestore';
import { useFavoriteItems, FavoriteItem } from '../contexts/FavoritesContext';
import { useThemeContext } from '../contexts/ThemeContext';

const screenWidth = Dimensions.get('window').width;
const boxSize = (screenWidth - 48) / 2;
const columnWidth = (screenWidth - 45) / 2;

// AsyncStorage için anahtar


// COLORS sabiti yerine tema renkleri kullanılacak


// --- Category Data with Placeholders ---
// Define heights for asymmetry: roughly alternating tall/short/medium
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

// Split categories into two columns for Masonry
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
  // Store aspect ratios instead of absolute heights to support different column widths
  const [imageAspectRatios, setImageAspectRatios] = useState<{ [key: string]: number }>({});
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // Scoped Search State
  const [searchScope, setSearchScope] = useState<'All' | 'Artwork' | 'Artist' | 'Price' | 'Size'>('All');

  // --- Modal Filtre State'leri ---
  const [selectedPriceFilter, setSelectedPriceFilter] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [selectedArtworkType, setSelectedArtworkType] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);
  const [filterWidth, setFilterWidth] = useState<string>('');
  const [filterHeight, setFilterHeight] = useState<string>('');
  const [filterDepth, setFilterDepth] = useState<string>('');

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<SearchScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { favoriteItems, addFavorite, removeFavorite } = useFavoriteItems();
  const inputRef = useRef<TextInput>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Tema Entegrasyonu
  const { colors, isDarkTheme } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent<BottomTabNavigationProp<any>>()?.setOptions({
        tabBarStyle: { display: 'none' }
      });
      // Refresh Recent Searches on Focus
      loadRecentSearches();

      // Only auto-focus if we have an initial query passed from navigation (e.g. from Home)
      if (route.params?.initialQuery) {
        const timer = setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [navigation, route.params?.initialQuery])
  );

  // Initial Query Handling
  useEffect(() => {
    if (route.params?.initialQuery) {
      const query = route.params.initialQuery;
      setSearchQuery(query);
      setDebouncedSearchQuery(query); // Trigger search
      // Optional: Clear params to prevent re-triggering if needed, 
      // but usually route params persist until change. 
      // We rely on the fact that if user changes query in this screen, normal flow takes over.
    }
  }, [route.params?.initialQuery]);

  // --- ASYNCSTORAGE İŞLEMLERİ ---

  // Son aramaları AsyncStorage'a kaydetme
  const saveRecentSearches = async (searches: string[]) => {
    try {
      const user = auth.currentUser;
      const key = user ? `recentSearches_${user.uid}` : 'recentSearches_guest';
      await AsyncStorage.setItem(key, JSON.stringify(searches));
    } catch (e) {
      console.error('Arama geçmişi kaydedilirken hata:', e);
    }
  };

  // Son aramaları AsyncStorage'dan yükleme
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
  // --- ASYNCSTORAGE İŞLEMLERİ SONU ---

  const fetchAllData = async () => {
    // ... (fetchAllData değişmedi) ...
    try {
      setLoading(true);
      // Verileri yükle
      const [productSnap, usersSnap] = await Promise.all([
        getDocs(query(collection(db, 'products'), where('isSold', '==', false))),
        getDocs(collection(db, 'users'))
      ]);

      const userList: UserSearchResult[] = usersSnap.docs.map(doc => {
        const data = doc.data() as DocumentData;
        return { id: doc.id, username: data.username, fullName: data.fullName, photoURL: data.photoURL };
      });
      setAllUsers(userList);

      const productList = productSnap.docs.map(doc => {
        const dataFromFirestore = doc.data();
        const productObject = { id: doc.id, ...dataFromFirestore, createdAt: dataFromFirestore.createdAt?.toDate?.() || new Date(), viewCount: dataFromFirestore.viewCount || 0 };
        return productObject as unknown as Product;
      });
      setProducts(productList);
      setFinalFilteredProducts(productList);
      setTextFilteredProducts(productList);

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

  // Component mount edildiğinde ve her 'recentSearches' değiştiğinde çalışır
  // Component mount edildiğinde ve her 'recentSearches' değiştiğinde çalışır
  useEffect(() => {
    // Verileri yükle 
    fetchAllData();
  }, []);

  // recentSearches state'i değiştiğinde AsyncStorage'a kaydet (Debounce kullanmadan anında kayıt)
  useEffect(() => {
    saveRecentSearches(recentSearches);
  }, [recentSearches]);

  // hasActiveFilters güncellendi
  const hasActiveFilters = useCallback(() => {
    return !!(selectedArtworkType || selectedStyle || selectedTheme || selectedTechnique ||
      minPrice || maxPrice || filterWidth || filterHeight || filterDepth);
  }, [selectedArtworkType, selectedStyle, selectedTheme, selectedTechnique, minPrice, maxPrice, filterWidth, filterHeight, filterDepth]);

  // Debounce useEffect (Optimized)
  useEffect(() => {
    if (debounceTimeout.current) { clearTimeout(debounceTimeout.current); }

    // Optimization: If queries match (e.g. immediate click), skip debounce delay
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


  // --- Sadece METİN ARAMA Filtreleme Mantığı (Yıl araması eklendi) ---
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

    // --- Scope Logic ---
    if (searchScope === 'All') {
      currentProductResults = products.filter(product => {
        const titleMatch = product.title?.toLowerCase().includes(queryLower) ?? false;
        const descriptionMatch = product.description?.toLowerCase().includes(queryLower) ?? false;
        const categoryMatch = product.category?.toLowerCase().includes(queryLower) ?? false;
        const usernameMatch = product.username?.toLowerCase().includes(queryLower) ?? false;
        const owner = allUsers.find(u => u.id === product.ownerId);
        const fullNameMatch = owner?.fullName?.toLowerCase().includes(queryLower) ?? false;
        const priceMatch = product.price?.toString().includes(queryLower) ?? false;
        const yearMatch = product.year?.toString().includes(queryLower) ?? false;
        return titleMatch || descriptionMatch || categoryMatch || usernameMatch || fullNameMatch || priceMatch || yearMatch;
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
        return titleMatch || descriptionMatch || categoryMatch;
      });
    } else if (searchScope === 'Artist') {
      currentUserResults = allUsers.filter(user => {
        const usernameMatch = user.username?.toLowerCase().includes(queryLower) ?? false;
        const fullNameMatch = user.fullName?.toLowerCase().includes(queryLower) ?? false;
        return usernameMatch || fullNameMatch;
      });
      const artistProducts = products.filter(p => {
        const owner = allUsers.find(u => u.id === p.ownerId);
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

  }, [debouncedSearchQuery, products, allUsers, loading, searchScope]);

  // --- MODAL FİLTRELERİNİ UYGULAMA Mantığı (Boyut filtresi güncellendi) ---
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

    // --- Fiyat Filtreleri (değişmedi) ---
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

    // --- Boyut Filtreleri (GÜNCELLENDİ: Ayrı inputlar ve tam eşleşme) ---
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


  // --- Sütun Dağıtma Fonksiyonu (değişmedi) ---
  const distributeColumns = (items: Product[]) => {
    const leftColumn: Product[] = [];
    const rightColumn: Product[] = [];
    let leftHeight = 0;
    let rightHeight = 0;
    items.forEach(product => {
      // Use aspect ratio to estimate height. Default 1.2 if unknown.
      const aspectRatio = imageAspectRatios[product.id] || 1.2;
      // Image container has padding: 10, so effective width is columnWidth - 20
      const imageWidth = columnWidth - 20;
      const imageHeight = imageWidth * aspectRatio;

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
  };

  // --- Nihai Ürünleri Sütunlara Dağıt ---
  useEffect(() => {
    // Re-trigger distribution when products or aspect ratios change
    const { leftColumn, rightColumn } = distributeColumns(finalFilteredProducts);
    setFilteredLeftColumn(leftColumn);
    setFilteredRightColumn(rightColumn);
  }, [finalFilteredProducts, imageAspectRatios]);

  // handleImageLoad updated to store Aspect Ratio
  const handleImageLoad = (productId: string, event: NativeSyntheticEvent<{ source: { width: number; height: number } }>) => {
    const { width, height } = event.nativeEvent.source;
    if (width > 0 && height > 0) {
      const aspectRatio = height / width;
      // Update state only if ratio changes significantly to avoid loops, though unlikely with key check
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

  // clearFilters güncellendi
  const clearFilters = () => {
    setSelectedPriceFilter(null); setMinPrice(''); setMaxPrice(''); setSelectedArtworkType(null); setSelectedStyle(null); setSelectedTheme(null); setSelectedTechnique(null);
    setFilterWidth(''); setFilterHeight(''); setFilterDepth('');
  };

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
        return sorted.sort((a, b) => parseInt(b.year?.toString() || '0', 10) - parseInt(a.year?.toString() || '0', 10));
      case 'year_old':
        return sorted.sort((a, b) => parseInt(a.year?.toString() || '9999', 10) - parseInt(b.year?.toString() || '9999', 10));
      case 'name_az':
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'tr'));
      case 'name_za':
        return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || '', 'tr'));
      default:
        return sorted;
    }
  };

  // hasActiveFilters useCallback içinde tanımlandı

  // GÜNCELLENDİ: Arama geçmişini kaydetme ve 6 limit uygulama
  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      Keyboard.dismiss();
      setRecentSearches((prev: string[]) => {
        const trimmedQuery = searchQuery.trim();
        // Aynı aramayı listeden çıkar
        const filtered = prev.filter(s => s.toLowerCase() !== trimmedQuery.toLowerCase());
        // Yeni aramayı en başa ekle ve limiti (6) uygula
        const newSearches: string[] = [trimmedQuery, ...filtered].slice(0, 6);
        return newSearches;
      });
      setDebouncedSearchQuery(searchQuery);
    }
  };
  // Recent Search Remove Handler
  const handleRemoveRecentSearch = (itemToRemove: string) => {
    setRecentSearches(prev => {
      const updated = prev.filter(item => item !== itemToRemove);
      saveRecentSearches(updated); // Async save
      return updated;
    });
  };

  // renderCategoryCard helper
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

  // --- Render Fonksiyonları (değişmedi) ---
  const renderSmallBox = (label: string, selected: boolean, onPress: () => void, key?: string | number) => (<TouchableOpacity key={key} onPress={onPress} style={[styles.smallBox, selected && styles.smallBoxSelected]} ><Text style={[styles.smallBoxText, selected && styles.smallBoxTextSelected]}>{label}</Text></TouchableOpacity>);
  // Removed outdated renderFilterBox
  const handleFavoriteToggle = (item: Product) => { const isFav = favoriteItems.some(fav => fav.id === item.id); const imageUrl = Array.isArray(item.imageUrls) ? item.imageUrls[0] : item.imageUrls || undefined; const favItem: FavoriteItem = { id: item.id, title: item.title || 'Başlık Yok', username: item.username || 'Bilinmeyen', imageUrl: imageUrl, price: item.price || 0, year: item.year || '', }; isFav ? removeFavorite(item.id) : addFavorite(favItem); };
  const renderProductCard = (item: Product, cardStyle?: object) => {
    const isFavorite = favoriteItems.some(fav => fav.id === item.id);
    const firstImage = Array.isArray(item.imageUrls) ? item.imageUrls[0] : item.imageUrls;
    const owner = allUsers.find(u => u.id === item.ownerId);
    const displayName = owner?.fullName || owner?.username || item.username || 'Bilinmeyen';

    // Calculate Height based on Aspect Ratio and current Width
    const targetWidth = (cardStyle && (cardStyle as any).width) ? (cardStyle as any).width : columnWidth;
    const aspectRatio = imageAspectRatios[item.id] || 1.2; // Default aspect ratio
    // Clamp height to reasonable limits
    // Use targetWidth * aspectRatio - Padding if needed. If width is boxSize (Horizontal), use calculated.
    // BoxSize calculation:
    const calculatedHeight = targetWidth * aspectRatio;
    // For horizontal scroll views, height is usually dynamic or container restricted?
    // In horizontal scroll we set width to boxSize. Height will be calculated.
    // IMPORTANT: In "Popular/New" horizontal list, we want flexible height for the CARD?
    // But HorizontalScrollView usually aligns items.
    // If items have different heights, it's fine.
    // Max height constraint to prevent massive vertical expansion.
    const finalHeight = Math.max(100, Math.min(calculatedHeight, screenWidth * 1.5));

    const handlePress = () => {
      const serializableProduct = { ...item, createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : new Date().toISOString(), };
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
              onError={(e) => console.log(`Ürün görseli yüklenemedi: ${item.id}`, e.nativeEvent.error)}
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
          <Text style={styles.price}>₺{item.price ? item.price.toLocaleString('tr-TR') : '0'}</Text>
        </View>
      </TouchableOpacity>
    );
  };
  const renderProfileCard = (user: UserSearchResult) => { return (<TouchableOpacity key={user.id} style={styles.profileCard} onPress={() => navigation.navigate('OtherProfile', { userId: user.id })} activeOpacity={0.7} ><Image source={user.photoURL ? { uri: user.photoURL } : require('../assets/default-profile.png')} style={styles.profileCardImage} resizeMode="cover" /><Text style={styles.profileCardUsername} numberOfLines={2}> {user.fullName || user.username || 'Kullanıcı'} </Text></TouchableOpacity>); };
  // --- Render Fonksiyonları Sonu ---

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ... Search Bar ... */}
      <View style={{ backgroundColor: colors.background, paddingBottom: 10, paddingTop: 10 }}>
        {/* ... (Existing Search Bar Code) ... */}
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

      {/* --- Main Content --- */}
      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.text} /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
        >
          {isSearching || hasActiveFilters() || (isFocused && searchQuery.length === 0) ? (
            <View style={styles.resultsContainer}>
              {/* ... (Existing Results View Code) ... */}
              {!isSearching && !hasActiveFilters() && isFocused ? (
                <ScrollView keyboardShouldPersistTaps="handled" style={{ padding: 16 }}>
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
                </ScrollView>
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
            // --- PINTEREST STYLE ASYMMETRICAL DEFAULT VIEW ---
            <View style={{ padding: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 15, marginLeft: 5 }}>Keşfedin</Text>

              <View style={{ flexDirection: 'row' }}>
                {/* Left Column */}
                <View style={{ flex: 1, paddingRight: 5 }}>
                  {leftCategories.map(renderCategoryCard)}
                </View>
                {/* Right Column */}
                <View style={{ flex: 1, paddingLeft: 5 }}>
                  {rightCategories.map(renderCategoryCard)}
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* ... Modals ... */}
      <Modal
        visible={sortModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSortModalVisible(false)}
        statusBarTranslucent={true}
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
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.sortOption, selectedSort === item.key && styles.sortOptionSelected]}
                  onPress={() => setSelectedSort(selectedSort === item.key ? null : item.key)}
                >
                  <Text style={[styles.sortOptionText, selectedSort === item.key && styles.sortOptionTextSelected]}>
                    {item.label}
                  </Text>
                  {selectedSort === item.key && <Ionicons name="checkmark" size={22} color={colors.background} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.sortModalFooter}>
              <TouchableOpacity style={styles.sortCloseButton} onPress={() => setSortModalVisible(false)}>
                <Text style={styles.sortCloseButtonText}>Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Filter Modal logic assumes separate implementation or standard modal, not shown in full file view previously, but usually at end */}
      <Modal
        visible={filterModalVisible}
        animationType="fade" // "slide" yerine "fade"
        transparent={true} // Arka planın görünmesi için true kalmalı
        onRequestClose={() => setFilterModalVisible(false)}
        statusBarTranslucent={true} // Status bar arkasına geçsin
      >
        {/* Arka plan efekti GÜNCELLENDİ (rgba) */}
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detaylı Filtreler</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Fiyat Aralığı (Değişmedi) */}
              <View style={styles.inputSection}>
                <Text style={styles.filterSectionTitle}>Özel Fiyat Aralığı (₺)</Text>
                <View style={styles.priceInputRow}>
                  <TextInput style={styles.priceInput} placeholder="Min" placeholderTextColor={colors.secondaryText} keyboardType="numeric" value={minPrice} onChangeText={setMinPrice} />
                  <Text style={styles.priceSeparator}>-</Text>
                  <TextInput style={styles.priceInput} placeholder="Max" placeholderTextColor={colors.secondaryText} keyboardType="numeric" value={maxPrice} onChangeText={setMaxPrice} />
                </View>
              </View>
              {/* Boyut Alanı (GÜNCELLENDİ) */}
              <View style={styles.inputSection}>
                <Text style={styles.filterSectionTitle}>Eser Boyutları (cm)</Text>
                {/* Genişlik */}
                <View style={styles.dimensionInputContainer}>
                  <Text style={styles.dimensionLabel}>Genişlik:</Text>
                  <TextInput style={styles.dimensionInput} placeholder="Tam eşleşme" placeholderTextColor={colors.secondaryText} keyboardType="numeric" value={filterWidth} onChangeText={setFilterWidth} />
                </View>
                {/* Yükseklik */}
                <View style={styles.dimensionInputContainer}>
                  <Text style={styles.dimensionLabel}>Yükseklik:</Text>
                  <TextInput style={styles.dimensionInput} placeholder="Tam eşleşme" placeholderTextColor={colors.secondaryText} keyboardType="numeric" value={filterHeight} onChangeText={setFilterHeight} />
                </View>
                {/* Derinlik */}
                <View style={styles.dimensionInputContainer}>
                  <Text style={styles.dimensionLabel}>Derinlik:</Text>
                  <TextInput style={styles.dimensionInput} placeholder="Tam eşleşme (Opsiyonel)" placeholderTextColor={colors.secondaryText} keyboardType="numeric" value={filterDepth} onChangeText={setFilterDepth} />
                </View>
              </View>
              {/* Yorum formatı düzeltildi */}
              {/* TODO: Diğer detaylı filtreler buraya eklenebilir */}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.clearFiltersButtonModal} onPress={clearFilters}>
                <Text style={styles.clearFiltersTextModal}>Temizle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyFiltersButton} onPress={() => setFilterModalVisible(false)}>
                <Text style={styles.applyFiltersText}>Uygula</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SearchScreen;

// --- STYLESHEET GÜNCELLENDİ ---
function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    searchWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, backgroundColor: colors.background },
    backButton: { marginRight: 12, padding: 4 },
    searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 16, height: 48 },
    searchIcon: { marginRight: 10 },
    input: { flex: 1, fontSize: 16, color: colors.text },
    clearButton: { padding: 4, marginLeft: 8 },
    filterButton: { marginLeft: 12, padding: 8, backgroundColor: colors.card, borderRadius: 12, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
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
    scrollView: { flex: 1, backgroundColor: colors.background },
    filtersContainer: { backgroundColor: colors.background, paddingVertical: 16 },
    filterSection: { marginBottom: 32 },
    filterSectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16, paddingHorizontal: 16 },
    filterScrollView: { paddingLeft: 16 },
    smallBox: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.card, marginRight: 12, borderWidth: 1, borderColor: colors.card },
    smallBoxSelected: { backgroundColor: colors.text, borderColor: colors.text },
    smallBoxText: { fontSize: 14, fontWeight: '600', color: colors.text },
    smallBoxTextSelected: { color: colors.background },
    filterBox: { borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3, marginRight: 16, position: 'relative', backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center' },
    categoryImage: { width: '100%', height: '100%', position: 'absolute' },
    categoryImageFallback: { width: '100%', height: '100%', position: 'absolute', backgroundColor: '#EEEEEE', justifyContent: 'center', alignItems: 'center' },
    filterTextContainer: { backgroundColor: 'rgba(255, 255, 255, 0.9)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, maxWidth: '90%' },
    filterTextContainerSelected: { backgroundColor: 'rgba(10, 10, 10, 0.9)' },
    filterBoxText: { fontSize: 14, color: colors.text, fontWeight: '700', textAlign: 'center' },
    filterBoxTextSelected: { color: colors.background },

    // --- Ürün Kartı Stilleri (Değişmedi) ---
    card: { borderRadius: 12, overflow: 'hidden', backgroundColor: colors.card, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, marginBottom: 12, },
    imageContainer: { padding: 10, height: 'auto' },
    image: { width: '100%', resizeMode: 'cover', borderRadius: 8 },
    noImage: { width: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8E8E8', borderRadius: 8 },
    noImageText: { color: colors.secondaryText },
    infoContainer: { padding: 12, paddingTop: 0, backgroundColor: colors.card },
    userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    username: { fontSize: 13, color: colors.text, flex: 1 },
    favoriteButton: { padding: 2 },
    title: { fontSize: 15, color: colors.secondaryText, marginBottom: 8, lineHeight: 20 },
    price: { fontSize: 17, fontWeight: 'bold', color: colors.text },
    // --- Ürün Kartı Stilleri Sonu ---

    // --- Profil Kartı Stilleri (Değişmedi) ---
    profileCard: { width: 120, marginRight: 12, alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, padding: 10, paddingBottom: 15, },
    profileCardImage: { width: 80, height: 80, borderRadius: 8, marginBottom: 8, backgroundColor: '#E0E0E0' },
    profileCardUsername: { fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'center', },
    // --- Profil Kartı Stilleri Sonu ---

    // --- ARAMA SONUÇLARI STİLLERİ ---
    resultsContainer: { paddingVertical: 16, minHeight: Dimensions.get('window').height * 0.7 },
    resultsSubTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12, paddingHorizontal: 16, },
    masonryContainer: { flexDirection: 'row', paddingHorizontal: 10 },
    column: { flex: 1, paddingHorizontal: 5 },
    noResultsText: { textAlign: 'center', color: colors.secondaryText, marginTop: 40, fontSize: 16, paddingHorizontal: 16 },
    noRecentSearchesText: { // Yeni eklenen stil
      fontSize: 14,
      color: colors.secondaryText,
    },
    // --- ARAMA SONUÇLARI STİLLERİ SONU ---

    clearAllFiltersButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.text, paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12, marginHorizontal: 16, marginTop: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    clearAllFiltersText: { color: colors.background, fontSize: 16, fontWeight: '700', marginLeft: 8 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },

    // --- Modal Stilleri ---
    modalOverlay: { // Arka plan efekti GERİ GETİRİLDİ
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // Yarı saydam siyah
      justifyContent: 'flex-end'
    },
    modalContainer: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '65%', /* Yükseklik artırıldı */ shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.card },
    modalTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
    modalContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
    inputSection: { marginBottom: 24 },
    priceInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    priceInput: { flex: 1, height: 48, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: colors.text },
    priceSeparator: { fontSize: 18, color: colors.secondaryText, fontWeight: '600' },
    // Boyut input stilleri
    dimensionInputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, },
    dimensionLabel: { fontSize: 16, color: colors.secondaryText, width: 80, },
    dimensionInput: { flex: 1, height: 48, backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: colors.text, },
    // --- Boyut input stilleri sonu ---
    modalFooter: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.card, gap: 12, backgroundColor: colors.background },
    clearFiltersButtonModal: { flex: 1, height: 50, borderRadius: 12, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
    clearFiltersTextModal: { fontSize: 16, fontWeight: '600', color: colors.text },
    applyFiltersButton: { flex: 1, height: 50, borderRadius: 12, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
    applyFiltersText: { fontSize: 16, fontWeight: '600', color: colors.background },

    sortButton: { marginLeft: 8, padding: 8, backgroundColor: colors.card, borderRadius: 12, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    sortModalContainer: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%' },
    sortModalContent: { paddingHorizontal: 20, paddingTop: 10 },
    sortOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 16, marginBottom: 8, borderRadius: 12, backgroundColor: colors.card },
    sortOptionSelected: { backgroundColor: colors.text },
    sortOptionText: { fontSize: 16, fontWeight: '600', color: colors.text },
    sortOptionTextSelected: { color: colors.background },
    sortModalFooter: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.card },
    sortCloseButton: { height: 50, borderRadius: 12, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
    sortCloseButtonText: { fontSize: 16, fontWeight: '600', color: colors.background },
  });
}