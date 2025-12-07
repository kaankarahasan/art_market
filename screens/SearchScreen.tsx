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
  ImageLoadEventData, NativeSyntheticEvent
} from 'react-native';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Product } from '../routes/types';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage'; // <-- YENİ IMPORT
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit, DocumentData } from 'firebase/firestore';
import { useFavoriteItems, FavoriteItem } from '../contexts/FavoritesContext';
import { useThemeContext } from '../contexts/ThemeContext';

const screenWidth = Dimensions.get('window').width;
const boxSize = (screenWidth - 48) / 2;
const columnWidth = (screenWidth - 45) / 2;

// AsyncStorage için anahtar
const RECENT_SEARCHES_KEY = '@recent_searches_general';

// COLORS sabiti yerine tema renkleri kullanılacak


// ... categoryImages ...
const categoryImages: { [key: string]: any } = {
  'Tablo': require('../assets/SearchScreenBoxBackground/tablo.png'),
  'Heykel': require('../assets/SearchScreenBoxBackground/heykel.png'),
  'Fotoğraf': require('../assets/SearchScreenBoxBackground/fotograf.png'),
  'Baskı': require('../assets/SearchScreenBoxBackground/baski.png'),
  'Çizim': require('../assets/SearchScreenBoxBackground/cizim.png'),
  'Dijital': require('../assets/SearchScreenBoxBackground/dijital.png'),
  'Seramik': require('../assets/SearchScreenBoxBackground/seramik.png'),
  'Enstalasyon': require('../assets/SearchScreenBoxBackground/modern.png'),
  'Modern': require('../assets/SearchScreenBoxBackground/modern.png'),
  'SoyutStil': require('../assets/SearchScreenBoxBackground/soyut.png'),
  'Empresyonizm': require('../assets/SearchScreenBoxBackground/empresyonizm.png'),
  'Realizm': require('../assets/SearchScreenBoxBackground/realizm.png'),
  'Kübizm': require('../assets/SearchScreenBoxBackground/kubizm.png'),
  'Sürrealizm': require('../assets/SearchScreenBoxBackground/surrealizm.png'),
  'Pop Art': require('../assets/SearchScreenBoxBackground/popart.png'),
  'Minimalizm': require('../assets/SearchScreenBoxBackground/minimalizm.png'),
  'Portre': require('../assets/SearchScreenBoxBackground/portre.png'),
  'Manzara': require('../assets/SearchScreenBoxBackground/manzara.png'),
  'Natürmort': require('../assets/SearchScreenBoxBackground/naturmort.png'),
  'SoyutTema': require('../assets/SearchScreenBoxBackground/soyut.png'),
  'Figüratif': require('../assets/SearchScreenBoxBackground/figuratif.png'),
  'Şehir': require('../assets/SearchScreenBoxBackground/sehir.png'),
  'Deniz': require('../assets/SearchScreenBoxBackground/deniz.png'),
  'Yağlıboya': require('../assets/SearchScreenBoxBackground/yagliboya.png'),
  'Akrilik': require('../assets/SearchScreenBoxBackground/akrilik.png'),
  'Suluboya': require('../assets/SearchScreenBoxBackground/suluboya.png'),
  'Karışık': require('../assets/SearchScreenBoxBackground/karisik.png'),
  'Tuval': require('../assets/SearchScreenBoxBackground/tuval.png'),
  'Kağıt': require('../assets/SearchScreenBoxBackground/kagit.png'),
  'Ahşap': require('../assets/SearchScreenBoxBackground/ahsap.png'),
  'Metal': require('../assets/SearchScreenBoxBackground/metal.png'),
};


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
  const [imageHeights, setImageHeights] = useState<{ [key: string]: number }>({});

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
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }, [navigation])
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
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
    } catch (e) {
      console.error('Arama geçmişi kaydedilirken hata:', e);
    }
  };

  // Son aramaları AsyncStorage'dan yükleme
  const loadRecentSearches = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
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

      const popularList = [...productList].sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 6);
      setPopularProducts(popularList);

      const newList = [...productList].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)).slice(0, 6);
      setNewProducts(newList);
    } catch (error) {
      console.error('Veriler alınırken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  // Component mount edildiğinde ve her 'recentSearches' değiştiğinde çalışır
  useEffect(() => {
    // Yalnızca ilk yüklemede AsyncStorage'dan geçmişi yükle
    loadRecentSearches();
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

  // Debounce useEffect (değişmedi)
  useEffect(() => {
    if (debounceTimeout.current) { clearTimeout(debounceTimeout.current); } if (searchQuery.trim().length > 0 || hasActiveFilters()) { setFilteringLoader(true); setIsSearching(searchQuery.trim().length > 0); } else { setFilteringLoader(false); setIsSearching(false); setTextFilteredProducts(products); setTextFilteredUsers([]); setFinalFilteredProducts(products); } debounceTimeout.current = setTimeout(() => { setDebouncedSearchQuery(searchQuery); }, 300); return () => { if (debounceTimeout.current) { clearTimeout(debounceTimeout.current); } };
  }, [searchQuery, products, hasActiveFilters]);


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

    // Ürünleri filtrele
    const currentProductResults = products.filter(product => {
      const titleMatch = product.title?.toLowerCase().includes(queryLower) ?? false;
      const descriptionMatch = product.description?.toLowerCase().includes(queryLower) ?? false;
      const categoryMatch = product.category?.toLowerCase().includes(queryLower) ?? false;
      const usernameMatch = product.username?.toLowerCase().includes(queryLower) ?? false;
      const owner = allUsers.find(u => u.id === product.ownerId);
      const fullNameMatch = owner?.fullName?.toLowerCase().includes(queryLower) ?? false;
      const priceMatch = product.price?.toString().includes(queryLower) ?? false;
      const yearMatch = product.year?.toString().includes(queryLower) ?? false; // Yıl araması

      return titleMatch || descriptionMatch || categoryMatch || usernameMatch ||
        fullNameMatch || priceMatch || yearMatch; // yearMatch eklendi
    });

    // Kullanıcıları filtrele
    const currentUserResults = allUsers.filter(user => {
      const usernameMatch = user.username?.toLowerCase().includes(queryLower) ?? false;
      const fullNameMatch = user.fullName?.toLowerCase().includes(queryLower) ?? false;
      return usernameMatch || fullNameMatch;
    });

    setTextFilteredProducts(currentProductResults);
    setTextFilteredUsers(currentUserResults);
    // Yükleniyor durumu diğer useEffect'de kapatılacak

  }, [debouncedSearchQuery, products, allUsers, loading]);

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
    // --- Boyut Filtresi Sonu ---

    // TODO: Diğer modal filtrelerini buraya ekle (selectedArtworkType vs.)
    // if (selectedArtworkType) { ... }

    currentlyFilteredProducts = sortProducts(currentlyFilteredProducts);
    setFinalFilteredProducts(currentlyFilteredProducts);
    setFilteringLoader(false);

  }, [
    textFilteredProducts, minPrice, maxPrice, filterWidth, filterHeight, filterDepth, loading, isSearching, hasActiveFilters, products, selectedSort
  ]);


  // --- Sütun Dağıtma Fonksiyonu (değişmedi) ---
  const distributeColumns = (items: Product[]) => { /* ... */ const leftColumn: Product[] = []; const rightColumn: Product[] = []; let leftHeight = 0; let rightHeight = 0; items.forEach(product => { const imageHeight = imageHeights[product.id] || (columnWidth - 20) * 1.2; const infoHeightEstimate = 110; const cardHeight = imageHeight + infoHeightEstimate; if (leftHeight <= rightHeight) { leftColumn.push(product); leftHeight += cardHeight; } else { rightColumn.push(product); rightHeight += cardHeight; } }); return { leftColumn, rightColumn }; };

  // --- Nihai Ürünleri Sütunlara Dağıt ---
  useEffect(() => { /* ... */ const { leftColumn, rightColumn } = distributeColumns(finalFilteredProducts); setFilteredLeftColumn(leftColumn); setFilteredRightColumn(rightColumn); }, [finalFilteredProducts, imageHeights]);

  // handleImageLoad (değişmedi)
  const handleImageLoad = (productId: string, event: NativeSyntheticEvent<{ source: { width: number; height: number } }>) => { /* ... */ const { width, height } = event.nativeEvent.source; const imageWidth = columnWidth - 20; if (width > 0) { const aspectRatio = height / width; const calculatedHeight = imageWidth * aspectRatio; const clampedHeight = Math.max(100, Math.min(calculatedHeight, screenWidth * 1.2)); if (imageHeights[productId] !== clampedHeight) { setImageHeights(prev => ({ ...prev, [productId]: clampedHeight })); } } else { if (!imageHeights[productId]) { setImageHeights(prev => ({ ...prev, [productId]: 200 })); } } };

  const clearSearch = () => {
    // Silinmeyi engelleme isteği üzerine, sadece input'u temizler, geçmişi değil.
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setIsSearching(false);
    Keyboard.dismiss();
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

  // --- Render Fonksiyonları (değişmedi) ---
  const renderSmallBox = (label: string, selected: boolean, onPress: () => void, key?: string | number) => (<TouchableOpacity key={key} onPress={onPress} style={[styles.smallBox, selected && styles.smallBoxSelected]} ><Text style={[styles.smallBoxText, selected && styles.smallBoxTextSelected]}>{label}</Text></TouchableOpacity>);
  const renderFilterBox = (label: string, imageKey: string, selected: boolean, onPress: () => void, key?: string | number) => { const imageSource = categoryImages[imageKey]; return (<TouchableOpacity key={key} onPress={onPress} style={[styles.filterBox, { width: boxSize, height: boxSize }]}>{imageSource ? (<Image source={imageSource} style={styles.categoryImage} resizeMode="cover" onError={(e) => console.log(`Görsel yüklenemedi: ${imageKey}`, e.nativeEvent.error)} />) : (<View style={styles.categoryImageFallback}><Text style={{ fontSize: 10, color: 'red' }}>Bulunamadı: {imageKey}</Text></View>)}<View style={[styles.filterTextContainer, selected && styles.filterTextContainerSelected]}><Text style={[styles.filterBoxText, selected && styles.filterBoxTextSelected]} numberOfLines={3}>{label}</Text></View></TouchableOpacity>); };
  const handleFavoriteToggle = (item: Product) => { const isFav = favoriteItems.some(fav => fav.id === item.id); const imageUrl = Array.isArray(item.imageUrls) ? item.imageUrls[0] : item.imageUrls || undefined; const favItem: FavoriteItem = { id: item.id, title: item.title || 'Başlık Yok', username: item.username || 'Bilinmeyen', imageUrl: imageUrl, price: item.price || 0, year: item.year || '', }; isFav ? removeFavorite(item.id) : addFavorite(favItem); };
  const renderProductCard = (item: Product, cardStyle?: object) => { const isFavorite = favoriteItems.some(fav => fav.id === item.id); const firstImage = Array.isArray(item.imageUrls) ? item.imageUrls[0] : item.imageUrls; const owner = allUsers.find(u => u.id === item.ownerId); const displayName = owner?.fullName || owner?.username || item.username || 'Bilinmeyen'; const imageHeight = imageHeights[item.id] || (cardStyle && (cardStyle as any).width === boxSize ? boxSize : columnWidth * 1.2); const handlePress = () => { const serializableProduct = { ...item, createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : new Date().toISOString(), }; navigation.navigate('ProductDetail', { product: serializableProduct }); }; return (<TouchableOpacity key={item.id} style={[styles.card, cardStyle || { width: columnWidth }]} onPress={handlePress} activeOpacity={0.7} ><View style={styles.imageContainer}>{firstImage ? (<Image source={{ uri: firstImage || undefined }} style={[styles.image, { height: imageHeight }]} resizeMode="cover" onLoad={(e) => handleImageLoad(item.id, e)} onError={(e) => console.log(`Ürün görseli yüklenemedi: ${item.id}`, e.nativeEvent.error)} />) : (<View style={[styles.noImage, { height: imageHeight }]}><Text style={styles.noImageText}>Resim yok</Text></View>)}</View><View style={styles.infoContainer}><View style={styles.userRow}><Text style={styles.username} numberOfLines={1}>{displayName}</Text><TouchableOpacity onPress={() => handleFavoriteToggle(item)} style={styles.favoriteButton} ><Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={colors.text} /></TouchableOpacity></View><Text style={styles.title} numberOfLines={2}> {item.title}{item.year ? `, ${item.year}` : ''} </Text><Text style={styles.price}> ₺{item.price ? item.price.toLocaleString('tr-TR') : '0'} </Text></View></TouchableOpacity>); };
  const renderProfileCard = (user: UserSearchResult) => { return (<TouchableOpacity key={user.id} style={styles.profileCard} onPress={() => navigation.navigate('OtherProfile', { userId: user.id })} activeOpacity={0.7} ><Image source={user.photoURL ? { uri: user.photoURL } : require('../assets/default-profile.png')} style={styles.profileCardImage} resizeMode="cover" /><Text style={styles.profileCardUsername} numberOfLines={2}> {user.fullName || user.username || 'Kullanıcı'} </Text></TouchableOpacity>); };
  // --- Render Fonksiyonları Sonu ---


  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* --- Arama Çubuğu --- */}
      <View style={styles.searchWrapper}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={colors.secondaryText} style={styles.searchIcon} />
          <TextInput ref={inputRef} style={styles.input} placeholder="İsim, kategori, yıl, fiyat..." /* Boyut kaldırıldı */ placeholderTextColor={colors.secondaryText} value={searchQuery} onChangeText={setSearchQuery} returnKeyType="search" onSubmitEditing={handleSearchSubmit} autoFocus={false} />
          {searchQuery.length > 0 && (<TouchableOpacity style={styles.clearButton} onPress={clearSearch}><Ionicons name="close-circle" size={20} color={colors.secondaryText} /></TouchableOpacity>)}
        </View>
        <TouchableOpacity style={styles.sortButton} onPress={() => setSortModalVisible(true)}>
          <Ionicons name="swap-vertical-outline" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)} >
          <Ionicons name="options-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* --- Ana İçerik Alanı --- */}
      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.text} /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView} keyboardShouldPersistTaps="handled" onScrollBeginDrag={Keyboard.dismiss} >
          {/* Arama modu veya modal filtreleri aktifse sonuçları göster */}
          {isSearching || hasActiveFilters() ? (
            <View style={styles.resultsContainer}>
              {filteringLoader ? (
                <ActivityIndicator size="small" color={colors.text} style={{ marginVertical: 20 }} />
              ) : (
                // Hem kullanıcı hem ürün sonucu yoksa mesaj göster
                textFilteredUsers.length === 0 && finalFilteredProducts.length === 0 ? (
                  <Text style={styles.noResultsText}>
                    {debouncedSearchQuery ? `"${debouncedSearchQuery}" için ` : ""}
                    Sonuç bulunamadı.
                    {hasActiveFilters() ? "\nFiltreleri kontrol edin veya temizleyin." : ""}
                  </Text>
                ) : (
                  <>
                    {/* Kullanıcılar (sadece metin aramasında görünür) */}
                    {isSearching && textFilteredUsers.length > 0 && (
                      <View style={styles.filterSection}>
                        <Text style={styles.resultsSubTitle}>Kullanıcılar</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
                          {textFilteredUsers.map(user => renderProfileCard(user))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Eserler (Nihai filtrelenmiş liste) */}
                    {finalFilteredProducts.length > 0 && (
                      <View style={styles.filterSection}>
                        {(isSearching && textFilteredUsers.length > 0 || hasActiveFilters()) &&
                          <Text style={styles.resultsSubTitle}>Eserler</Text>
                        }
                        <View style={styles.masonryContainer}>
                          <View style={styles.column}>
                            {filteredLeftColumn.map(item => renderProductCard(item))}
                          </View>
                          <View style={styles.column}>
                            {filteredRightColumn.map(item => renderProductCard(item))}
                          </View>
                        </View>
                      </View>
                    )}
                  </>
                )
              )}
            </View>
          ) : (
            // --- VARSAYILAN GÖRÜNÜM (Arama yok, Filtre yok) ---
            <View style={styles.filtersContainer}>

              {/* --- GÜNCELLENMİŞ SON ARAMALAR BÖLÜMÜ --- */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Son Aramalar</Text>
                {recentSearches.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
                    {recentSearches.map((search) => renderSmallBox(search, false, () => setSearchQuery(search), search))}
                  </ScrollView>
                ) : (
                  <Text style={[styles.noRecentSearchesText, { paddingHorizontal: 16 }]}>Henüz arama yapmadınız.</Text>
                )}
              </View>
              {/* --- SON ARAMALAR BÖLÜMÜ SONU --- */}

              {popularProducts.length > 0 && (<View style={styles.filterSection}><Text style={styles.filterSectionTitle}>Popüler Eserler</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>{popularProducts.map(product => renderProductCard(product, { width: boxSize, marginRight: 16 }))}</ScrollView></View>)}
              {newProducts.length > 0 && (<View style={styles.filterSection}><Text style={styles.filterSectionTitle}>Yeni Eklenenler</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>{newProducts.map(product => renderProductCard(product, { width: boxSize, marginRight: 16 }))}</ScrollView></View>)}
              {/* ... Diğer filtre kutuları ... */}
              <View style={styles.filterSection}><Text style={styles.filterSectionTitle}>Fiyat</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>{renderSmallBox('5.000₺ altı', selectedPriceFilter === '5000', () => setSelectedPriceFilter(selectedPriceFilter === '5000' ? null : '5000'), 'price-5000')}{renderSmallBox('10.000₺ altı', selectedPriceFilter === '10000', () => setSelectedPriceFilter(selectedPriceFilter === '10000' ? null : '10000'), 'price-10000')}{renderSmallBox('50.000₺ altı', selectedPriceFilter === '50000', () => setSelectedPriceFilter(selectedPriceFilter === '50000' ? null : '50000'), 'price-50000')}{renderSmallBox('100.000₺ altı', selectedPriceFilter === '100000', () => setSelectedPriceFilter(selectedPriceFilter === '100000' ? null : '100000'), 'price-100000')}</ScrollView></View>
              {/* Hızlı boyut filtreleri kaldırıldı */}
              <View style={styles.filterSection}><Text style={styles.filterSectionTitle}>Eser Tipi</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>{[{ label: 'Tablo', key: 'Tablo' }, { label: 'Heykel', key: 'Heykel' }, { label: 'Fotoğraf', key: 'Fotoğraf' }, { label: 'Baskı', key: 'Baskı' }, { label: 'Çizim', key: 'Çizim' }, { label: 'Dijital', key: 'Dijital' }, { label: 'Seramik', key: 'Seramik' }, { label: 'Enstalasyon', key: 'Enstalasyon' },].map((item) => renderFilterBox(item.label, item.key, item.label === selectedArtworkType, () => setSelectedArtworkType(item.label === selectedArtworkType ? null : item.label), item.key))}</ScrollView></View>
              <View style={styles.filterSection}><Text style={styles.filterSectionTitle}>Stil / Akım</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>{[{ label: 'Modern', key: 'Modern' }, { label: 'Soyut', key: 'SoyutStil' }, { label: 'Empresyonizm', key: 'Empresyonizm' }, { label: 'Realizm', key: 'Realizm' }, { label: 'Kübizm', key: 'Kübizm' }, { label: 'Sürrealizm', key: 'Sürrealizm' }, { label: 'Pop Art', key: 'Pop Art' }, { label: 'Minimalizm', key: 'Minimalizm' },].map((item) => renderFilterBox(item.label, item.key, item.label === selectedStyle, () => setSelectedStyle(item.label === selectedStyle ? null : item.label), item.key))}</ScrollView></View>
              <View style={styles.filterSection}><Text style={styles.filterSectionTitle}>Konu / Tema</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>{[{ label: 'Portre', key: 'Portre' }, { label: 'Manzara', key: 'Manzara' }, { label: 'Natürmort', key: 'Natürmort' }, { label: 'Soyut', key: 'SoyutTema' }, { label: 'Figüratif', key: 'Figüratif' }, { label: 'Şehir', key: 'Şehir' }, { label: 'Deniz', key: 'Deniz' },].map((item) => renderFilterBox(item.label, item.key, item.label === selectedTheme, () => setSelectedTheme(item.label === selectedTheme ? null : item.label), item.key))}</ScrollView></View>
              <View style={styles.filterSection}><Text style={styles.filterSectionTitle}>Teknik / Malzeme</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>{[{ label: 'Yağlıboya', key: 'Yağlıboya' }, { label: 'Akrilik', key: 'Akrilik' }, { label: 'Suluboya', key: 'Suluboya' }, { label: 'Karışık', key: 'Karışık' }, { label: 'Tuval', key: 'Tuval' }, { label: 'Kağıt', key: 'Kağıt' }, { label: 'Ahşap', key: 'Ahşap' }, { label: 'Metal', key: 'Metal' },].map((item) => renderFilterBox(item.label, item.key, item.label === selectedTechnique, () => setSelectedTechnique(item.label === selectedTechnique ? null : item.label), item.key))}</ScrollView></View>
              {/* Filtreler aktifse temizle butonu */}
              {/* {hasActiveFilters() && ( <TouchableOpacity style={styles.clearAllFiltersButton} onPress={clearFilters}><Ionicons name="close-circle" size={20} color="#FFFFFF" /><Text style={styles.clearAllFiltersText}>Tüm Filtreleri Temizle</Text></TouchableOpacity> )} */}
            </View>
          )}
        </ScrollView>
      )}

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

      {/* --- Filtre Modalı (Boyut inputları güncellendi, animationType="fade") --- */}
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
const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, backgroundColor: colors.background },
  backButton: { marginRight: 12, padding: 4 },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 16, height: 48 },
  searchIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: colors.text },
  clearButton: { padding: 4, marginLeft: 8 },
  filterButton: { marginLeft: 12, padding: 8, backgroundColor: colors.card, borderRadius: 12, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
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