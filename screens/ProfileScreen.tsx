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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { followUser, unfollowUser } from '../firebaseService';
import { RootStackParamList } from '../App'; // route tipleri

type ProfileRouteProp = RouteProp<RootStackParamList, 'Profile'>; // Eğer Profile ekranını stack’e eklediyseniz

const ProfileScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<ProfileRouteProp>();
  const auth = getAuth();
  const firestore = getFirestore();
  const insets = useSafeAreaInsets();

  const currentUser = auth.currentUser;
  // eğer route.params.userId yoksa kendi uid’imizi kullan
  const profileId = route.params?.userId ?? currentUser?.uid;
  if (!profileId) {
    // ikisi de yoksa render edilecek basit hata
    return <View><Text>Kullanıcı bulunamadı.</Text></View>;
  }

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isImageModalVisible, setImageModalVisible] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);

  useEffect(() => {
    const ownUid = currentUser!.uid;
    const ownRef = doc(firestore, 'users', ownUid);
    const targetRef = doc(firestore, 'users', profileId);

    const fetchAll = async () => {
      try {
        // --- 1) Kendi profil verisi ---
        const ownSnap = await getDoc(ownRef);
        const ownData = ownSnap.data() || {};
        setUserData(ownData);

        // --- 2) Takip durumu ---
        const ownFollowing = Array.isArray(ownData.following) ? ownData.following : [];
        setIsFollowing(ownFollowing.includes(profileId));

        // --- 3) Hedef profilin followers/following ---
        const targetSnap = await getDoc(targetRef);
        const targetData = targetSnap.data() || {};
        setFollowers(Array.isArray(targetData.followers) ? targetData.followers : []);
        setFollowing(Array.isArray(targetData.following) ? targetData.following : []);
      } catch (err) {
        console.error('Profil verisi alınırken hata:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [firestore, currentUser, profileId]);

  const goToSettings = () => navigation.navigate('Settings' as never);
  const toggleImageModal = () => setImageModalVisible(v => !v);

  const handleFollow = async () => {
    if (!currentUser) return;
    try {
      if (isFollowing) {
        await unfollowUser(profileId);
        setIsFollowing(false);
        setFollowers(prev => prev.filter(id => id !== currentUser.uid));
      } else {
        await followUser(profileId);
        setIsFollowing(true);
        setFollowers(prev => [...prev, currentUser.uid]);
      }
    } catch (err) {
      console.error('Takip işlemi hatası:', err);
    }
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
      <TouchableOpacity
        style={[styles.settingsIcon, { top: insets.top + 10 }]}
        onPress={goToSettings}
      >
        <Icon name="settings-outline" size={28} color="#000" />
      </TouchableOpacity>

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

      <View style={styles.followButtonContainer}>
        <TouchableOpacity style={styles.followButton} onPress={handleFollow}>
          <Text style={styles.followButtonText}>
            {isFollowing ? 'Takipten Çık' : 'Takip Et'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Takipçiler</Text>
        {followers.length > 0 ? (
          <FlatList
            data={followers}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <Text>{item}</Text>
              </View>
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
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <View style={styles.listItem}>
                <Text>{item}</Text>
              </View>
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
  listContainer: { marginTop: 20, paddingHorizontal: 15 },
  listTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  listItem: { paddingVertical: 10 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageWrapper: { borderRadius: 100, overflow: 'hidden' },
  modalImage: { width: 200, height: 200, borderRadius: 100 },
});
