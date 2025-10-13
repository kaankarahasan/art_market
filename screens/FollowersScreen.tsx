import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { RootStackParamList } from '../routes/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth } from 'firebase/auth';
import { useThemeContext } from '../contexts/ThemeContext';

type User = {
  uid: string;
  username?: string;
  email?: string;
};

type FollowersScreenRouteProp = RouteProp<RootStackParamList, 'Followers'>;
type FollowersScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Followers'>;

const FollowersScreen = () => {
  const route = useRoute<FollowersScreenRouteProp>();
  const navigation = useNavigation<FollowersScreenNavigationProp>();
  const { userId } = route.params;

  const [followers, setFollowers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  const { colors } = useThemeContext();

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'users', userId, 'followers'),
      async (snapshot) => {
        const fetchedFollowers: User[] = [];

        for (const docSnap of snapshot.docs) {
          const followerId = docSnap.id;
          const userDoc = await getDoc(doc(db, 'users', followerId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            fetchedFollowers.push({
              uid: followerId,
              username: data.username,
              email: data.email,
            });
          }
        }

        setFollowers(fetchedFollowers);
        setLoading(false);
      },
      (err) => {
        console.error('Takipçi verisi alınamadı:', err);
        setError('Takipçi verisi alınamadı');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text }}>Yükleniyor...</Text>
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
      <Text style={[styles.header, { color: colors.text }]}>Takipçiler</Text>

      {followers.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {currentUser?.uid === userId
              ? 'Henüz takipçin yok.'
              : 'Bu kullanıcının henüz takipçisi yok.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={followers}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                item.uid === currentUser?.uid
                  ? navigation.navigate('Profile', {})
                  : navigation.navigate('OtherProfile', { userId: item.uid })
              }
              style={[styles.userCard, { backgroundColor: colors.card }]}
            >
              <Text style={[styles.username, { color: colors.text }]}>
                {item.username || item.email}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

export default FollowersScreen;

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
