import React, { useState, useCallback, useEffect } from 'react';
import { getDocs } from 'firebase/firestore';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
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

  const currentUser = auth.currentUser;
  const profileId = route.params?.userId ?? currentUser?.uid ?? '';

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [updateModalVisible, setUpdateModalVisible] = useState(false);

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [followers, setFollowers] = useState<UserInfo[]>([]);
  const [following, setFollowing] = useState<UserInfo[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);

  const [soldCount, setSoldCount] = useState(0);
  const [products, setProducts] = useState<any[]>([]);

  const isOwnProfile = profileId === currentUser?.uid;

  // Realtime takipçiler
  useEffect(() => {
    if (!profileId) return;
    const followersRef = collection(firestore, 'users', profileId, 'followers');
    const unsubscribe = onSnapshot(followersRef, async (snapshot) => {
      const followersData = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const userSnap = await getDoc(doc(firestore, 'users', docSnap.id));
          return { uid: docSnap.id, username: userSnap.data()?.username || 'Bilinmeyen' };
        })
      );
      setFollowers(followersData);
    });
    return () => unsubscribe();
  }, [profileId]);

  // Realtime takip edilenler
  useEffect(() => {
    if (!profileId) return;
    const followingRef = collection(firestore, 'users', profileId, 'following');
    const unsubscribe = onSnapshot(followingRef, async (snapshot) => {
      const followingData = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const userSnap = await getDoc(doc(firestore, 'users', docSnap.id));
          return { uid: docSnap.id, username: userSnap.data()?.username || 'Bilinmeyen' };
        })
      );
      setFollowing(followingData);
    });
    return () => unsubscribe();
  }, [profileId]);

  // isFollowing kontrol
  useEffect(() => {
    if (!profileId || !currentUser) return;
    const docRef = doc(firestore, 'users', profileId, 'followers', currentUser.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      setIsFollowing(docSnap.exists());
    });
    return () => unsubscribe();
  }, [profileId, currentUser]);

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      const userSnap = await getDoc(doc(firestore, 'users', profileId));
      if (userSnap.exists()) {
        setUserData(userSnap.data());
      }
      const soldSnap = await getDocs(
        query(
          collection(firestore, 'products'),
          where('ownerId', '==', profileId),
          where('isSold', '==', true)
        )
      );
      setSoldCount(soldSnap.size);
    } catch (e) {
      console.error('Hata:', e);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    const q = query(
      collection(firestore, 'products'),
      where('ownerId', '==', profileId),
      where('isSold', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
    });
    return () => unsubscribe();
  }, [profileId]);

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [fetchUserData])
  );

  const handleFollow = async () => {
    if (!currentUser || currentUser.uid === profileId) return;
    const currentUserRef = doc(firestore, 'users', currentUser.uid);
    const profileUserRef = doc(firestore, 'users', profileId);

    try {
      if (isFollowing) {
        await updateDoc(currentUserRef, { following: arrayRemove(profileId) });
        await updateDoc(profileUserRef, { followers: arrayRemove(currentUser.uid) });
      } else {
        await updateDoc(currentUserRef, { following: arrayUnion(profileId) });
        await updateDoc(profileUserRef, { followers: arrayUnion(currentUser.uid) });
      }
    } catch (e) {
      console.error('Takip işlemi hatası:', e);
    }
  };

  const confirmDelete = (productId: string, imageUrl: string, isSold: boolean) => {
    Alert.alert(
      'Ürünü Sil',
      'Bu ürünü silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => deleteProduct(productId, imageUrl, isSold),
        },
      ],
      { cancelable: true }
    );
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
            {isOwnProfile && (
              <TouchableOpacity
                style={[styles.settingsIcon, { top: insets.top + 10 }]}
                onPress={() => navigation.navigate('Settings')}
              >
                <Icon name="settings-outline" size={28} color="#000" />
              </TouchableOpacity>
            )}

            <View style={styles.headerSection}>
              <Image
                source={
                  userData?.profilePicture
                    ? { uri: userData.profilePicture }
                    : require('../assets/default-avatar.png')
                }
                style={styles.avatar}
              />
              <Text style={styles.username}>@{userData?.username || 'kullaniciadi'}</Text>
              <Text style={styles.fullName}>{userData?.fullName || 'Ad Soyad'}</Text>
              {userData?.bio ? <Text style={styles.bio}>{userData.bio}</Text> : null}
            </View>

            <View style={styles.countBox}>
              <TouchableOpacity style={styles.countItem} onPress={() => navigation.navigate('Followers', { userId: profileId })}>
                <Text style={styles.countNumber}>{followers.length}</Text>
                <Text style={styles.countLabel}>Takipçi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.countItem} onPress={() => navigation.navigate('Following', { userId: profileId })}>
                <Text style={styles.countNumber}>{following.length}</Text>
                <Text style={styles.countLabel}>Takip</Text>
              </TouchableOpacity>
            </View>

            {!isOwnProfile && (
              <View style={styles.followButtonContainer}>
                <TouchableOpacity style={styles.followButton} onPress={handleFollow}>
                  <Text style={styles.followButtonText}>
                    {isFollowing ? 'Takipten Çık' : 'Takip Et'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.soldBox} onPress={() => navigation.navigate('Sold')}>
              <Text style={styles.soldText}>Satılanlar: {soldCount}</Text>
            </TouchableOpacity>

            {isOwnProfile && (
              <TouchableOpacity style={styles.AddProductBox} onPress={() => navigation.navigate('AddProduct')}>
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
            activeOpacity={0.8}
          >
            {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.productImage} />}
            <Text style={styles.productTitle}>{item.title}</Text>
            <Text style={styles.productDesc}>{item.description}</Text>

            {isOwnProfile && (
              <>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => confirmDelete(item.id, item.imageUrl, item.isSold)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteButtonText}>Sil</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.updateButton}
                  onPress={() => {
                    setSelectedProduct(item);
                    setNewTitle(item.title);
                    setNewDescription(item.description);
                    setUpdateModalVisible(true);
                    navigation.navigate('UpdateProduct', { product: item });
                  }}
                >
                  <Text style={styles.updateButtonText}>Güncelle</Text>
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
  listTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
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
  deleteButton: {
    backgroundColor: '#e33057',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 5,
    marginBottom: 5,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  updateButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 5,
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bio: {
  fontSize: 14,
  color: '#333',
  textAlign: 'center',
  marginTop: 4,
  paddingHorizontal: 20,
},

});
