import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { RootStackParamList } from '../routes/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth } from 'firebase/auth';


type User = {
  uid: string;
  username?: string;
  email?: string;
};

const FollowingScreen = () => {
  const route = useRoute<any>(); // RootStackParamList'ten tip alabilirsin
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { userId } = route.params;

  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchFollowingData = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          throw new Error('Kullanıcı bulunamadı');
        }

        const followingIds: string[] = userSnap.data().following || [];

        const followingData = await Promise.all(
          followingIds.map(async (uid) => {
            const snap = await getDoc(doc(db, 'users', uid));
            if (snap.exists()) {
              return {
                uid,
                username: snap.data().username,
                email: snap.data().email,
              };
            }
            return null;
          })
        );

        setFollowing(followingData.filter(Boolean) as User[]);
      } catch (err) {
        console.error('Takip edilen verisi alınamadı:', err);
        setError('Takip edilen verisi alınamadı');
      } finally {
        setLoading(false);
      }
    };

    fetchFollowingData();
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
            onPress={() => navigation.navigate('OtherProfile', { userId: item.uid })}
            style={styles.item}
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
  item: {
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
  }
});
