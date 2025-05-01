import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';

type User = {
  id: string;
  name: string;
};

const FollowersScreen = () => {
  const [followers, setFollowers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFollowersData();
  }, []);

  const fetchFollowersData = async () => {
    try {
      // API'den gelen verinin doğruluğunu test etmek için örnek bir veri kullanıyorum
      const response = [
        { id: '1', name: 'John Doe' },
        { id: '2', name: 'Jane Smith' },
        { id: '3', name: 'Alice Johnson' },
      ];

      console.log('Followers Data:', response);  // Gelen veriyi konsola yazdırıyoruz

      // API'den gelen verinin doğru formatta olup olmadığını kontrol edelim
      if (!Array.isArray(response)) {
        throw new Error('Followers verisi dizi formatında değil');
      }

      setFollowers(response);
      setLoading(false);
    } catch (err) {
      console.error('Takipçi verisi alınamadı:', err);
      setError('Takipçi verisi alınamadı');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <View>
      <Text>Takipçi Listesi:</Text>
      <FlatList
        data={followers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View>
            <Text>{item.name}</Text>
          </View>
        )}
      />
    </View>
  );
};

export default FollowersScreen;
