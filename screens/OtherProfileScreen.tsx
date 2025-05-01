import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../App'; // RootStackParamList'i doğru import edin
import { RouteProp } from '@react-navigation/native';

type OtherProfileRouteProp = RouteProp<RootStackParamList, 'OtherProfile'>;

const OtherProfileScreen = () => {
  const route = useRoute<OtherProfileRouteProp>();
  const { userId } = route.params; // userId'yi burada alıyoruz

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      // Firestore veya API üzerinden kullanıcı verilerini alabilirsiniz
      try {
        // Örneğin, userId'ye göre kullanıcı verilerini çekebilirsiniz
        const response = await fetch(`https://api.example.com/users/${userId}`);
        const data = await response.json();
        setUserData(data);
      } catch (error) {
        console.error('Kullanıcı verisi alınırken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#666" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri: userData?.profilePicture }} style={styles.avatar} />
      <Text style={styles.username}>{userData?.username}</Text>
      <Text>{userData?.fullName}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default OtherProfileScreen;
