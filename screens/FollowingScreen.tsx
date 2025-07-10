import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes/types';
import { getAuth } from 'firebase/auth';

type User = {
  uid: string;
  username?: string;
  email?: string;
};

const FollowingScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId } = route.params;

  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const auth = getAuth();
  const currentUser = auth.currentUser;

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
            fetchedFollowing.push({
              uid: followingId,
              username: userDoc.data().username,
              email: userDoc.data().email,
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Takip Ettiklerin</Text>
      {following.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {userId === currentUser?.uid
              ? 'Henüz kimseyi takip etmiyorsunuz.'
              : 'Bu kullanıcı henüz kimseyi takip etmiyor.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={following}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                item.uid === currentUser?.uid
                  ? navigation.navigate('Profile', {})
                  : navigation.navigate('OtherProfile', { userId: item.uid })
              }
              style={styles.userCard}
            >
              <Text style={styles.username}>{item.username || item.email}</Text>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

export default FollowingScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  userCard: {
    padding: 12,
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    marginBottom: 10,
  },
  username: { fontSize: 16 },
  emptyText: {
    marginTop: 30,
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
});
