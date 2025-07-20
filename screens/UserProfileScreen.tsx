import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../routes/types';
import { useFavorites } from '../contexts/FavoritesContext';
import { useThemeContext } from '../contexts/ThemeContext';

type UserProfileScreenRouteProp = RouteProp<RootStackParamList, 'UserProfile'>;

const UserProfileScreen = () => {
  const { colors } = useThemeContext();

  const { params } = useRoute<UserProfileScreenRouteProp>();
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
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.profileHeader}>
        <Image source={{ uri: userData.avatarUrl }} style={styles.profileImage} />
        <Text style={[styles.username, { color: colors.text }]}>{userData.name}</Text>
        <Text style={[styles.fullName, { color: colors.text }]}>{userData.fullName}</Text>
        <Text style={[styles.bio, { color: colors.text }]}>
          {userData.bio || 'No bio available'}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.favoriteButton,
          { backgroundColor: isFavorite ? colors.notification : colors.primary },
        ]}
        onPress={handleFavoriteToggle}
      >
        <Text style={styles.favoriteButtonText}>
          {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
        </Text>
      </TouchableOpacity>

      {/* İstersen buraya kullanıcının artwork, post vs. bölümleri ekleyebilirsin */}
    </ScrollView>
  );
};

export default UserProfileScreen;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
  },
  fullName: {
    fontSize: 18,
    marginBottom: 10,
  },
  bio: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  favoriteButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  favoriteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
