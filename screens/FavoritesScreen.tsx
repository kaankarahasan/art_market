import React from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native'; // Dimensions burada import edilecek
import { useFavorites } from '../contexts/FavoritesContext';
import { Ionicons } from '@expo/vector-icons';

const numColumns = 2;
const itemSize = Dimensions.get('window').width / numColumns - 20;

const FavoritesScreen = () => {
  const { favorites, removeFromFavorites } = useFavorites();

  // Her bir öğe için render fonksiyonu
  const renderItem = ({ item }: { item: typeof favorites[0] }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <Text style={styles.title}>{item.title}</Text>
      <TouchableOpacity
        onPress={() => removeFromFavorites(item.id)}
        style={styles.favoriteButton}
      >
        <Ionicons name="close-circle" size={20} color="red" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {favorites.length === 0 ? (
        <Text style={styles.emptyText}>No favorites yet!</Text>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ padding: 10 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  card: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    width: itemSize,
    alignItems: 'center',
    padding: 10,
  },
  image: {
    width: itemSize - 20,
    height: itemSize - 20,
    borderRadius: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    color: '#333',
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
});

export default FavoritesScreen;
