import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes/types';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useThemeContext } from '../contexts/ThemeContext';
import { useFavoriteItems, FavoriteItem } from '../contexts/FavoritesContext';

const screenWidth = Dimensions.get('window').width;
const columnWidth = (screenWidth - 45) / 2;

const SearchScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageHeights, setImageHeights] = useState<{ [key: string]: number }>({});
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeContext();
  const { favoriteItems, addFavorite, removeFavorite } = useFavoriteItems();

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Ürünleri getir
      const productSnap = await getDocs(
        query(
          collection(db, 'products'),
          where('isSold', '==', false)
        )
      );
      const productList = productSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      setProducts(productList);

      // Kullanıcıları getir
      const userSnap = await getDocs(collection(db, 'users'));
      const userList = userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userList);

      // Mevcut kullanıcının profilini getir
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) setCurrentUserProfile(userDoc.data());
      }
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

  // Otomatik focus için
  const inputRef = React.useRef<TextInput>(null);
  
  useEffect(() => {
    // Ekran yüklendiğinde keyboard'u aç
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const parseDimensions = (text: string) => {
    const patterns = [
      /(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/,
      /(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          height: parseFloat(match[1]),
          width: parseFloat(match[2]),
          depth: match[3] ? parseFloat(match[3]) : null,
        };
      }
    }
    return null;
  };

  const matchesDimensions = (product: any, searchDimensions: any) => {
    if (!product.dimensions) return false;
    const { height, width, depth } = product.dimensions;
    const tolerance = 5;
    const heightMatch = searchDimensions.height
      ? height && Math.abs(height - searchDimensions.height) <= tolerance
      : true;
    const widthMatch = searchDimensions.width
      ? width && Math.abs(width - searchDimensions.width) <= tolerance
      : true;
    const depthMatch = searchDimensions.depth
      ? depth && Math.abs(depth - searchDimensions.depth) <= tolerance
      : true;
    return heightMatch && widthMatch && depthMatch;
  };

  const parsePrice = (text: string) => {
    const priceMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:tl|₺|lira)?/i);
    return priceMatch ? parseFloat(priceMatch[1]) : null;
  };

  const parseYear = (text: string) => {
    const yearMatch = text.match(/\b(19\d{2}|20\d{2})\b/);
    return yearMatch ? parseInt(yearMatch[1]) : null;
  };

  const searchDimensions = parseDimensions(searchQuery.toLowerCase().trim());
  const searchPrice = parsePrice(searchQuery.toLowerCase().trim());
  const searchYear = parseYear(searchQuery.trim());

  const filteredProducts = products.filter(product => {
    if (!searchQuery.trim()) return false;

    // Boyut araması
    if (searchDimensions && matchesDimensions(product, searchDimensions)) {
      return true;
    }

    // Fiyat araması
    if (searchPrice && product.price) {
      const tolerance = product.price * 0.1; // %10 tolerans
      if (Math.abs(product.price - searchPrice) <= tolerance) {
        return true;
      }
    }

    // Yıl araması
    if (searchYear && product.year === searchYear) {
      return true;
    }

    const search = searchQuery.toLowerCase();
    
    // Metin tabanlı aramalar
    const titleMatch = product.title?.toLowerCase().includes(search);
    const descriptionMatch = product.description?.toLowerCase().includes(search);
    const categoryMatch = product.category?.toLowerCase().includes(search);
    const usernameMatch = product.username?.toLowerCase().includes(search);
    const yearMatch = product.year?.toString().includes(search);
    
    // Sanatçı araması (artist field varsa)
    const artistMatch = product.artist?.toLowerCase().includes(search);
    
    return titleMatch || descriptionMatch || categoryMatch || usernameMatch || yearMatch || artistMatch;
  });

  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return false;
    
    const queryLower = searchQuery.toLowerCase();
    const usernameMatch = user.username?.toLowerCase().includes(queryLower);
    const fullNameMatch = user.fullName?.toLowerCase().includes(queryLower);
    return usernameMatch || fullNameMatch;
  });

  // Tarihe göre sırala (en yeni önce)
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const dateA = a.createdAt instanceof Date ? a.createdAt : new Date();
    const dateB = b.createdAt instanceof Date ? b.createdAt : new Date();
    return dateB.getTime() - dateA.getTime();
  });

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleImageLoad = (productId: string, width: number, height: number) => {
    const imageWidth = columnWidth - 20;
    const aspectRatio = height / width;
    const calculatedHeight = imageWidth * aspectRatio;
    setImageHeights(prev => ({ ...prev, [productId]: calculatedHeight }));
  };

  const distributeProducts = () => {
    const leftColumn: any[] = [];
    const rightColumn: any[] = [];
    let leftHeight = 0;
    let rightHeight = 0;
    sortedProducts.forEach((product) => {
      const imageHeight = imageHeights[product.id] || 250;
      const cardHeight = imageHeight + 110;
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
    const favItem: FavoriteItem = {
      id: item.id,
      title: item.title,
      username: item.username,
      imageUrl: item.imageUrls?.[0] || item.imageUrl,
      price: item.price,
      year: item.year,
    };
    isFav ? removeFavorite(item.id) : addFavorite(favItem);
  };

  const renderProductCard = (item: any) => {
    const isFavorite = favoriteItems.some(fav => fav.id === item.id);
    const imageHeight = imageHeights[item.id] || 250;
    const firstImage = item.imageUrls?.[0] || item.imageUrl;

    return (
      <View key={item.id} style={[styles.card, { width: columnWidth }]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ProductDetail', { product: item })}
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
                <Text style={styles.noImageText}>Resim yok</Text>
              </View>
            )}
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.userRow}>
              <Text style={styles.username} numberOfLines={1}>
                {item.username || 'Bilinmeyen'}
              </Text>
              <TouchableOpacity
                onPress={() => handleFavoriteToggle(item)}
                style={styles.favoriteButton}
              >
                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color="#333333" />
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

  const renderUser = (item: any) => {
    const currentUser = auth.currentUser;
    const handlePress = () => {
      if (!currentUser) return;
      if (item.id === currentUser.uid) {
        navigation.navigate('Profile', {});
      } else {
        navigation.navigate('OtherProfile', { userId: item.id });
      }
    };

    // Profil fotoğrafını belirle
    const profileImage = item.profilePicture 
      ? { uri: item.profilePicture } 
      : item.photoURL 
      ? { uri: item.photoURL }
      : require('../assets/default-avatar.png');

    return (
      <TouchableOpacity key={item.id} onPress={handlePress} style={styles.userCard}>
        <Image
          source={profileImage}
          style={styles.userAvatar}
        />
        <View>
          <Text style={styles.usernameText}>{item.username}</Text>
          <Text style={styles.fullName}>{item.fullName}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const getProfileImageSource = () => {
    if (currentUserProfile?.profilePicture)
      return { uri: currentUserProfile.profilePicture };
    if (currentUserProfile?.photoURL)
      return { uri: currentUserProfile.photoURL };
    return require('../assets/default-avatar.png');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.searchWrapper}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#0A0A0A" />
        </TouchableOpacity>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="İsim, kategori, yıl, boyut, fiyat..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile', {})}
        >
          <Image source={getProfileImageSource()} style={styles.profileImage} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A0A0A" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {searchQuery.length > 0 && filteredUsers.length > 0 && (
            <View style={styles.userListContainer}>
              <Text style={styles.sectionTitle}>Kullanıcılar ({filteredUsers.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {filteredUsers.map(renderUser)}
              </ScrollView>
            </View>
          )}

          {searchQuery.length > 0 && sortedProducts.length > 0 && (
            <View style={styles.productsHeader}>
              <Text style={styles.sectionTitle}>Ürünler ({sortedProducts.length})</Text>
            </View>
          )}

          {searchQuery.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={64} color="#E0E0E0" />
              <Text style={styles.emptyText}>Arama yapmak için yazın</Text>
              <Text style={styles.emptySubtext}>
                İsim, kategori, yıl, boyut veya fiyat araması yapabilirsiniz
              </Text>
            </View>
          ) : sortedProducts.length === 0 && filteredUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="sad-outline" size={64} color="#E0E0E0" />
              <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
              <Text style={styles.emptySubtext}>
                Farklı kelimeler veya filtreler deneyin
              </Text>
            </View>
          ) : (
            <View style={styles.masonryContainer}>
              <View style={styles.column}>
                {leftColumn.map(renderProductCard)}
              </View>
              <View style={styles.column}>
                {rightColumn.map(renderProductCard)}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#0A0A0A' },
  clearButton: { padding: 4, marginLeft: 8 },
  profileButton: {
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#F4F4F4',
  },
  masonryContainer: { flexDirection: 'row', paddingHorizontal: 10, paddingBottom: 30 },
  column: { flex: 1, paddingHorizontal: 5 },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#F4F4F4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  imageContainer: { padding: 10 },
  image: { width: '100%', resizeMode: 'contain', borderRadius: 8 },
  noImage: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8E8E8' },
  noImageText: { color: '#6E6E6E' },
  infoContainer: { padding: 12, paddingTop: 0, backgroundColor: '#F4F4F4' },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  username: { fontSize: 13, color: '#0A0A0A', flex: 1 },
  favoriteButton: { padding: 2 },
  title: { fontSize: 15, color: '#6E6E6E', marginBottom: 8, lineHeight: 20 },
  price: { fontSize: 17, fontWeight: 'bold', color: '#0A0A0A' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, paddingHorizontal: 40 },
  emptyText: { color: '#6E6E6E', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtext: { color: '#999', fontSize: 14, marginTop: 8, textAlign: 'center' },
  userListContainer: { 
    paddingHorizontal: 10, 
    marginBottom: 15, 
    backgroundColor: '#F4F4F4', 
    paddingVertical: 12 
  },
  userCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 10, 
    marginRight: 10, 
    borderRadius: 8, 
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userAvatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  usernameText: { fontSize: 14, fontWeight: 'bold', color: '#0A0A0A' },
  fullName: { fontSize: 12, color: '#6E6E6E' },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#0A0A0A', 
    marginBottom: 8, 
    paddingHorizontal: 10 
  },
  productsHeader: {
    paddingHorizontal: 10,
    marginBottom: 8,
  },
});