import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
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

  const handleUserPress = (uid: string) => {
    if (uid === currentUser?.uid) {
      navigation.navigate('Profile', {}); // userId opsiyonel
    } else {
      navigation.navigate('OtherProfile', { userId: uid });
    }
  };

  useEffect(() => {
    const fetchFollowersData = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          throw new Error('Kullanıcı bulunamadı');
        }

        const followerIds: string[] = userSnap.data().followers || [];

        const followersData = await Promise.all(
          followerIds.map(async (followerId) => {
            const snap = await getDoc(doc(db, 'users', followerId));
            if (snap.exists()) {
              return {
                uid: followerId,
                username: snap.data().username,
                email: snap.data().email,
              };
            }
            return null;
          })
        );

        setFollowers(followersData.filter(Boolean) as User[]);
      } catch (err) {
        console.error('Takipçi verisi alınamadı:', err);
        setError('Takipçi verisi alınamadı');
      } finally {
        setLoading(false);
      }
    };

    fetchFollowersData();
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
    <Text style={styles.header}>Takipçiler</Text>
    {followers.length === 0 ? (
      <View style={styles.center}>
        <Text style={{ fontSize: 16, color: '#555', textAlign: 'center' }}>
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
            style={styles.userCard}
          >
            <Text style={styles.username}>{item.username || item.email}</Text>
          </TouchableOpacity>
        )}
      />
    )}
  </View>
  );
};

export default FollowersScreen;

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
  }
});
