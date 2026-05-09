import React, { useState, useCallback, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  NavigationProp,
  useFocusEffect,
} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import { signOut } from '@react-native-firebase/auth';
import { doc, getDoc, onSnapshot, query, collection, where, getDocs } from '@react-native-firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../routes/types';
import { ThemeContext } from '../contexts/ThemeContext';
import ImageViewer from 'react-native-image-zoom-viewer';
import { useFavoriteItems, FavoriteItem } from '../contexts/FavoritesContext';
import { useLanguage } from '../contexts/LanguageContext';

const screenWidth = Dimensions.get('window').width;
const columnWidth = (screenWidth - 45) / 2;

type ProfileRouteProp = RouteProp<RootStackParamList, 'Profile'>;
type UserInfo = { uid: string; username: string };

const FullScreenImageModal = ({
  visible,
  onClose,
  imageUrl,
}: {
  visible: boolean;
  onClose: () => void;
  imageUrl: string;
}) => {
  const { colors } = useContext(ThemeContext);
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <TouchableOpacity
          style={{ position: 'absolute', top: 40, right: 20, zIndex: 10 }}
          onPress={onClose}
        >
          <MaterialIcon name="close" size={30} color={colors.text} />
        </TouchableOpacity>
        <ImageViewer
          imageUrls={[{ url: imageUrl }]}
          enableSwipeDown
          onSwipeDown={onClose}
          backgroundColor={colors.background}
          renderIndicator={() => <View />}
        />
      </View>
    </Modal>
  );
};

const ProfileScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<ProfileRouteProp>();
  const insets = useSafeAreaInsets();
  const currentUser = auth.currentUser;
  const profileId = route.params?.userId ?? currentUser?.uid ?? '';

  const { colors, isDarkTheme } = useContext(ThemeContext);
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { t } = useLanguage();

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState<UserInfo[]>([]);
  const [following, setFollowing] = useState<UserInfo[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<'Artworks' | 'About'>('Artworks');
  const [imageHeights, setImageHeights] = useState<{ [key: string]: number }>({});
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const { favoriteItems, addFavorite, removeFavorite } = useFavoriteItems();

  const isOwnProfile = profileId === currentUser?.uid;

  useEffect(() => {
    if (!profileId) return;

    // Follower list snapshot
    const unsubFollowers = onSnapshot(collection(db, 'users', profileId, 'followers'), async (snapshot) => {
      const data = await Promise.all(
        snapshot.docs.map(async (docSnap: any) => {
          const userSnap = await getDoc(doc(db, 'users', docSnap.id));
          return { uid: docSnap.id, username: userSnap.data()?.username || 'Unknown' };
        })
      );
      setFollowers(data);
    });

    // Following list snapshot
    const unsubFollowing = onSnapshot(collection(db, 'users', profileId, 'following'), async (snapshot) => {
      const data = await Promise.all(
        snapshot.docs.map(async (docSnap: any) => {
          const userSnap = await getDoc(doc(db, 'users', docSnap.id));
          return { uid: docSnap.id, username: userSnap.data()?.username || 'Unknown' };
        })
      );
      setFollowing(data);
    });

    return () => {
      unsubFollowers();
      unsubFollowing();
    };
  }, [profileId]);

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    try {
      const userSnap = await getDoc(doc(db, 'users', profileId));
      if (userSnap.exists()) setUserData(userSnap.data());

      const q = query(collection(db, 'products'), where('ownerId', '==', profileId));
      const productsSnap = await getDocs(q);

      const fetchedProducts = productsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      
      fetchedProducts.sort((a: any, b: any) => {
        if (a.isSold === b.isSold) {
          const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return bTime - aTime;
        }
        return a.isSold ? 1 : -1;
      });

      setProducts(fetchedProducts);
    } catch (e) {
      console.error('Kullanıcı verisi alınamadı:', e);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => { fetchUserData(); }, [fetchUserData]);

  const handleImageLoad = (productId: string, width: number, height: number) => {
    const imageWidth = columnWidth - 20;
    const aspectRatio = height / width;
    const calcHeight = imageWidth * aspectRatio;
    setImageHeights((prev) => ({ ...prev, [productId]: calcHeight }));
  };

  const distributeProducts = () => {
    const left: any[] = [];
    const right: any[] = [];
    let leftH = 0;
    let rightH = 0;

    products.forEach((p) => {
      // Asimetrik düzen için stabil rastgele başlangıç yüksekliği
      const stableRandomHeight = (parseInt(p.id.substring(0, 8), 16) % 150) + 200;
      const h = imageHeights[p.id] || stableRandomHeight;
      const total = h + 110;
      if (leftH <= rightH) {
        left.push(p);
        leftH += total;
      } else {
        right.push(p);
        rightH += total;
      }
    });
    return { left, right };
  };

  const { left, right } = distributeProducts();

  const handleFavoriteToggle = (item: any) => {
    const isFav = favoriteItems.some(fav => fav.id === item.id);
    const imageUrl = item.imageUrls?.[0] || item.imageUrl || null;

    const favItem: FavoriteItem = {
      id: item.id,
      title: item.title || 'Başlık Yok',
      username: item.username || userData?.username || 'Bilinmeyen',
      imageUrl: imageUrl,
      price: item.price || 0,
      year: item.year || '',
      createdAt: item.createdAt,
    };
    isFav ? removeFavorite(item.id) : addFavorite(favItem);
  };

  const renderProductCard = (item: any) => {
    const isFavorite = favoriteItems.some(fav => fav.id === item.id);
    // Asimetrik düzen için stabil rastgele başlangıç yüksekliği
    const stableRandomHeight = (parseInt(item.id.substring(0, 8), 16) % 150) + 200;
    const imageHeight = imageHeights[item.id] || stableRandomHeight;
    const firstImage = item.imageUrls?.[0] || item.imageUrl;
    const displayName = userData?.username || item.username || 'Bilinmeyen';

    const isProductNew = (() => {
      if (!item.createdAt) return false;
      const date = item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt);
      return (new Date().getTime() - date.getTime()) < 48 * 60 * 60 * 1000;
    })();

    return (
      <View key={item.id} style={[styles.card, { width: columnWidth }]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ProductDetail', { product: item })}
          activeOpacity={0.8}
        >
          <View style={styles.imageContainer}>
            {firstImage ? (
              <Image
                source={{ uri: firstImage }}
                style={[styles.image, { height: imageHeight, backgroundColor: isDarkTheme ? '#2a2a2a' : '#f0f0f0' }]}
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
                {displayName}
              </Text>
              <TouchableOpacity
                onPress={() => handleFavoriteToggle(item)}
                style={styles.favoriteButton}
              >
                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={18} color={isFavorite ? '#FF3040' : colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {item.title} {item.year ? `, ${item.year}` : ''}
            </Text>
            <Text style={styles.price}>₺{item.price ? Number(item.price).toLocaleString('tr-TR') : '0'}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: insets.top + 10,
          paddingBottom: 12,
        }}
      >
        <Text style={styles.headerUsername}>@{userData?.username || 'kullaniciadi'}</Text>

        {isOwnProfile && (
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <TouchableOpacity onPress={() => navigation.navigate('AddProduct')}>
              <Ionicons name="add-outline" size={32} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Feather name="menu" size={32} color={colors.text} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 80 + insets.bottom,
        }}
      >
        <View style={[styles.profileCard, { marginTop: 8 }]}>
          <TouchableOpacity onPress={() => setProfileModalVisible(true)}>
            <Image
              source={
                userData?.photoURL
                  ? { uri: userData.photoURL }
                  : require('../assets/default-avatar.png')
              }
              style={styles.profileImage}
            />
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <Text style={styles.fullNameText} numberOfLines={1}>
              {userData?.fullName || 'Ad Soyad'}
            </Text>

            <View style={styles.followStatsContainer}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Followers', { userId: profileId })}
                style={styles.followStatItemRow}
              >
                <Text style={styles.followLabel}>
                  {t('followers')}: <Text style={styles.followNumber}>{followers.length}</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('Following', { userId: profileId })}
                style={styles.followStatItemRow}
              >
                <Text style={styles.followLabel}>
                  {t('following')}: <Text style={styles.followNumber}>{following.length}</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabItem, selectedTab === 'Artworks' && styles.activeTabLarge]}
            onPress={() => setSelectedTab('Artworks')}
          >
            <Ionicons
              name="albums-outline"
              size={20}
              color={selectedTab === 'Artworks' ? colors.text : colors.secondaryText}
            />
            <Text style={[styles.tabText, selectedTab === 'Artworks' && { color: colors.text }]}>
              {t('artworks')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, selectedTab === 'About' && styles.activeTabLarge]}
            onPress={() => setSelectedTab('About')}
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={selectedTab === 'About' ? colors.text : colors.secondaryText}
            />
            <Text style={[styles.tabText, selectedTab === 'About' && { color: colors.text }]}>
              {t('aboutTab')}
            </Text>
          </TouchableOpacity>
        </View>

        {selectedTab === 'Artworks' ? (
          <View style={[styles.masonryContainer, { paddingTop: 10 }]}>
            <View style={styles.column}>{left.map(renderProductCard)}</View>
            <View style={styles.column}>{right.map(renderProductCard)}</View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, marginTop: 10, paddingBottom: 50 }}>
            <Text style={{ color: colors.secondaryText, fontSize: 14 }}>
              {userData?.bio || t('noBio')}
            </Text>
          </View>
        )}
      </ScrollView>

      <FullScreenImageModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        imageUrl={userData?.photoURL || ''}
      />
    </View>
  );
};

export default ProfileScreen;

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerUsername: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },

  profileCard: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    alignItems: 'center',
  },

  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },

  profileInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

  fullNameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'left',
    width: '100%',
  },

  followStatItemRow: {
    alignItems: 'center',
  },

  followNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },

  followLabel: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
  },

  followStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 24,
    width: '80%',
  },

  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || '#E0E0E0',
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
    justifyContent: 'center',
    flex: 1,
  },
  activeTabLarge: { borderBottomWidth: 2, borderBottomColor: colors.text },
  tabText: { fontSize: 14, color: colors.secondaryText, fontWeight: '600' },

  masonryContainer: { flexDirection: 'row', paddingHorizontal: 10 },
  column: { flex: 1, paddingHorizontal: 5 },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: colors.card,
    elevation: 2,
  },
  imageContainer: { padding: 10 },
  image: { width: '100%', resizeMode: 'contain', borderRadius: 8 },
  noImage: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8E8E8' },
  noImageText: { color: colors.secondaryText },
  infoContainer: { padding: 12, paddingTop: 0 },
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
  closeButton: { position: 'absolute', top: 40, right: 20, zIndex: 10 },
});