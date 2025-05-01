import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';

type User = {
  id: string;
  name: string;
};

const FollowingScreen = () => {
  const [following, setFollowing] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFollowingData();
  }, []);

  const fetchFollowingData = async () => {
    try {
      // API'den gelen verinin doğruluğunu test etmek için örnek bir veri kullanıyorum
      const response = [
        { id: '1', name: 'Michael Johnson' },
        { id: '2', name: 'Alice Brown' },
        { id: '3', name: 'Steve Adams' },
      ];

      console.log('Following Data:', response);  // Gelen veriyi konsola yazdırıyoruz

      // API'den gelen verinin doğru formatta olup olmadığını kontrol edelim
      if (!Array.isArray(response)) {
        throw new Error('Following verisi dizi formatında değil');
      }

      setFollowing(response);
      setLoading(false);
    } catch (err) {
      console.error('Takip edilen verisi alınamadı:', err);
      setError('Takip edilen verisi alınamadı');
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
      <Text>Takip Edilenler Listesi:</Text>
      <FlatList
        data={following}
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

export default FollowingScreen;
