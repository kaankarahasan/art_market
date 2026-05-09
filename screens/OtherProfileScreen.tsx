import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation, NavigationProp, RouteProp } from '@react-navigation/native';
import { doc, getDoc, collection, getDocs, query, where, deleteDoc, setDoc } from '@react-native-firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useThemeContext } from '../contexts/ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ImageViewer from 'react-native-image-zoom-viewer';
import { RootStackParamList } from '../routes/types';
import { useFavoriteItems, FavoriteItem } from '../contexts/FavoritesContext';
import { useLanguage } from '../contexts/LanguageContext';

type OtherProfileRouteProp = RouteProp<RootStackParamList, 'OtherProfile'>;

const screenWidth = Dimensions.get('window').width;
const columnWidth = (screenWidth - 70) / 2;
const imageInnerWidth = columnWidth - 20;

const OtherProfileScreen = () => {
  const { colors, isDarkTheme } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
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

      const q = query(collection(db, 'products'), where('ownerId', '==', userId));
      const productsSnap = await getDocs(q);

      const fetchedProducts = productsSnap.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data() as any).createdAt?.toDate ? (doc.data() as any).createdAt.toDate() : new Date()
      }));

      fetchedProducts.sort((a: any, b: any) => {
        if (a.isSold === b.isSold) {
          const aTime = a.createdAt?.getTime ? a.createdAt.getTime() : 0;
          const bTime = b.createdAt?.getTime ? b.createdAt.getTime() : 0;
          return bTime - aTime;
        }
        return a.isSold ? 1 : -1;
      });

      setProducts(fetchedProducts);
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

  const handleImageLoad = (productId: string, width: number, height: number) => {
    if (width > 0) {
      const aspectRatio = height / width;
      const calculatedHeight = imageInnerWidth * aspectRatio;
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

    products.forEach(product => {
      const imageHeight = imageHeights[product.id] || 250;
      const infoHeightEstimate = 12 + 15 + 6 + 20 + 8 + 20 + 12;
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
    const imageUrl = item.imageUrls?.[0] || item.imageUrl || undefined;

    const favItem: FavoriteItem = {
      id: item.id,
      title: item.title,
      username: item.username,
      imageUrl: imageUrl,
      price: item.price,
      year: item.year,
      createdAt: item.createdAt,
    };
    isFav ? removeFavorite(item.id) : addFavorite(favItem);
  };

  const renderProductCard = (item: any) => {
    const isFavorite = favoriteItems.some(fav => fav.id === item.id);
    const imageHeight = imageHeights[item.id] || 250;
    const firstImage = item.imageUrls?.[0] || item.imageUrl;

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
        <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
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
                <Text style={styles.noImageText}>{t('noImageText')}</Text>
              </View>
            )}

            {isProductNew && !item.isSold && (
              <View style={styles.newBadgeContainer}>
                <View style={styles.newBadgeBackground}>
                  <Text style={styles.newBadgeText}>{t('newBadge')}</Text>
                </View>
              </View>
            )}

            {item.isSold && (
              <View style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 14,
                height: 14,
                borderRadius: 7,
                backgroundColor: '#FF3B30',
                borderWidth: 2,
                borderColor: colors.card,
              }} />
            )}
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.userRow}>
              <Text style={styles.username} numberOfLines={1}>
                {userData?.fullName || userData?.username || t('unknown')}
              </Text>
              <TouchableOpacity
                onPress={() => handleFavoriteToggle(item)}
                style={styles.favoriteButton}
              >
                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? '#FF3040' : colors.text} />
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

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerUsername}>@{userData?.username || t('unknown')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.profileCard, { backgroundColor: colors.card, marginTop: 10 }]}>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              {userData?.photoURL ? (
                <Image source={{ uri: userData.photoURL }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.card }]} />
              )}
            </TouchableOpacity>

            <View style={styles.profileInfo}>
              <Text style={styles.fullNameText}>{userData?.fullName || t('unknown')}</Text>

              <View style={styles.followRow}>
                <TouchableOpacity onPress={toggleFollow} style={[styles.followButtonCard, { flex: 1, marginRight: 12 }]}>
                  <Text style={styles.followButtonText}>
                    {isFollowing ? `${t('following')}: ${followersCount}` : `${t('follow')}: ${followersCount}`}
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
                  <Text style={styles.followButtonText}>{t('message')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.tabRow}>
            <TouchableOpacity
              onPress={() => setActiveTab('Artworks')}
              style={[styles.tabButton, activeTab === 'Artworks' && styles.activeTab]}
            >
              <Ionicons name="albums-outline" size={18} color={activeTab === 'Artworks' ? colors.text : colors.secondaryText} />
              <Text style={[styles.tabText, activeTab === 'Artworks' && styles.activeTabText]}> {t('artworks')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('About')}
              style={[styles.tabButton, activeTab === 'About' && styles.activeTab]}
            >
              <Ionicons name="information-circle-outline" size={18} color={activeTab === 'About' ? colors.text : colors.secondaryText} />
              <Text style={[styles.tabText, activeTab === 'About' && styles.activeTabText]}> {t('aboutTab')}</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'Artworks' ? (
            products.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.text }]}>{t('noProducts')}</Text>
            ) : (
              <View style={styles.masonryContainer}>
                <View style={styles.column}>{leftColumn.map(renderProductCard)}</View>
                <View style={styles.column}>{rightColumn.map(renderProductCard)}</View>
              </View>
            )
          ) : (
            <View style={{ padding: 16 }}>
              <Text style={{ color: colors.text }}>{userData?.about || t('noBio')}</Text>
            </View>
          )}

          <Modal visible={modalVisible} transparent>
            <View style={{ flex: 1, backgroundColor: colors.background }}>
              <ImageViewer
                imageUrls={[{ url: userData?.photoURL || '' }]}
                onCancel={() => setModalVisible(false)}
                enableSwipeDown
                renderIndicator={() => <View />}
                backgroundColor={colors.background}
              />
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
          </Modal>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default OtherProfileScreen;

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: { flex: 1 },
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerUsername: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 10,
  },
  backButton: { padding: 4 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  profileCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    backgroundColor: colors.card,
  },
  avatar: { width: 120, height: 120, borderRadius: 12 },
  profileInfo: { flex: 1, marginLeft: 16 },
  fullNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.text,
  },
  followRow: { flexDirection: 'row', marginBottom: 8 },
  followButtonCard: {
    backgroundColor: colors.text,
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  followButtonText: { color: colors.background, fontSize: 12, fontWeight: 'bold' },
  tabRow: { flexDirection: 'row', marginBottom: 12, borderBottomWidth: 1, borderColor: colors.card },
  tabButton: { flexDirection: 'row', flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  tabText: { color: colors.secondaryText, fontWeight: 'bold', marginLeft: 4 },
  activeTab: { borderBottomWidth: 2, borderColor: colors.text },
  activeTabText: { color: colors.text },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 15, color: colors.text },
  masonryContainer: { flexDirection: 'row', paddingHorizontal: 10, paddingBottom: 0 },
  column: { flex: 1, paddingHorizontal: 5 },
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
  imageContainer: { padding: 10 },
  image: { width: '100%', resizeMode: 'contain', borderRadius: 8 },
  noImage: { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.card },
  noImageText: { color: colors.secondaryText },
  infoContainer: { padding: 12, paddingTop: 0, backgroundColor: colors.card },
  userRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  username: { fontSize: 13, color: colors.text, flex: 1 },
  favoriteButton: { padding: 2 },
  title: { fontSize: 15, color: colors.secondaryText, marginBottom: 8, lineHeight: 20 },
  price: { fontSize: 17, fontWeight: 'bold', color: colors.text },
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
  closeButton: { position: 'absolute', top: 40, right: 20, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: 4, elevation: 5 },
});