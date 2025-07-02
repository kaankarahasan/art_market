import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Button, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../App'; // Doğru import işlemi
import { RouteProp } from '@react-navigation/native';
import { useFavorites } from '../contexts/FavoritesContext';

// useRoute için doğru parametre tipi
type UserProfileScreenRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;

const UserProfileScreen = () => {
  const { params } = useRoute<UserProfileScreenRouteProp>(); // Parametreyi doğru tip ile alıyoruz
  const { user } = params;
  const [userData, setUserData] = useState<any>(user);
  const { favorites, addToFavorites, removeFromFavorites } = useFavorites();

  const isFavorite = favorites.some((fav) => fav.id === userData.id);

  useEffect(() => {
    if (user) {
      setUserData(user);
    }
  }, [user]);

  const handleFavoriteToggle = () => {
    if (isFavorite) {
      removeFromFavorites(userData.id);
    } else {
      addToFavorites(userData);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileHeader}>
        <Image source={{ uri: userData.avatarUrl }} style={styles.profileImage} />
        <Text style={styles.username}>{userData.name}</Text>
        <Text style={styles.fullName}>{userData.fullName}</Text>
        <Text style={styles.bio}>{userData.bio || 'No bio available'}</Text>
      </View>

      <Button
        title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        onPress={handleFavoriteToggle}
      />

      {/* Additional sections for user's artwork, posts, etc. can be added here */}
    </ScrollView>
  );
};

export default UserProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  fullName: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  bio: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginBottom: 20,
  },
});
