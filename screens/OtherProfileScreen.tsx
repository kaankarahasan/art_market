import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { RouteProp, useRoute, NavigationProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../routes/types'
import { auth, db } from '../firebase';
import {
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
import { Product } from '../routes/types';

type OtherProfileRouteProp = RouteProp<RootStackParamList, 'OtherProfile'>;

type UserInfo = { uid: string; username: string };

const OtherProfileScreen = () => {
  const route = useRoute<OtherProfileRouteProp>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userId } = route.params;

   const goToFollowers = () => {
    navigation.navigate('Followers', { userId });
  };

  // Takip edilenler ekranına git
  const goToFollowing = () => {
    navigation.navigate('Following', { userId });
  };

  const currentUser = auth.currentUser;
  const [userData, setUserData] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [followers, setFollowers] = useState<UserInfo[]>([]);
  const [following, setFollowing] = useState<UserInfo[]>([]);

  const fetchUserData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      // Kullanıcı bilgisi
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setUserData(null);
        return;
      }
      const data = userSnap.data();
      setUserData(data);
      // Takipçi ve takip edilenleri detaylı çek
      const followerIds: string[] = Array.isArray(data.followers) ? data.followers : [];
      const followingIds: string[] = Array.isArray(data.following) ? data.following : [];

      const fetchUserInfos = async (uids: string[]): Promise<UserInfo[]> => {
        if (uids.length === 0) return [];
        const promises = uids.map(async (uid) => {
          const docSnap = await getDoc(doc(db, 'users', uid));
          return { uid, username: docSnap.data()?.username || 'Bilinmeyen' };
        });
        return Promise.all(promises);
      };

      const followersData = await fetchUserInfos(followerIds);
      const followingData = await fetchUserInfos(followingIds);

      setFollowers(followersData);
      setFollowing(followingData);

      // currentUser’un takip durumu
      if (currentUser?.uid) {
        const currentUserRef = doc(db, 'users', currentUser.uid);
        const currentUserSnap = await getDoc(currentUserRef);  // burada currentUserSnap tanımlanıyor
        const currentUserData = currentUserSnap.data();         // buradan data çekiliyor
        const currentUserFollowing: string[] = Array.isArray(currentUserData?.following)
          ? currentUserData.following
          : [];
        setIsFollowing(currentUserFollowing.includes(userId));
      } else {
        setIsFollowing(false);
      }
    } catch (err) {
      console.error('Kullanıcı profili alınamadı:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser?.uid]);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
  const fetchUser = async () => {
    try {
      const userRef = doc(db, 'users', userId);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);

        if (!currentUser?.uid) return;
        const currentUserRef = doc(db, 'users', currentUser.uid);
        const currentUserSnap = await getDoc(currentUserRef);
        const followingList = currentUserSnap.data()?.following || [];
        setIsFollowing(followingList.includes(userId));

        const followerIds = Array.isArray(data.followers) ? data.followers : [];
        const followingIds = Array.isArray(data.following) ? data.following : [];
        setFollowersCount(followerIds.length);
        setFollowingCount(followingIds.length);
      }

      // ürünleri çekme kısmı burada
    } catch (error) {
      console.error('Kullanıcı profili alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchUser();
}, [userId, currentUser?.uid]);


  // Ürünleri realtime dinle
  useEffect(() => {
    const q = query(collection(db, 'products'), where('ownerId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(productList);
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Takip et / bırak işlemi
  const toggleFollow = async () => {
  if (!currentUser?.uid) {
    console.warn('currentUser yok veya uid undefined');
    return;
  }
  if (!userId) {
    console.warn('target userId undefined');
    return;
  }
  if (currentUser.uid === userId) {
    alert('Kendinizi takip edemezsiniz.');
    return;
  }

    const currentUserRef = doc(db, 'users', currentUser.uid);
    const targetUserRef = doc(db, 'users', userId);

    try {
      if (isFollowing) {
        await updateDoc(currentUserRef, {
          following: arrayRemove(userId),
        });
        await updateDoc(targetUserRef, {
          followers: arrayRemove(currentUser.uid),
        });
      } else {
        await updateDoc(currentUserRef, {
          following: arrayUnion(userId),
        });
        await updateDoc(targetUserRef, {
          followers: arrayUnion(currentUser.uid),
        });
      }
      // Takip durumu güncelleme için fetchUserData çağrısı yerine manuel güncelleme:
      setIsFollowing(!isFollowing);

      // Takipçi listesini de manuel güncelle:
      setFollowers((prev) => {
        if (isFollowing) {
          // Takipten çıkıldı
          return prev.filter((f) => f.uid !== currentUser.uid);
        } else {
          // Takip edildi
          return [...prev, { uid: currentUser.uid, username: currentUser.displayName || 'Sen' }];
        }
      });
    } catch (error: any) {
      console.error('Takip işlemi hatası:', error);
      alert('Takip işlemi sırasında hata oluştu: ' + (error.message || JSON.stringify(error)));
    }
  };

  const goToProductDetail = (product: Product) => {
    navigation.navigate('ProductDetail', { product });
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#000" />;
  }

  return (
    <View style={styles.container}>
      {userData?.profilePicture ? (
        <Image source={{ uri: userData.profilePicture }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: '#ccc' }]} />
      )}
      <Text style={styles.username}>{userData?.username || 'Kullanıcı'}</Text>
      <Text style={styles.bio}>{userData?.bio || 'Açıklama yok.'}</Text>

      <View style={styles.countBox}>
        <TouchableOpacity style={styles.countItem} onPress={goToFollowers}>
          <Text style={styles.countNumber}>{followersCount}</Text>
          <Text style={styles.countLabel}>Takipçi</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.countItem} onPress={goToFollowing}>
          <Text style={styles.countNumber}>{followingCount}</Text>
          <Text style={styles.countLabel}>Takip</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={toggleFollow} style={styles.followButton}>
        <Text style={styles.followText}>{isFollowing ? 'Takibi Bırak' : 'Takip Et'}</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Ürünleri</Text>
      {products.length === 0 ? (
        <Text style={styles.emptyText}>Henüz ürün eklememiş.</Text>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.productList}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => goToProductDetail(item)}
              style={styles.productCard}
            >
              <Image source={{ uri: item.imageUrl || item.image }} style={styles.productImage} />
              <Text numberOfLines={1} style={styles.productTitle}>{item.title}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

export default OtherProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  avatar: { width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginBottom: 10 },
  username: { fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  bio: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 10 },
  followButton: {
    backgroundColor: '#0066cc',
    padding: 10,
    borderRadius: 6,
    marginTop: 15,
    marginBottom: 15,
    alignSelf: 'center',
  },
  followText: { color: '#fff', fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  emptyText: { textAlign: 'center', color: '#777' },
  productList: { gap: 15 },
  productCard: {
    flex: 1,
    margin: 5,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    overflow: 'hidden',
  },
  productImage: { width: '100%', height: 100 },
  productTitle: { padding: 5, fontSize: 14 },

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
