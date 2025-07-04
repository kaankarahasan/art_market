import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  NavigationProp,
  useFocusEffect,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { followUser, unfollowUser } from '../firebaseService';
import { RootStackParamList } from '../App';
import { deleteProduct } from '../utils/deleteProduct';

// types
type ProfileRouteProp = RouteProp<RootStackParamList, 'Profile'>;
type UserInfo = {
  uid: string;
  username: string;
};

const ProfileScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<ProfileRouteProp>();
  const auth = getAuth();
  const firestore = getFirestore();
  const insets = useSafeAreaInsets();

  const currentUser = auth.currentUser;
  const profileId = route.params?.userId ?? currentUser?.uid ?? '';

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isImageModalVisible, setImageModalVisible] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState<UserInfo[]>([]);
  const [following, setFollowing] = useState<UserInfo[]>([]);
  const [soldCount, setSoldCount] = useState(0);
  const [products, setProducts] = useState<any[]>([]);

  const isOwnProfile = profileId === currentUser?.uid;

  const fetchProfileData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const ownRef = doc(firestore, 'users', currentUser.uid);
      const targetRef = doc(firestore, 'users', profileId);

      const ownSnap = await getDoc(ownRef);
      const ownData = ownSnap.data() || {};
      setUserData(ownData);

      const ownFollowing = Array.isArray(ownData.following) ? ownData.following : [];
      setIsFollowing(ownFollowing.includes(profileId));

      const targetSnap = await getDoc(targetRef);
      const targetData = targetSnap.data() || {};

      const followerIds: string[] = Array.isArray(targetData.followers) ? targetData.followers : [];
      const followingIds: string[] = Array.isArray(targetData.following) ? targetData.following : [];

      const fetchUserInfos = async (uids: string[]): Promise<UserInfo[]> => {
        const promises = uids.map(async (uid) => {
          const userDoc = await getDoc(doc(firestore, 'users', uid));
          const data = userDoc.data();
          return {
            uid,
            username: data?.username || 'Bilinmeyen',
          };
        });
        return Promise.all(promises);
      };

      const followersData = await fetchUserInfos(followerIds);
      const followingData = await fetchUserInfos(followingIds);

      setFollowers(followersData);
      setFollowing(followingData);
      setSoldCount(await getSoldCount());

    } catch (err) {
      console.error('Profil verisi alınırken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = () => {
    const q = query(
      collection(firestore, 'products'),
      where('ownerId', '==', profileId),
      where('isSold', '==', false)
    );
    return onSnapshot(q, snapshot => {
      const productList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productList);
    });
  };

  const getSoldCount = async () => {
    const soldQuery = query(
      collection(firestore, 'products'),
      where('ownerId', '==', profileId),
      where('isSold', '==', true)
    );
    const soldSnapshot = await getDocs(soldQuery);
    return soldSnapshot.size;
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
      const unsubscribe = fetchProducts();
      return () => unsubscribe();
    }, [profileId])
  );

  const goToSettings = () => navigation.navigate('Settings');
  const goToSold = () => navigation.navigate('Sold');
  const goToAddProduct = () => navigation.navigate('AddProduct');
  const toggleImageModal = () => setImageModalVisible((v) => !v);

  const handleFollow = async () => {
    if (!currentUser) return;
    try {
      if (isFollowing) {
        await unfollowUser(profileId);
        setIsFollowing(false);
        setFollowers((prev) => prev.filter((user) => user.uid !== currentUser.uid));
      } else {
        await followUser(profileId);
        setIsFollowing(true);
        setFollowers((prev) => [
          ...prev,
          { uid: currentUser.uid, username: currentUser.displayName || 'Sen' },
        ]);
      }
    } catch (err) {
      console.error('Takip işlemi hatası:', err);
    }
  };

  const goToOtherProfile = (userId: string) => {
    navigation.navigate('OtherProfile', { userId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#666" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Ayarlar ve Profil */}
      {isOwnProfile && (
        <TouchableOpacity style={[styles.settingsIcon, { top: insets.top + 10 }]} onPress={goToSettings}>
          <Icon name="settings-outline" size={28} color="#000" />
        </TouchableOpacity>
      )}

      <View style={styles.headerSection}>
        <TouchableOpacity onPress={toggleImageModal}>
          <Image
            source={
              userData?.profilePicture
                ? { uri: userData.profilePicture }
                : require('../assets/default-avatar.png')
            }
            style={styles.avatar}
          />
        </TouchableOpacity>
        <Text style={styles.username}>@{userData?.username || 'kullaniciadi'}</Text>
        <Text style={styles.fullName}>{userData?.fullName || 'Ad Soyad'}</Text>
      </View>

      {/* Takip Et butonu */}
      {!isOwnProfile && (
        <View style={styles.followButtonContainer}>
          <TouchableOpacity style={styles.followButton} onPress={handleFollow}>
            <Text style={styles.followButtonText}>
              {isFollowing ? 'Takipten Çık' : 'Takip Et'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Satılanlar ve Ürün Ekle */}
      <TouchableOpacity style={styles.soldBox} onPress={goToSold}>
        <Text style={styles.soldText}>Satılanlar: {soldCount}</Text>
      </TouchableOpacity>

      {isOwnProfile && (
        <TouchableOpacity style={styles.AddProductBox} onPress={goToAddProduct}>
          <Text style={styles.soldText}>Ürün Ekle</Text>
        </TouchableOpacity>
      )}

      {/* Ürün Listesi */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Ürünler</Text>
        {products.length > 0 ? (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.productItem}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
                ) : null}
                <Text style={styles.productTitle}>{item.title}</Text>
                <Text style={styles.productDesc}>{item.description}</Text><TouchableOpacity
                onPress={() =>
                  deleteProduct(item.id, item.imageUrl || null, item.isSold, fetchProducts)
                }
              >
                <Text style={{ color: 'red', marginTop: 5 }}>Sil</Text>
              </TouchableOpacity>
              </View>
            )}
          />
        ) : (
          <Text>Henüz ürün yok.</Text>
        )}
      </View>

      {/* Takipçiler ve Takip Edilenler */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Takipçiler</Text>
        <FlatList
          data={followers}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => goToOtherProfile(item.uid)} style={styles.listItem}>
              <Text>@{item.username}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text>Henüz takipçi yok.</Text>}
        />
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Takip Edilenler</Text>
        <FlatList
          data={following}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => goToOtherProfile(item.uid)} style={styles.listItem}>
              <Text>@{item.username}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text>Henüz kimseyi takip etmiyorsunuz.</Text>}
        />
      </View>

      {/* Profil Fotoğrafı Modalı */}
      <Modal
        visible={isImageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={toggleImageModal}
      >
        <TouchableWithoutFeedback onPress={toggleImageModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <TouchableWithoutFeedback>
                <View style={styles.modalImageWrapper}>
                  <Image
                    source={
                      userData?.profilePicture
                        ? { uri: userData.profilePicture }
                        : require('../assets/default-avatar.png')
                    }
                    style={styles.modalImage}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  settingsIcon: { position: 'absolute', right: 20, zIndex: 1 },
  headerSection: { alignItems: 'center', marginTop: 15 },
  avatar: { width: 100, height: 100, borderRadius: 60, marginBottom: 12 },
  username: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  fullName: { fontSize: 16, color: '#666' },
  followButtonContainer: { marginTop: 20, alignItems: 'center' },
  followButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 5,
  },
  followButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  soldBox: {
    marginTop: 20,
    alignSelf: 'center',
    backgroundColor: '#f2f2f2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  AddProductBox: {
    marginTop: 10,
    alignSelf: 'center',
    backgroundColor: '#d9f7e7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  soldText: { fontSize: 16, fontWeight: 'bold' },
  listContainer: { marginTop: 20, paddingHorizontal: 15 },
  listTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  listItem: { paddingVertical: 10 },
  productItem: {
    marginBottom: 15,
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#f9f9f9',
  },
  productTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  productDesc: {
    fontSize: 14,
    color: '#555',
  },
  productImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  },
  modalImageWrapper: { justifyContent: 'center', alignItems: 'center' },
  modalImage: { width: 250, height: 250, borderRadius: 150 },
});
