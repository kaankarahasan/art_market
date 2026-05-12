import React, { useState, useCallback, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';

import {
  useNavigation,
  useRoute,
  RouteProp,
  NavigationProp,
} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import { doc, getDoc, onSnapshot, query, collection, where, getDocs } from '@react-native-firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../routes/types';
import { ThemeContext } from '../contexts/ThemeContext';
import ImageViewer from 'react-native-image-zoom-viewer';
import { useFavoriteItems } from '../contexts/FavoritesContext';
import { useLanguage } from '../contexts/LanguageContext';
import GlobalMasonryList from '../components/GlobalMasonryList';

const { width: screenWidth } = Dimensions.get('window');

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

  const { colors } = useContext(ThemeContext);
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { t } = useLanguage();

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [followers, setFollowers] = useState<UserInfo[]>([]);
  const [following, setFollowing] = useState<UserInfo[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedTab, setSelectedTab] = useState<'Artworks' | 'About'>('Artworks');
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const isOwnProfile = profileId === currentUser?.uid;

  useEffect(() => {
    if (!profileId) return;

    const unsubFollowers = onSnapshot(collection(db, 'users', profileId, 'followers'), async (snapshot) => {
      const data = await Promise.all(
        snapshot.docs.map(async (docSnap: any) => {
          const userSnap = await getDoc(doc(db, 'users', docSnap.id));
          return { uid: docSnap.id, username: userSnap.data()?.username || 'Unknown' };
        })
      );
      setFollowers(data);
    });

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

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  const renderHeader = () => (
    <View style={{ backgroundColor: colors.background }}>
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
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlobalMasonryList
        data={selectedTab === 'Artworks' ? products : []}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          selectedTab === 'About' ? (
            <View style={{ paddingHorizontal: 16, marginTop: 20, paddingBottom: 50 }}>
              <Text style={{ color: colors.secondaryText, fontSize: 14 }}>
                {userData?.bio || t('noBio')}
              </Text>
            </View>
          ) : (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: colors.secondaryText, textAlign: 'center' }}>{t('noArtworksYet')}</Text>
            </View>
          )
        }
        showSoldBadge
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: 80 + insets.bottom,
        }}
      />

      <FullScreenImageModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        imageUrl={userData?.photoURL || ''}
      />
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerUsername: { fontSize: 24, fontWeight: 'bold', color: colors.text },
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
  profileImage: { width: 90, height: 90, borderRadius: 12 },
  profileInfo: { flex: 1, marginLeft: 14, justifyContent: 'center', alignItems: 'flex-start' },
  fullNameText: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 8, width: '100%' },
  followStatItemRow: { alignItems: 'center' },
  followNumber: { fontSize: 14, fontWeight: 'bold', color: colors.text },
  followLabel: { fontSize: 14, color: colors.secondaryText },
  followStatsContainer: { flexDirection: 'row', justifyContent: 'flex-start', gap: 24, width: '80%' },
  tabRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border || '#E0E0E0' },
  tabItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 6, justifyContent: 'center', flex: 1 },
  activeTabLarge: { borderBottomWidth: 2, borderBottomColor: colors.text },
  tabText: { fontSize: 14, color: colors.secondaryText, fontWeight: '600' },
});

export default ProfileScreen;