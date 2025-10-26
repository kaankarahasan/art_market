import React, { useState, useCallback, useEffect } from 'react'; // useEffect eklendi
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
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes/types';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { useThemeContext } from '../contexts/ThemeContext';
import { useFavoriteItems, FavoriteItem } from '../contexts/FavoritesContext';

const screenWidth = Dimensions.get('window').width;
const columnWidth = (screenWidth - 45) / 2;

const HomeScreen = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageHeights, setImageHeights] = useState<{ [key: string]: number }>({});
  const [userNames, setUserNames] = useState<{ [key: string]: string }>({});

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeContext();
  const { favoriteItems, addFavorite, removeFavorite } = useFavoriteItems();

  // Dinamik tab bar yüksekliği
  const tabBarHeight = 60 + insets.bottom;

  // HomeScreen her görüntülendiğinde Tab Bar'ı doğru stile getirir.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        tabBarStyle: {
            display: 'flex',
            position: 'absolute',
            backgroundColor: '#FFFFFF',
            borderTopWidth: 1,
            borderTopColor: '#F0F0F0',
            height: tabBarHeight,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
            paddingTop: 8,
           }
      });
    }, [navigation, insets.bottom, tabBarHeight])
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
      usersSnap.docs.forEach(userDoc => {
        const userData = userDoc.data();
        userNamesMap[userData.username] = userData.fullName || userData.username;
      });
      setUserNames(userNamesMap);

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
  // --- GÜNCELLEME Sonu ---


  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.searchWrapper}>
        <TouchableOpacity
          style={styles.searchContainer}
          onPress={() => navigation.navigate('Search')}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>Ara...</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A0A0A" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#0A0A0A"
              colors={['#0A0A0A']}
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
    </View>
  );
};

export default HomeScreen;

// --- GÜNCELLEME: Stiller Orijinal Haline Döndürüldü ---
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
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, // Orijinal opaklık
    shadowRadius: 6,
    elevation: 5, // Orijinal elevation
    // Orijinalde border yoktu
  },
  searchIcon: { marginRight: 10 },
  searchPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  masonryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    // Orijinalde paddingBottom: 30 vardı, ancak ScrollView'a taşındı
  },
  column: {
    flex: 1,
    paddingHorizontal: 5,
  },
  card: { // Orijinal card stili
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#F4F4F4', // Orijinal arka plan
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    // Orijinalde border yoktu
  },
  imageContainer: { // Orijinal imageContainer stili
    padding: 10
  },
  image: { // Orijinal image stili
    width: '100%',
    resizeMode: 'contain', // Orijinal resizeMode
    borderRadius: 8 // Orijinal border radius
  },
  noImage: { // Orijinal noImage stili
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8E8E8'
  },
  noImageText: { // Orijinal noImageText stili
    color: '#6E6E6E'
  },
  infoContainer: { // Orijinal infoContainer stili
    padding: 12,
    paddingTop: 0, // Orijinalde paddingTop vardı
    backgroundColor: '#F4F4F4' // Orijinal arka plan
  },
  userRow: { // Orijinal userRow stili
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  username: { // Orijinal username stili
    fontSize: 13,
    color: '#0A0A0A', // Orijinal renk
    flex: 1
    // Orijinalde marginRight yoktu
  },
  favoriteButton: { // Orijinal favoriteButton stili
    padding: 2
    // Orijinalde marginLeft yoktu
   },
  title: { // Orijinal title stili
    fontSize: 15,
    color: '#6E6E6E', // Orijinal renk
    marginBottom: 8,
    lineHeight: 20 // Orijinal lineHeight
    // Orijinalde fontWeight yoktu
  },
  price: { // Orijinal price stili
    fontSize: 17, // Orijinal boyut
    fontWeight: 'bold', // Orijinal kalınlık
    color: '#0A0A0A'
  },
  loadingContainer: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     backgroundColor: '#FFFFFF'
    },
});
// --- GÜNCELLEME Sonu ---