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
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes/types';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { useThemeContext } from '../contexts/ThemeContext';
import { useFavoriteItems, FavoriteItem } from '../contexts/FavoritesContext';

const screenWidth = Dimensions.get('window').width;
const boxSize = (screenWidth - 48) / 2;

// ... categoryImages (değişmedi) ...
const categoryImages: { [key: string]: any } = {
    'Tablo': require('../assets/SearchScreenBoxBackground/tablo.png'),
    'Heykel': require('../assets/SearchScreenBoxBackground/heykel.png'),
    'Fotoğraf': require('../assets/SearchScreenBoxBackground/fotograf.png'),
    'Baskı': require('../assets/SearchScreenBoxBackground/baski.png'),
    'Çizim': require('../assets/SearchScreenBoxBackground/cizim.png'),
    'Dijital': require('../assets/SearchScreenBoxBackground/dijital.png'),
    'Seramik': require('../assets/SearchScreenBoxBackground/seramik.png'),
    'Enstalasyon': require('../assets/SearchScreenBoxBackground/enstalasyon.png'),
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

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularProducts, setPopularProducts] = useState<any[]>([]);
  const [newProducts, setNewProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filterModalVisible, setFilterModalVisible] = useState<boolean>(false);
  const [userNames, setUserNames] = useState<{ [key: string]: string }>({});

  const [selectedPriceFilter, setSelectedPriceFilter] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [selectedArtworkType, setSelectedArtworkType] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);
  const [minDimension, setMinDimension] = useState<string>('');
  const [maxDimension, setMaxDimension] = useState<string>('');

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeContext();
  const { favoriteItems, addFavorite, removeFavorite } = useFavoriteItems();

  useFocusEffect(
    useCallback(() => {
      navigation.getParent<BottomTabNavigationProp<any>>()?.setOptions({
        tabBarStyle: { display: 'none' }
      });
    }, [navigation])
  );

  const fetchAllData = async () => {
    try {
      setLoading(true);

      const [productSnap, usersSnap] = await Promise.all([
        getDocs(
            query(
              collection(db, 'products'),
              where('isSold', '==', false)
            )
        ),
        getDocs(collection(db, 'users'))
      ]);

      const userNamesMap: { [key: string]: string } = {};
      usersSnap.docs.forEach(userDoc => {
        const userData = userDoc.data();
        userNamesMap[userData.username] = userData.fullName || userData.username;
      });
      setUserNames(userNamesMap);

      const productList = productSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        viewCount: doc.data().viewCount || 0
      }));
      setProducts(productList);

      const popularList = [...productList]
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
        .slice(0, 4);
      setPopularProducts(popularList);

      const newList = [...productList]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 4);
      setNewProducts(newList);

      setRecentSearches(['Picasso', 'Soyut', 'Yağlıboya', 'Modern']);
    } catch (error) {
      console.error('Veriler alınırken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAllData();
    }, [])
  );

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const clearSearch = () => {
    setSearchQuery('');
  };

  const clearFilters = () => {
    setSelectedPriceFilter(null);
    setMinPrice('');
    setMaxPrice('');
    setSelectedArtworkType(null);
    setSelectedStyle(null);
    setSelectedTheme(null);
    setSelectedTechnique(null);
    setMinDimension('');
    setMaxDimension('');
  };

  const hasActiveFilters = () => {
    return selectedPriceFilter || selectedArtworkType || selectedStyle ||
           selectedTheme || selectedTechnique ||
           minPrice || maxPrice || minDimension || maxDimension;
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      setRecentSearches((prev: string[]) => {
        const filtered = prev.filter(s => s !== searchQuery.trim());
        const newSearches: string[] = [searchQuery.trim(), ...filtered].slice(0, 6);
        return newSearches;
      });
    }
  };

  const renderSmallBox = (label: string, selected: boolean, onPress: () => void, key?: string | number) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      style={[ styles.smallBox, selected && styles.smallBoxSelected ]} >
      <Text style={[styles.smallBoxText, selected && styles.smallBoxTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderFilterBox = (label: string, imageKey: string, selected: boolean, onPress: () => void, key?: string | number) => {
    const imageSource = categoryImages[imageKey];
    return (
      <TouchableOpacity key={key} onPress={onPress} style={[ styles.filterBox, { width: boxSize, height: boxSize } ]}>
        {imageSource ? (
          <Image source={imageSource} style={styles.categoryImage} resizeMode="cover" onError={(e) => console.log(`Görsel yüklenemedi: ${imageKey}`, e.nativeEvent.error)}/>
        ) : (
          <View style={styles.categoryImageFallback}>
             <Text style={{fontSize: 10, color: 'red'}}>Bulunamadı: {imageKey}</Text>
          </View>
        )}
        <View style={[styles.filterTextContainer, selected && styles.filterTextContainerSelected]}>
            <Text style={[styles.filterBoxText, selected && styles.filterBoxTextSelected]} numberOfLines={3}>
                {label}
            </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const handleFavoriteToggle = (item: any) => {
    const isFav = favoriteItems.some(fav => fav.id === item.id);
    const imageUrl = item.imageUrls?.[0] || item.imageUrl || undefined;

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

  // --- GÜNCELLEME: renderProductCard yapısı ve stilleri değiştirildi ---
  const renderProductCard = (item: any) => {
    const isFavorite = favoriteItems.some(fav => fav.id === item.id);
    const firstImage = item.imageUrls?.[0] || item.imageUrl;
    const displayName = userNames[item.username] || item.username || 'Bilinmeyen';

    const handlePress = () => {
      const serializableProduct = {
        ...item,
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : new Date().toISOString(),
      };
      navigation.navigate('ProductDetail', { product: serializableProduct });
    };

    return (
      <TouchableOpacity 
        key={item.id} 
        style={[styles.card, { width: boxSize, marginRight: 16 }]} // Sizing korundu
        onPress={handlePress} 
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          {firstImage ? (
            <Image 
              source={{ uri: firstImage || undefined }} 
              style={[styles.image, { height: boxSize }]} // Yükseklik korundu
              resizeMode="cover" 
            />
          ) : (
            <View style={[styles.noImage, { height: boxSize }]}>
              {/* Ionicons yerine Text kullanıldı */}
              <Text style={styles.noImageText}>Resim yok</Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.userRow}>
            <Text style={styles.username} numberOfLines={1}>{displayName}</Text>
            <TouchableOpacity onPress={() => handleFavoriteToggle(item)} style={styles.favoriteButton} >
              <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color="#333333" />
            </TouchableOpacity>
          </View>
          <Text style={styles.title} numberOfLines={2}> {item.title}{item.year ? `, ${item.year}` : ''} </Text>
          <Text style={styles.price}> ₺{item.price ? item.price.toLocaleString('tr-TR') : '0'} </Text>
        </View>
      </TouchableOpacity>
    );
  };
  // --- GÜNCELLEME SONU ---

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.searchWrapper}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#0A0A0A" />
        </TouchableOpacity>

        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#6E6E6E" style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="İsim, kategori, yıl, boyut, fiyat..."
            placeholderTextColor="#6E6E6E"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color="#6E6E6E" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="options-outline" size={24} color="#0A0A0A" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A0A0A" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          <View style={styles.filtersContainer}>
            {recentSearches.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Son Aramalar</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
                  {recentSearches.map((search) =>
                    renderSmallBox(search, false, () => setSearchQuery(search), search)
                  )}
                </ScrollView>
              </View>
            )}

             {popularProducts.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Popüler Eserler</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
                  {popularProducts.map(product => renderProductCard(product))}
                </ScrollView>
              </View>
            )}

             {newProducts.length > 0 && (
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Yeni Eklenenler</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
                  {newProducts.map(product => renderProductCard(product))}
                </ScrollView>
              </View>
            )}

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Fiyat</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
                {renderSmallBox('5.000₺ altı', selectedPriceFilter === '5000', () =>
                  setSelectedPriceFilter(selectedPriceFilter === '5000' ? null : '5000'), 'price-5000' )}
                {renderSmallBox('10.000₺ altı', selectedPriceFilter === '10000', () =>
                  setSelectedPriceFilter(selectedPriceFilter === '10000' ? null : '10000'), 'price-10000')}
                {renderSmallBox('50.000₺ altı', selectedPriceFilter === '50000', () =>
                  setSelectedPriceFilter(selectedPriceFilter === '50000' ? null : '50000'), 'price-50000')}
                {renderSmallBox('100.000₺ altı', selectedPriceFilter === '100000', () =>
                  setSelectedPriceFilter(selectedPriceFilter === '100000' ? null : '100000'), 'price-100000')}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Boyut (cm)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
                {renderSmallBox('Küçük (0-50)', minDimension === '0' && maxDimension === '50', () => { if (minDimension === '0' && maxDimension === '50') {setMinDimension(''); setMaxDimension('');} else {setMinDimension('0'); setMaxDimension('50');} }, 'size-small')}
                {renderSmallBox('Orta (50-100)', minDimension === '50' && maxDimension === '100', () => { if (minDimension === '50' && maxDimension === '100') {setMinDimension(''); setMaxDimension('');} else {setMinDimension('50'); setMaxDimension('100');} }, 'size-medium')}
                {renderSmallBox('Büyük (100-200)', minDimension === '100' && maxDimension === '200', () => { if (minDimension === '100' && maxDimension === '200') {setMinDimension(''); setMaxDimension('');} else {setMinDimension('100'); setMaxDimension('200');} }, 'size-large')}
                {renderSmallBox('Çok Büyük (200+)', minDimension === '200', () => { if (minDimension === '200') {setMinDimension(''); setMaxDimension('');} else {setMinDimension('200'); setMaxDimension('');} }, 'size-xlarge')}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Eser Tipi</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
                {[ { label: 'Tablo', key: 'Tablo' }, { label: 'Heykel', key: 'Heykel' }, { label: 'Fotoğraf', key: 'Fotoğraf' }, { label: 'Baskı', key: 'Baskı' }, { label: 'Çizim', key: 'Çizim' }, { label: 'Dijital', key: 'Dijital' }, { label: 'Seramik', key: 'Seramik' }, { label: 'Enstalasyon', key: 'Enstalasyon' }, ].map((item) => renderFilterBox(item.label, item.key, item.label === selectedArtworkType, () => setSelectedArtworkType(item.label === selectedArtworkType ? null : item.label), item.key ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Stil / Akım</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
                {[ { label: 'Modern', key: 'Modern' }, { label: 'Soyut', key: 'SoyutStil' }, { label: 'Empresyonizm', key: 'Empresyonizm' }, { label: 'Realizm', key: 'Realizm' }, { label: 'Kübizm', key: 'Kübizm' }, { label: 'Sürrealizm', key: 'Sürrealizm' }, { label: 'Pop Art', key: 'Pop Art' }, { label: 'Minimalizm', key: 'Minimalizm' }, ].map((item) => renderFilterBox( item.label, item.key, item.label === selectedStyle, () => setSelectedStyle(item.label === selectedStyle ? null : item.label), item.key ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Konu / Tema</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
                {[ { label: 'Portre', key: 'Portre' }, { label: 'Manzara', key: 'Manzara' }, { label: 'Natürmort', key: 'Natürmort' }, { label: 'Soyut', key: 'SoyutTema' }, { label: 'Figüratif', key: 'Figüratif' }, { label: 'Şehir', key: 'Şehir' }, { label: 'Deniz', key: 'Deniz' }, ].map((item) => renderFilterBox(item.label, item.key, item.label === selectedTheme, () => setSelectedTheme(item.label === selectedTheme ? null : item.label), item.key ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Teknik / Malzeme</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
                {[ { label: 'Yağlıboya', key: 'Yağlıboya' }, { label: 'Akrilik', key: 'Akrilik' }, { label: 'Suluboya', key: 'Suluboya' }, { label: 'Karışık', key: 'Karışık' }, { label: 'Tuval', key: 'Tuval' }, { label: 'Kağıt', key: 'Kağıt' }, { label: 'Ahşap', key: 'Ahşap' }, { label: 'Metal', key: 'Metal' }, ].map((item) => renderFilterBox(item.label, item.key, item.label === selectedTechnique, () => setSelectedTechnique(item.label === selectedTechnique ? null : item.label), item.key ))}
              </ScrollView>
            </View>

            {hasActiveFilters() && (
              <TouchableOpacity style={styles.clearAllFiltersButton} onPress={clearFilters}>
                <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                <Text style={styles.clearAllFiltersText}>Tüm Filtreleri Temizle</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}

      {/* ... Modal (değişmedi) ... */}
      <Modal visible={filterModalVisible} animationType="slide" transparent={true} onRequestClose={() => setFilterModalVisible(false)} >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detaylı Filtreler</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close" size={28} color="#0A0A0A" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.inputSection}>
                <Text style={styles.filterSectionTitle}>Özel Fiyat Aralığı</Text>
                <View style={styles.priceInputRow}>
                  <TextInput style={styles.priceInput} placeholder="Min ₺" placeholderTextColor="#6E6E6E" keyboardType="numeric" value={minPrice} onChangeText={setMinPrice}/>
                  <Text style={styles.priceSeparator}>-</Text>
                  <TextInput style={styles.priceInput} placeholder="Max ₺" placeholderTextColor="#6E6E6E" keyboardType="numeric" value={maxPrice} onChangeText={setMaxPrice}/>
                </View>
              </View>
              <View style={styles.inputSection}>
                <Text style={styles.filterSectionTitle}>Özel Boyut Aralığı (cm)</Text>
                <View style={styles.priceInputRow}>
                  <TextInput style={styles.priceInput} placeholder="Min" placeholderTextColor="#6E6E6E" keyboardType="numeric" value={minDimension} onChangeText={setMinDimension}/>
                  <Text style={styles.priceSeparator}>-</Text>
                  <TextInput style={styles.priceInput} placeholder="Max" placeholderTextColor="#6E6E6E" keyboardType="numeric" value={maxDimension} onChangeText={setMaxDimension}/>
                </View>
              </View>
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

// --- GÜNCELLEME: Kart stilleri değiştirildi ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, backgroundColor: '#FFFFFF' },
  backButton: { marginRight: 12, padding: 4 },
  searchInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F4F4', borderRadius: 12, paddingHorizontal: 16, height: 48 },
  searchIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#0A0A0A' },
  clearButton: { padding: 4, marginLeft: 8 },
  filterButton: { marginLeft: 12, padding: 8, backgroundColor: '#F4F4F4', borderRadius: 12, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1, backgroundColor: '#FFFFFF' },
  filtersContainer: { backgroundColor: '#FFFFFF', paddingVertical: 16 },
  filterSection: { marginBottom: 32 },
  filterSectionTitle: { fontSize: 18, fontWeight: '700', color: '#0A0A0A', marginBottom: 16, paddingHorizontal: 16 },
  filterScrollView: { paddingLeft: 16 },
  smallBox: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F4F4F4', marginRight: 12, borderWidth: 1, borderColor: '#F4F4F4' },
  smallBoxSelected: { backgroundColor: '#0A0A0A', borderColor: '#0A0A0A' },
  smallBoxText: { fontSize: 14, fontWeight: '600', color: '#0A0A0A' },
  smallBoxTextSelected: { color: '#FFFFFF' },
  filterBox: { borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3, marginRight: 16, position: 'relative', backgroundColor: '#F4F4F4', justifyContent: 'center', alignItems: 'center' },
  categoryImage: { width: '100%', height: '100%', position: 'absolute' },
  categoryImageFallback: { width: '100%', height: '100%', position: 'absolute', backgroundColor: '#EEEEEE', justifyContent: 'center', alignItems: 'center' },
  filterTextContainer: { backgroundColor: 'rgba(255, 255, 255, 0.9)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, maxWidth: '90%' },
  filterTextContainerSelected: { backgroundColor: 'rgba(10, 10, 10, 0.9)' },
  filterBoxText: { fontSize: 14, color: '#0A0A0A', fontWeight: '700', textAlign: 'center' },
  filterBoxTextSelected: { color: '#FFFFFF' },

  // --- KART STİLLERİ (HomeScreen/ProductDetailScreen'den) ---
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F4F4F4', // Hedef stil
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    // width ve marginRight JSX içinde uygulanıyor
  },
  imageContainer: {
    padding: 10, // Hedef stil
    height: 'auto',
  },
  image: {
    width: '100%',
    resizeMode: 'cover', // Hedef stil
    borderRadius: 8, // Hedef stil
  },
  noImage: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8E8E8', // Hedef stil
    borderRadius: 8,
  },
  noImageText: { // Yeni stil
    color: '#6E6E6E',
  },
  infoContainer: {
    padding: 12,
    paddingTop: 0, // Hedef stil
    backgroundColor: '#F4F4F4', // Hedef stil
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6, // Hedef stil
  },
  username: {
    fontSize: 13, // Hedef stil
    color: '#0A0A0A', // Hedef stil
    flex: 1,
  },
  favoriteButton: {
    padding: 2, // Hedef stil
  },
  title: {
    fontSize: 15, // Hedef stil
    color: '#6E6E6E', // Hedef stil
    marginBottom: 8, // Hedef stil
    lineHeight: 20, // Hedef stil
  },
  price: {
    fontSize: 17, // Hedef stil
    fontWeight: 'bold', // Hedef stil
    color: '#0A0A0A', // Hedef stil
  },
  // --- KART STİLLERİ SONU ---

  clearAllFiltersButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0A', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12, marginHorizontal: 16, marginTop: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  clearAllFiltersText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginLeft: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  
  // --- Modal Stilleri (değişmedi) ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '50%', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F4F4F4' },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#0A0A0A' },
  modalContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  inputSection: { marginBottom: 24 },
  priceInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceInput: { flex: 1, height: 48, backgroundColor: '#F4F4F4', borderRadius: 12, paddingHorizontal: 16, fontSize: 16, color: '#0A0A0A' },
  priceSeparator: { fontSize: 18, color: '#6E6E6E', fontWeight: '600' },
  modalFooter: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F4F4F4', gap: 12, backgroundColor: '#FFFFFF' },
  clearFiltersButtonModal: { flex: 1, height: 50, borderRadius: 12, backgroundColor: '#F4F4F4', alignItems: 'center', justifyContent: 'center' },
  clearFiltersTextModal: { fontSize: 16, fontWeight: '600', color: '#0A0A0A' },
  applyFiltersButton: { flex: 1, height: 50, borderRadius: 12, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },
  applyFiltersText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});