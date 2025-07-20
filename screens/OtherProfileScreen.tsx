import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { RouteProp, useRoute, NavigationProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../routes/types';
import { auth, db } from '../firebase';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
  getCountFromServer,
  getDocs,
} from 'firebase/firestore';
import { Product } from '../routes/types';
import { ThemeContext } from '../contexts/ThemeContext';

type OtherProfileRouteProp = RouteProp<RootStackParamList, 'OtherProfile'>;
type UserInfo = { uid: string; username: string };

const OtherProfileScreen = () => {
  const { colors } = useContext(ThemeContext);
  const route = useRoute<OtherProfileRouteProp>();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userId } = route.params;

  const currentUser = auth.currentUser;

  const [userData, setUserData] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [followers, setFollowers] = useState<UserInfo[]>([]);
  const [following, setFollowing] = useState<UserInfo[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [followersAllowed, setFollowersAllowed] = useState(true); // Takipçi ayarı

  const fetchFollowCounts = useCallback(async () => {
    if (!userId) return;
    try {
      const followersRef = collection(db, 'users', userId, 'followers');
      const followingRef = collection(db, 'users', userId, 'following');

      const followersSnap = await getCountFromServer(followersRef);
      const followingSnap = await getCountFromServer(followingRef);

      setFollowersCount(followersSnap.data().count);
      setFollowingCount(followingSnap.data().count);
    } catch (error) {
      console.error('Takip sayısı alınamadı:', error);
    }
  }, [userId]);

  const fetchUserData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setUserData(null);
        setFollowers([]);
        setFollowing([]);
        setIsFollowing(false);
        setFollowersCount(0);
        setFollowingCount(0);
        setIsPrivate(false);
        setFollowersAllowed(true);
        return;
      }

      const data = userSnap.data();
      setUserData(data);
      setIsPrivate(data.isPrivate || false);
      setFollowersAllowed(data.followersAllowed !== false); // followersAllowed default true, false ise kapalı demek

      // Gizlilik kontrolü
      let isAllowedToView = true;
      if (data.isPrivate && currentUser?.uid !== userId) {
        const currentUserFollowerDoc = doc(db, 'users', userId, 'followers', currentUser?.uid || '');
        const followerSnap = await getDoc(currentUserFollowerDoc);
        isAllowedToView = followerSnap.exists();
      }

      // Takipçi ayarı kapalı ise, takipçi listesi ve ürünlere erişim kısıtlanabilir.
      if (!followersAllowed && currentUser?.uid !== userId) {
        // Takipçi ayarı kapalı, takipçi olmayanlar erişemez
        isAllowedToView = false;
      }

      if (!isAllowedToView) {
        setProducts([]);
        setFollowers([]);
        setFollowing([]);
        setIsFollowing(false);
        setFollowersCount(0);
        setFollowingCount(0);
        return;
      }

      // Takipçi bilgileri
      const followersRef = collection(db, 'users', userId, 'followers');
      const followersDocsSnap = await getDocs(followersRef);
      const followerIds = followersDocsSnap.docs.map((doc) => doc.id);

      // Takip edilenler bilgileri
      const followingRef = collection(db, 'users', userId, 'following');
      const followingDocsSnap = await getDocs(followingRef);
      const followingIds = followingDocsSnap.docs.map((doc) => doc.id);

      // UserInfo fetch fonksiyonu
      const fetchUserInfos = async (uids: string[]): Promise<UserInfo[]> => {
        if (uids.length === 0) return [];
        const promises = uids.map(async (uid) => {
          const snap = await getDoc(doc(db, 'users', uid));
          return { uid, username: snap.data()?.username || 'Bilinmeyen' };
        });
        return Promise.all(promises);
      };

      const followersData = await fetchUserInfos(followerIds);
      const followingData = await fetchUserInfos(followingIds);

      setFollowers(followersData);
      setFollowing(followingData);

      // Takip durumu
      if (currentUser?.uid) {
        const currentUserFollowerDoc = doc(db, 'users', userId, 'followers', currentUser.uid);
        const docSnap = await getDoc(currentUserFollowerDoc);
        setIsFollowing(docSnap.exists());
      } else {
        setIsFollowing(false);
      }
    } catch (err) {
      console.error('Kullanıcı profili alınamadı:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser?.uid, followersAllowed]);

  useEffect(() => {
    if (!userId) return;

    // Ürünleri çek, gizlilik kontrolüyle
    const fetchProducts = async () => {
      try {
        if (!userData) return;
        let isAllowedToView = true;
        if (userData.isPrivate && currentUser?.uid !== userId) {
          const currentUserFollowerDoc = doc(db, 'users', userId, 'followers', currentUser?.uid || '');
          const followerSnap = await getDoc(currentUserFollowerDoc);
          isAllowedToView = followerSnap.exists();
        }

        // Takipçi ayarı kapalı ise, erişim kapalı
        if (userData.followersAllowed === false && currentUser?.uid !== userId) {
          isAllowedToView = false;
        }

        if (!isAllowedToView) {
          setProducts([]);
          return;
        }

        const q = query(collection(db, 'products'), where('ownerId', '==', userId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const productList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Product[];
          setProducts(productList);
        });
        return unsubscribe;
      } catch (error) {
        console.error('Ürünler alınamadı:', error);
      }
    };

    fetchProducts();
  }, [userId, userData, currentUser?.uid]);

  useEffect(() => {
    fetchUserData();
    fetchFollowCounts();
  }, [fetchUserData, fetchFollowCounts]);

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

  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      alert('Kullanıcı bulunamadı.');
      return;
    }
    const userData = userSnap.data();
    const followerPermission = userData?.privacySettings?.followerPermission || 'everyone';

    if (followerPermission === 'none') {
      alert('Bu kullanıcı takipçi ayarını kapalı tutuyor, takip edemezsiniz.');
      return;
    }

    // Eğer 'approved' mantığına göre daha detay kontrol istersen buraya ekle

    const followerDocRef = doc(db, 'users', userId, 'followers', currentUser.uid);
    const followingDocRef = doc(db, 'users', currentUser.uid, 'following', userId);

    const docSnap = await getDoc(followerDocRef);
    const alreadyFollowing = docSnap.exists();

    if (alreadyFollowing) {
      // Takipten çıkar
      await deleteDoc(followerDocRef);
      await deleteDoc(followingDocRef);
      setIsFollowing(false);
      setFollowers((prev) => prev.filter((f) => f.uid !== currentUser.uid));
      setFollowersCount((c) => c - 1);
    } else {
      // Takip et
      await setDoc(followerDocRef, { followedAt: serverTimestamp() });
      await setDoc(followingDocRef, { followedAt: serverTimestamp() });
      setIsFollowing(true);
      setFollowers((prev) => [...prev, { uid: currentUser.uid, username: currentUser.displayName || 'Sen' }]);
      setFollowersCount((c) => c + 1);
    }
  } catch (error: any) {
    console.error('Takip işlemi hatası:', error);
    alert('Takip işlemi sırasında hata oluştu: ' + (error.message || JSON.stringify(error)));
  }
};

  const goToFollowers = () => {
    if (!followersAllowed && currentUser?.uid !== userId) {
      alert('Kullanıcı takipçi listesini gizli tutuyor.');
      return;
    }
    navigation.navigate('Followers', { userId });
  };
  const goToFollowing = () => navigation.navigate('Following', { userId });

  const goToProductDetail = (product: Product) => {
    navigation.navigate('ProductDetail', { product });
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.primary} />;
  }

  if (isPrivate && currentUser?.uid !== userId && !isFollowing) {
    // Gizli hesap ve takip etmiyorsa erişim engellendi
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {userData?.profilePicture ? (
            <Image source={{ uri: userData.profilePicture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.border }]} />
          )}
          <Text style={[styles.username, { color: colors.text }]}>{userData?.username || 'Kullanıcı'}</Text>
          <Text style={[styles.bio, { color: colors.text }]}>{userData?.bio || 'Açıklama yok.'}</Text>

          <Text style={[styles.accessDeniedText, { marginTop: 30, textAlign: 'center', color: colors.notification }]}>
            Bu hesap gizli. Ürünlerini ve takipçilerini görebilmek için takipçi olmalısınız.
          </Text>

          <TouchableOpacity onPress={toggleFollow} style={[styles.followButton, { backgroundColor: colors.primary }]}>
            <Text style={[styles.followText, { color: colors.background }]}>{isFollowing ? 'Takibi Bırak' : 'Takip Et'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {userData?.profilePicture ? (
          <Image source={{ uri: userData.profilePicture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.border }]} />
        )}
        <Text style={[styles.username, { color: colors.text }]}>{userData?.username || 'Kullanıcı'}</Text>
        <Text style={[styles.bio, { color: colors.text }]}>{userData?.bio || 'Açıklama yok.'}</Text>

        <View style={styles.countBox}>
          <TouchableOpacity style={styles.countItem} onPress={goToFollowers}>
            <Text style={[styles.countNumber, { color: colors.text }]}>{followersCount}</Text>
            <Text style={[styles.countLabel, { color: colors.text }]}>Takipçi</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.countItem} onPress={goToFollowing}>
            <Text style={[styles.countNumber, { color: colors.text }]}>{followingCount}</Text>
            <Text style={[styles.countLabel, { color: colors.text }]}>Takip</Text>
          </TouchableOpacity>
        </View>

        {/* Eğer takipçi ayarı kapalıysa takip butonunu ve takipçi sayısını gizle */}
        {!followersAllowed && currentUser?.uid !== userId ? (
          <Text style={{ textAlign: 'center', color: colors.notification, marginVertical: 10 }}>
            Kullanıcı takipçi listesini gizli tutuyor.
          </Text>
        ) : (
          <TouchableOpacity onPress={toggleFollow} style={[styles.followButton, { backgroundColor: colors.primary }]}>
            <Text style={[styles.followText, { color: colors.background }]}>{isFollowing ? 'Takibi Bırak' : 'Takip Et'}</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Ürünleri</Text>
        {products.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.text }]}>Henüz ürün eklememiş.</Text>
        ) : (
          <FlatList
            data={products}
            numColumns={2}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.productList}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => goToProductDetail(item)} style={[styles.productCard, { borderColor: colors.border }]}>
                <Image source={{ uri: item.imageUrl || item.image }} style={styles.productImage} />
                <Text numberOfLines={1} style={[styles.productTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default OtherProfileScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: { flex: 1, padding: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginBottom: 10 },
  username: { fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  bio: { fontSize: 14, textAlign: 'center', marginBottom: 10 },
  followButton: {
    padding: 10,
    borderRadius: 6,
    marginTop: 15,
    marginBottom: 15,
    alignSelf: 'center',
  },
  followText: { fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  emptyText: { textAlign: 'center' },
  productList: { gap: 15 },
  productCard: {
    flex: 1,
    margin: 5,
    borderWidth: 1,
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
  },
  accessDeniedText: {
    fontSize: 16,
  },
});
