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
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '../routes/types';
import { ThemeContext } from '../contexts/ThemeContext';
import ImageViewer from 'react-native-image-zoom-viewer';

type ProfileRouteProp = RouteProp<RootStackParamList, 'Profile'>;
type UserInfo = { uid: string; username: string };

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;
const columnWidth = (screenWidth - 45) / 2;

const FullScreenImageModal = ({
  visible,
  onClose,
  imageUrl,
}: {
  visible: boolean;
  onClose: () => void;
  imageUrl: string;
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackground}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <MaterialIcon name="close" size={30} color="#333333" />
        </TouchableOpacity>
        <ImageViewer
          imageUrls={[{ url: imageUrl }]}
          enableSwipeDown
          onSwipeDown={onClose}
          backgroundColor="#FFFFFF"
          renderIndicator={() => <View />}
        />
      </View>
    </Modal>
  );
};

const ProfileScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<ProfileRouteProp>();
  const auth = getAuth();
  const firestore = getFirestore();
  const insets = useSafeAreaInsets();
  const { colors } = useContext(ThemeContext);

  const currentUser = auth.currentUser;
  const profileId = route.params?.userId ?? currentUser?.uid ?? '';

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState<UserInfo[]>([]);
  const [following, setFollowing] = useState<UserInfo[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<'Artworks' | 'About'>('Artworks');
  const [imageHeights, setImageHeights] = useState<{ [key: string]: number }>({});
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const isOwnProfile = profileId === currentUser?.uid;

  useEffect(() => {
    if (!profileId) return;

    const followersRef = collection(firestore, 'users', profileId, 'followers');
    const unsubscribeFollowers = onSnapshot(followersRef, async (snapshot) => {
      const followersData = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const userSnap = await getDoc(doc(firestore, 'users', docSnap.id));
          return { uid: docSnap.id, username: userSnap.data()?.username || 'Bilinmeyen' };
        })
      );
      setFollowers(followersData);
    });

    const followingRef = collection(firestore, 'users', profileId, 'following');
    const unsubscribeFollowing = onSnapshot(followingRef, async (snapshot) => {
      const followingData = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const userSnap = await getDoc(doc(firestore, 'users', docSnap.id));
          return { uid: docSnap.id, username: userSnap.data()?.username || 'Bilinmeyen' };
        })
      );
      setFollowing(followingData);
    });

    return () => {
      unsubscribeFollowers();
      unsubscribeFollowing();
    };
  }, [profileId]);

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    try {
      const userSnap = await getDoc(doc(firestore, 'users', profileId));
      if (userSnap.exists()) setUserData(userSnap.data());

      const productsSnap = await getDocs(
        query(collection(firestore, 'products'), where('ownerId', '==', profileId))
      );
      setProducts(productsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Kullanıcı verisi alınamadı:', e);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useFocusEffect(useCallback(() => { fetchUserData(); }, [fetchUserData]));

  const handleImageLoad = (productId: string, width: number, height: number) => {
    const imageWidth = columnWidth - 20;
    const aspectRatio = height / width;
    const calculatedHeight = imageWidth * aspectRatio;
    setImageHeights((prev) => ({ ...prev, [productId]: calculatedHeight }));
  };

  const distributeProducts = () => {
    const leftColumn: any[] = [];
    const rightColumn: any[] = [];
    let leftHeight = 0;
    let rightHeight = 0;

    products.forEach((product) => {
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

  const renderProductCard = (item: any) => {
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
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
              {item.year ? `, ${item.year}` : ''}
            </Text>
            <Text style={styles.price}>
              ₺{item.price ? item.price.toLocaleString('tr-TR') : '0'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#333333" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      {/* Geri Butonu */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: insets.top + 10,
          left: 16,
          zIndex: 10,
          padding: 8,
          marginBottom: insets.bottom + 10,
        }}
        onPress={() => navigation.goBack()}
      >
        <Icon name="chevron-back" size={28} color="#000" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={{ paddingBottom: 50, paddingTop: 60 }}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
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
            <View style={styles.usernameRow}>
              <Text style={styles.usernameText}>@{userData?.username || 'kullaniciadi'}</Text>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => navigation.navigate('Settings')}
              >
                <MaterialIcon name="menu" size={24} color="#333333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.fullNameText}>{userData?.fullName || 'Ad Soyad'}</Text>

            <View style={styles.followRow}>
              <TouchableOpacity
                style={styles.followButtonCard}
                onPress={() => navigation.navigate('Followers', { userId: profileId })}
              >
                <Text style={styles.followButtonText}>Followers: {followers.length}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.followButtonCard}
                onPress={() => navigation.navigate('Following', { userId: profileId })}
              >
                <Text style={styles.followButtonText}>Following: {following.length}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.addWorkButton}
              onPress={() => navigation.navigate('AddProduct')}
            >
              <Text style={styles.addWorkText}>Add Work</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabItem, selectedTab === 'Artworks' && styles.activeTabLarge]}
            onPress={() => setSelectedTab('Artworks')}
          >
            <Icon
              name="albums-outline"
              size={20}
              color={selectedTab === 'Artworks' ? '#0A0A0A' : '#6E6E6E'}
            />
            <Text
              style={[styles.tabText, selectedTab === 'Artworks' && { color: '#0A0A0A' }]}
            >
              Artworks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, selectedTab === 'About' && styles.activeTabLarge]}
            onPress={() => setSelectedTab('About')}
          >
            <Icon
              name="information-circle-outline"
              size={20}
              color={selectedTab === 'About' ? '#0A0A0A' : '#6E6E6E'}
            />
            <Text style={[styles.tabText, selectedTab === 'About' && { color: '#0A0A0A' }]}>
              About
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {selectedTab === 'Artworks' ? (
          <View style={[styles.masonryContainer, { paddingBottom: 50, paddingTop: 10 }]}>
            <View style={styles.column}>{leftColumn.map(renderProductCard)}</View>
            <View style={styles.column}>{rightColumn.map(renderProductCard)}</View>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, marginTop: 10, paddingBottom: 50 }}>
            <Text style={{ color: '#6E6E6E', fontSize: 14 }}>
              {userData?.bio || 'No bio available.'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Profile Image Modal */}
      <FullScreenImageModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        imageUrl={userData?.photoURL || ''}
      />
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    alignItems: 'center',
  },
  profileImage: { width: 120, height: 120, borderRadius: 12 },
  profileInfo: { flex: 1, marginLeft: 16 },
  usernameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  usernameText: { fontSize: 18, fontWeight: 'bold', color: '#0A0A0A' },
  fullNameText: { fontSize: 14, color: '#6E6E6E', marginBottom: 8 },
  followRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 12 },
  followButtonCard: {
    backgroundColor: '#333333',
    paddingVertical: 6,
    paddingHorizontal: 22,
    borderRadius: 5,
  },
  followButtonText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  addWorkButton: {
    backgroundColor: '#333333',
    paddingVertical: 10,
    paddingHorizontal: 80,
    borderRadius: 5,
  },
  addWorkText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 10, marginRight: 4 },
  settingsButton: { marginLeft: 10 },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 6,
    justifyContent: 'center',
    flex: 1,
  },
  activeTabLarge: { borderBottomWidth: 2, borderBottomColor: '#333333' },
  tabText: { fontSize: 14, color: '#6E6E6E', fontWeight: '600' },
  masonryContainer: { flexDirection: 'row', paddingHorizontal: 10 },
  column: { flex: 1, paddingHorizontal: 5 },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#F4F4F4',
    elevation: 2,
  },
  imageContainer: { padding: 10 },
  image: { width: '100%', resizeMode: 'contain', borderRadius: 8 },
  noImage: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8E8E8' },
  noImageText: { color: '#6E6E6E' },
  infoContainer: { padding: 12, paddingTop: 0 },
  title: { fontSize: 15, color: '#6E6E6E', marginBottom: 8, lineHeight: 20 },
  price: { fontSize: 17, fontWeight: 'bold', color: '#0A0A0A' },
  modalBackground: { flex: 1, backgroundColor: '#FFFFFF' },
  closeButton: { position: 'absolute', top: 40, right: 20, zIndex: 10 },
});
