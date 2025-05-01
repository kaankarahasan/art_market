import React, { useEffect, useState } from 'react';
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
} from 'firebase/firestore';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { followUser, unfollowUser } from '../firebaseService';
import { RootStackParamList } from '../App';

type ProfileRouteProp = RouteProp<RootStackParamList, 'Profile'>;

// Kullanıcı tipi tanımı
type UserInfo = {
  uid: string;
  username: string;
};

const ProfileScreen = () => {
  // Navigation tipi tanımı yapılıyor (önemli)
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<ProfileRouteProp>();
  const auth = getAuth();
  const firestore = getFirestore();
  const insets = useSafeAreaInsets();

  const currentUser = auth.currentUser;
  const profileId = route.params?.userId ?? currentUser?.uid;

  if (!profileId) {
    return (
      <View>
        <Text>Kullanıcı bulunamadı.</Text>
      </View>
    );
  }

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isImageModalVisible, setImageModalVisible] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState<UserInfo[]>([]);
  const [following, setFollowing] = useState<UserInfo[]>([]);
  const [soldCount, setSoldCount] = useState(0);

  const isOwnProfile = profileId === currentUser?.uid;

  useEffect(() => {
    const ownUid = currentUser!.uid;
    const ownRef = doc(firestore, 'users', ownUid);
    const targetRef = doc(firestore, 'users', profileId);

    const fetchAll = async () => {
      try {
        const ownSnap = await getDoc(ownRef);
        const ownData = ownSnap.data() || {};
        setUserData(ownData);

        const ownFollowing = Array.isArray(ownData.following) ? ownData.following : [];
        setIsFollowing(ownFollowing.includes(profileId));

        const targetSnap = await getDoc(targetRef);
        const targetData = targetSnap.data() || {};

        const followerIds: string[] = Array.isArray(targetData.followers) ? targetData.followers : [];
        const followingIds: string[] = Array.isArray(targetData.following) ? targetData.following : [];

        // UID listesine göre kullanıcı bilgilerini getirir
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

        const productsRef = collection(firestore, 'products');
        const q = query(productsRef, where('ownerId', '==', profileId), where('isSold', '==', true));
        const querySnapshot = await getDocs(q);
        setSoldCount(querySnapshot.size);
      } catch (err) {
        console.error('Profil verisi alınırken hata:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [firestore, currentUser, profileId]);

  // Ayarlar sayfasına yönlendirme
  const goToSettings = () => navigation.navigate('Settings');

  // Satılan ürünler sayfasına yönlendirme
  const goToSold = () => navigation.navigate('Sold');

  // Profil fotoğrafı modalını aç/kapat
  const toggleImageModal = () => setImageModalVisible((v) => !v);

  // Takip/çık işlemi
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

  // Diğer profil sayfasına yönlendirme
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
      {isOwnProfile && (
        <TouchableOpacity
          style={[styles.settingsIcon, { top: insets.top + 10 }]}
          onPress={goToSettings}
        >
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

      {!isOwnProfile && (
        <View style={styles.followButtonContainer}>
          <TouchableOpacity style={styles.followButton} onPress={handleFollow}>
            <Text style={styles.followButtonText}>
              {isFollowing ? 'Takipten Çık' : 'Takip Et'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.soldBox} onPress={goToSold}>
        <Text style={styles.soldText}>Satılanlar: {soldCount}</Text>
      </TouchableOpacity>

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Takipçiler</Text>
        {followers.length > 0 ? (
          <FlatList
            data={followers}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => goToOtherProfile(item.uid)} style={styles.listItem}>
                <Text>@{item.username}</Text>
              </TouchableOpacity>
            )}
          />
        ) : (
          <Text>Henüz takipçi yok.</Text>
        )}
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Takip Edilenler</Text>
        {following.length > 0 ? (
          <FlatList
            data={following}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => goToOtherProfile(item.uid)} style={styles.listItem}>
                <Text>@{item.username}</Text>
              </TouchableOpacity>
            )}
          />
        ) : (
          <Text>Henüz kimseyi takip etmiyorsunuz.</Text>
        )}
      </View>

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

// --- Styles ---
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
  soldText: { fontSize: 16, fontWeight: 'bold' },
  listContainer: { marginTop: 20, paddingHorizontal: 15 },
  listTitle: { fontSize: 18, fontWeight: 'bold' },
  listItem: { paddingVertical: 10 },
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
