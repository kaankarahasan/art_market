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
  TextInput,
  Button,
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
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../routes/types';
import { deleteProduct } from '../utils/deleteProduct';
import { updateProduct } from '../utils/updateProduct';

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

  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

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

  // Kullanıcı bilgisi ve takipçi / takip edilenleri çekme
  const fetchProfileData = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);

      // Profili gösterilen kullanıcının bilgisi
      const targetRef = doc(firestore, 'users', profileId);
      const targetSnap = await getDoc(targetRef);
      const targetData = targetSnap.data() || {};
      setUserData(targetData);

      // Profil sahibi kullanıcının takipçileri ve takip ettikleri
      const followerIds: string[] = Array.isArray(targetData.followers) ? targetData.followers : [];
      const followingIds: string[] = Array.isArray(targetData.following) ? targetData.following : [];

      // Takipçi ve takip edilenlerin userInfo'larını çek
      const fetchUserInfos = async (uids: string[]): Promise<UserInfo[]> => {
        if (uids.length === 0) return [];
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

      // currentUser'un takip durumu
      if (currentUser.uid !== profileId) {
        const currentUserRef = doc(firestore, 'users', currentUser.uid);
        const currentUserSnap = await getDoc(currentUserRef);
        const currentUserData = currentUserSnap.data() || {};
        const currentUserFollowing: string[] = Array.isArray(currentUserData.following) ? currentUserData.following : [];
        setIsFollowing(currentUserFollowing.includes(profileId));
      } else {
        setIsFollowing(false);
      }

      setSoldCount(await getSoldCount());

    } catch (err) {
      console.error('Profil verisi alınırken hata:', err);
    } finally {
      setLoading(false);
    }
  };

  // Ürünleri dinamik çek
  const fetchProducts = () => {
    const q = query(
      collection(firestore, 'products'),
      where('ownerId', '==', profileId),
      where('isSold', '==', false)
    );
    return onSnapshot(q, (snapshot) => {
      const productList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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

  const goToFollowers = () => {
    navigation.navigate('Followers', { userId: profileId });
  };

  const goToFollowing = () => {
    navigation.navigate('Following', { userId: profileId });
  };

  // Takip et / takipten çık işlemi
  const handleFollow = async () => {
    if (!currentUser) return;

    const currentUserRef = doc(firestore, 'users', currentUser.uid);
    const profileUserRef = doc(firestore, 'users', profileId);

    try {
      if (isFollowing) {
        // Takipten çık
        await updateDoc(currentUserRef, {
          following: arrayRemove(profileId),
        });
        await updateDoc(profileUserRef, {
          followers: arrayRemove(currentUser.uid),
        });
        setIsFollowing(false);
        setFollowers((prev) => prev.filter((user) => user.uid !== currentUser.uid));
      } else {
        // Takip et
        await updateDoc(currentUserRef, {
          following: arrayUnion(profileId),
        });
        await updateDoc(profileUserRef, {
          followers: arrayUnion(currentUser.uid),
        });
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
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <>
            {/* Ayarlar */}
            {isOwnProfile && (
              <TouchableOpacity style={[styles.settingsIcon, { top: insets.top + 10 }]} onPress={goToSettings}>
                <Icon name="settings-outline" size={28} color="#000" />
              </TouchableOpacity>
            )}

            {/* Profil */}
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

            <View style={styles.countBox}>
              <TouchableOpacity style={styles.countItem} onPress={goToFollowers}>
                <Text style={styles.countNumber}>{followers.length}</Text>
                <Text style={styles.countLabel}>Takipçi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.countItem} onPress={goToFollowing}>
                <Text style={styles.countNumber}>{following.length}</Text>
                <Text style={styles.countLabel}>Takip</Text>
              </TouchableOpacity>
            </View>

            {/* Takip butonu */}
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

            <Text style={styles.listTitle}>Ürünler</Text>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.productItem}
            onPress={() => navigation.navigate('ProductDetail', { product: item })}
          >
            {item.imageUrl && (
              <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
            )}
            <Text style={styles.productTitle}>{item.title}</Text>
            <Text style={styles.productDesc}>{item.description}</Text>

            {isOwnProfile && (
              <>
                <TouchableOpacity onPress={() => deleteProduct(item.id, item.imageUrl, item.isSold)}>
                  <Text style={{ color: 'red' }}>Sil</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedProduct(item);
                    setNewTitle(item.title);
                    setNewDescription(item.description);
                    setUpdateModalVisible(true);
                  }}
                >
                  <Text style={{ color: 'blue' }}>Güncelle</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20 }}>Henüz ürün yok.</Text>}
      />
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
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 14,
  },
  countBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 30,
  },
  countItem: {
    alignItems: 'center',
  },
  countNumber: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  countLabel: {
    fontSize: 14,
    color: '#666',
  },
});
