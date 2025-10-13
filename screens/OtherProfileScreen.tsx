import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation, NavigationProp, RouteProp } from '@react-navigation/native';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { ThemeContext } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import ImageViewer from 'react-native-image-zoom-viewer';
import { RootStackParamList } from '../routes/types';
import { useFavoriteItems, FavoriteItem } from '../contexts/FavoritesContext';

type OtherProfileRouteProp = RouteProp<RootStackParamList, 'OtherProfile'>;

const screenWidth = Dimensions.get('window').width;
const columnWidth = (screenWidth - 70) / 2;

const OtherProfileScreen = () => {
  const { colors } = useContext(ThemeContext);
  const route = useRoute<OtherProfileRouteProp>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userId } = route.params;
  const currentUser = auth.currentUser!;
  const { favoriteItems, addFavorite, removeFavorite } = useFavoriteItems();

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'Artworks' | 'About'>('Artworks');
  const [imageHeights, setImageHeights] = useState<{ [key: string]: number }>({});
  const [modalVisible, setModalVisible] = useState(false);

  // HEADER’I HER ZAMAN GİZLE
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    try {
      const userSnap = await getDoc(doc(db, 'users', userId));
      if (userSnap.exists()) setUserData(userSnap.data());

      const followersSnap = await getDocs(collection(db, 'users', userId, 'followers'));
      setFollowersCount(followersSnap.size);

      const followingSnap = await getDocs(collection(db, 'users', userId, 'following'));
      setFollowingCount(followingSnap.size);

      const followingDoc = await getDoc(doc(db, 'users', userId, 'followers', currentUser.uid));
      setIsFollowing(followingDoc.exists());

      const productsSnap = await getDocs(query(collection(db, 'products'), where('ownerId', '==', userId)));
      setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser.uid]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const toggleFollow = async () => {
    try {
      const followerRef = doc(db, 'users', userId, 'followers', currentUser.uid);
      const followingRef = doc(db, 'users', currentUser.uid, 'following', userId);

      if (isFollowing) {
        await deleteDoc(followerRef);
        await deleteDoc(followingRef);
        setFollowersCount(prev => prev - 1);
      } else {
        await setDoc(followerRef, { followedAt: new Date() });
        await setDoc(followingRef, { followedAt: new Date() });
        setFollowersCount(prev => prev + 1);
      }
      setIsFollowing(!isFollowing);
    } catch (e) {
      console.error(e);
    }
  };

  const goToProductDetail = (product: any) => {
    navigation.navigate('ProductDetail', { product });
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

    products.forEach(product => {
      const imageHeight = imageHeights[product.id] || 250;
      const cardHeight = imageHeight + 130;
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
        <TouchableOpacity onPress={() => goToProductDetail(item)} activeOpacity={0.7}>
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
                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color="#333" />
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

  if (loading)
    return <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.primary} />;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={28} color="#000" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: colors.card || '#fff', marginTop: 60 }]}>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              {userData?.photoURL ? (
                <Image source={{ uri: userData.photoURL }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.border }]} />
              )}
            </TouchableOpacity>

            <View style={styles.profileInfo}>
              <Text style={[styles.usernameText, { color: colors.text }]}>@{userData?.username || 'Kullanıcı'}</Text>
              <Text style={[styles.fullNameText, { color: colors.text }]}>{userData?.fullName || 'Ad Soyad'}</Text>

              <View style={styles.followRow}>
                <TouchableOpacity onPress={toggleFollow} style={[styles.followButtonCard, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.followButtonText}>
                    {isFollowing ? `Following: ${followersCount}` : `Follow: ${followersCount}`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('Chat', {
                      currentUserId: currentUser.uid,
                      otherUserId: userId,
                    })
                  }
                  style={[styles.followButtonCard, { flex: 1 }]}
                >
                  <Text style={styles.followButtonText}>Message</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              onPress={() => setActiveTab('Artworks')}
              style={[styles.tabButton, activeTab === 'Artworks' && styles.activeTab]}
            >
              <Ionicons name="albums-outline" size={18} color={activeTab === 'Artworks' ? '#333' : '#888'} />
              <Text style={[styles.tabText, activeTab === 'Artworks' && styles.activeTabText]}> Artworks</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('About')}
              style={[styles.tabButton, activeTab === 'About' && styles.activeTab]}
            >
              <Ionicons name="information-circle-outline" size={18} color={activeTab === 'About' ? '#333' : '#888'} />
              <Text style={[styles.tabText, activeTab === 'About' && styles.activeTabText]}> About</Text>
            </TouchableOpacity>
          </View>

          {/* Tab İçeriği */}
          {activeTab === 'Artworks' ? (
            products.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.text }]}>Henüz ürün eklememiş.</Text>
            ) : (
              <View style={styles.masonryContainer}>
                <View style={styles.column}>{leftColumn.map(renderProductCard)}</View>
                <View style={styles.column}>{rightColumn.map(renderProductCard)}</View>
              </View>
            )
          ) : (
            <View style={{ padding: 16 }}>
              <Text style={{ color: colors.text }}>{userData?.about || 'No information provided.'}</Text>
            </View>
          )}

          {/* Profil Fotoğrafı Modal */}
          <Modal visible={modalVisible} transparent>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
              <ImageViewer
                imageUrls={[{ url: userData?.photoURL || '' }]}
                onCancel={() => setModalVisible(false)}
                enableSwipeDown
                renderIndicator={() => <View />}
                backgroundColor="#fff"
              />
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>
          </Modal>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default OtherProfileScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  backButton: { position: 'absolute', top: 50, left: 16, zIndex: 10 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 24 },
  profileCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
  },
  avatar: { width: 120, height: 120, borderRadius: 12 },
  profileInfo: { flex: 1, marginLeft: 16 },
  usernameText: { fontSize: 18, fontWeight: 'bold' },
  fullNameText: { fontSize: 14, marginBottom: 8, color: '#6E6E6E' },
  followRow: { flexDirection: 'row', marginBottom: 8 },
  followButtonCard: {
    backgroundColor: '#333',
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  tabRow: { flexDirection: 'row', marginBottom: 12, borderBottomWidth: 1, borderColor: '#ccc' },
  tabButton: { flexDirection: 'row', flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  tabText: { color: '#888', fontWeight: 'bold', marginLeft: 4 },
  activeTab: { borderBottomWidth: 2, borderColor: '#333' },
  activeTabText: { color: '#333' },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 15 },
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
  closeButton: { position: 'absolute', top: 40, right: 20, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: 4, elevation: 5 },
});
