import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { onSnapshot, collection, doc, getDoc } from '@react-native-firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { RootStackParamList } from '../routes/types';
import { useThemeContext } from '../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useLanguage } from '../contexts/LanguageContext';

type User = {
  uid: string;
  username?: string;
  email?: string;
  photoURL?: string;
};

type FollowingScreenRouteProp = RouteProp<RootStackParamList, 'Following'>;
type FollowingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Following'>;

const FollowingScreen = () => {
  const route = useRoute<FollowingScreenRouteProp>();
  const navigation = useNavigation<FollowingScreenNavigationProp>();
  const { userId } = route.params;

  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUser = auth.currentUser;
  const { colors } = useThemeContext();
  const { t } = useLanguage();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(collection(db, 'users', userId, 'following'),
      async (snapshot) => {
        const fetchedFollowing: User[] = [];

        for (const docSnap of snapshot.docs) {
          const followingId = docSnap.id;
          const userDoc = await getDoc(doc(db, 'users', followingId));
          if (userDoc.exists()) {
            const data = userDoc.data() as any;
            if (data) {
              fetchedFollowing.push({
                uid: followingId,
                username: data.username,
                email: data.email,
                photoURL: data.photoURL || data.profileImage,
              });
            }
          }
        }

        setFollowing(fetchedFollowing);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Takip edilenler alınamadı:', err);
        setError('Takip edilenler alınamadı');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 8 }}>Yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back-ios" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('followingTitle')}</Text>
      </View>
      <View style={styles.center}>
        <Text style={{ color: colors.text }}>{error}</Text>
      </View>
    </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back-ios" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('followingTitle')}</Text>
      </View>

      {following.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {userId === currentUser?.uid
              ? 'Henüz kimseyi takip etmiyorsunuz.'
              : 'Bu kullanıcı henüz kimseyi takip etmiyor.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={following}
          keyExtractor={(item) => item.uid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.userCard, { backgroundColor: colors.card }]}
              onPress={() =>
                item.uid === currentUser?.uid
                  ? navigation.navigate('Profile', {})
                  : navigation.navigate('OtherProfile', { userId: item.uid })
              }
            >
              <Image
                source={
                  item.photoURL
                    ? { uri: item.photoURL }
                    : require('../assets/default-avatar.png')
                }
                style={styles.avatar}
              />
              <Text style={[styles.username, { color: colors.text }]}>
                {item.username || item.email || 'Bilinmeyen'}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default FollowingScreen;

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  username: { fontSize: 16 },
  emptyText: {
    marginTop: 30,
    textAlign: 'center',
    fontSize: 16,
  },
});
