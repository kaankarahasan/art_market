import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../firebase';
import { RootStackParamList } from '../routes/types';
import { useThemeContext } from '../contexts/ThemeContext';

type User = {
  uid: string;
  username?: string;
  email?: string;
};

// Route ve Navigation tipleri
type FollowingScreenRouteProp = RouteProp<RootStackParamList, 'Following'>;
type FollowingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Following'>;

const FollowingScreen = () => {
  const route = useRoute<FollowingScreenRouteProp>();
  const navigation = useNavigation<FollowingScreenNavigationProp>();
  const { userId } = route.params;

  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  const { colors } = useThemeContext();

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(
      collection(db, 'users', userId, 'following'),
      async (snapshot) => {
        const fetchedFollowing: User[] = [];

        for (const docSnap of snapshot.docs) {
          const followingId = docSnap.id;
          const userDoc = await getDoc(doc(db, 'users', followingId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            fetchedFollowing.push({
              uid: followingId,
              username: data.username,
              email: data.email,
            });
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
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text }]}>Takip Ettiklerin</Text>

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
                  ? navigation.navigate('Profile', {}) // <-- Burayı düzelttik
                  : navigation.navigate('OtherProfile', { userId: item.uid })
              }
            >
              <Text style={[styles.username, { color: colors.text }]}>
                {item.username || item.email || 'Bilinmeyen'}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

export default FollowingScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  userCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  username: { fontSize: 16 },
  emptyText: {
    marginTop: 30,
    textAlign: 'center',
    fontSize: 16,
  },
});
