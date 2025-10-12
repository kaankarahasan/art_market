import React, { useState, useCallback } from 'react';
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
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes/types';
import { useFavorites } from '../contexts/FavoritesContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { useThemeContext } from '../contexts/ThemeContext';

const screenWidth = Dimensions.get('window').width;
const columnWidth = (screenWidth - 45) / 2;

const HomeScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [imageHeights, setImageHeights] = useState<{ [key: string]: number }>({});

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { favorites, addToFavorites, removeFromFavorites } = useFavorites();
  const insets = useSafeAreaInsets();
  const { colors } = useThemeContext();

  const fetchData = async () => {
    try {
      const productSnap = await getDocs(
        query(collection(db, 'products'), where('isSold', '==', false), limit(50))
      );
      const productList = productSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(shuffleArray(productList));

      const userSnap = await getDocs(collection(db, 'users'));
      const userList = userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userList);

      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) setCurrentUserProfile(userDoc.data());
      }
    } catch (error) {
      console.error('Veriler alınırken hata:', error);
    }
  };

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

  const searchDimensions = parseDimensions(searchQuery.toLowerCase().trim());

  const filteredProducts = products.filter(product => {
    if (searchDimensions) {
      return matchesDimensions(product, searchDimensions);
    }

    const search = searchQuery.toLowerCase();
    const titleMatch = product.title?.toLowerCase().includes(search);
    const descriptionMatch = product.description?.toLowerCase().includes(search);
    const categoryMatch = product.category?.toLowerCase().includes(search);

    return titleMatch || descriptionMatch || categoryMatch;
  });

  const filteredUsers = users.filter(user => {
    const queryLower = searchQuery.toLowerCase();
    const usernameMatch = user.username?.toLowerCase().includes(queryLower);
    const fullNameMatch = user.fullName?.toLowerCase().includes(queryLower);
    return usernameMatch || fullNameMatch;
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

    filteredProducts.forEach((product) => {
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

  const handleFavoriteToggle = (e: any, item: any, isFavorite: boolean) => {
    e.stopPropagation();
    isFavorite ? removeFromFavorites(item.id) : addToFavorites(item);
  };

  const renderProductCard = (item: any) => {
    const isFavorite = favorites.some(fav => fav.id === item.id);
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
                onPress={(e) => handleFavoriteToggle(e, item, isFavorite)}
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
        navigation.navigate('Profile' as never);
      } else {
        navigation.navigate('OtherProfile', { userId: item.id });
      }
    };

    return (
      <TouchableOpacity key={item.id} onPress={handlePress} style={styles.userCard}>
        <Image
          source={item.profilePicture ? { uri: item.profilePicture } : require('../assets/default-avatar.png')}
          style={styles.userAvatar}
        />
        <View>
          <Text style={styles.usernameText}>{item.username}</Text>
          <Text style={styles.fullName}>{item.fullName}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Ara..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile' as never)}
        >
          <Image
            source={
              currentUserProfile?.profilePicture
                ? { uri: currentUserProfile.profilePicture }
                : require('../assets/default-avatar.png')
            }
            style={styles.profileImage}
          />
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
        >
          {searchQuery.length > 0 && filteredUsers.length > 0 && (
            <View style={styles.userListContainer}>
              <Text style={styles.sectionTitle}>Kullanıcılar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {filteredUsers.map(renderUser)}
              </ScrollView>
            </View>
          )}

          {filteredProducts.length === 0 && searchQuery.length > 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aradığınız ürün bulunamadı.</Text>
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

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#F4F4F4',
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
  masonryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingBottom: 30,
  },
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
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  username: { fontSize: 13, color: '#0A0A0A', flex: 1 },
  favoriteButton: { padding: 2 },
  title: { fontSize: 15, color: '#6E6E6E', marginBottom: 8, lineHeight: 20 },
  price: { fontSize: 17, fontWeight: 'bold', color: '#0A0A0A' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 50 },
  emptyText: { color: '#6E6E6E' },
  userListContainer: {
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: '#F4F4F4',
    paddingVertical: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  userAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  usernameText: { fontSize: 14, fontWeight: 'bold', color: '#0A0A0A' },
  fullName: { fontSize: 12, color: '#6E6E6E' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0A0A0A',
    marginBottom: 8,
    paddingHorizontal: 10,
  },
});
