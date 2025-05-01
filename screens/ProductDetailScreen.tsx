import React, { useLayoutEffect } from 'react';
import { View, Text, Image, StyleSheet, Button, TouchableOpacity } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../App';
import { Ionicons } from '@expo/vector-icons';
import { useFavorites } from '../contexts/FavoritesContext';

type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

const ProductDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<ProductDetailRouteProp>();
  const { product } = route.params;
  const { favorites, addToFavorites, removeFromFavorites } = useFavorites();

  const isFavorite = favorites.some((fav) => fav.id === product.id);

  useLayoutEffect(() => {
    navigation.setOptions({
      tabBarStyle: { display: 'flex' },
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image source={{ uri: product.image }} style={styles.image} />
      <TouchableOpacity
        onPress={() => (isFavorite ? removeFromFavorites(product.id) : addToFavorites(product))}
        style={styles.favoriteButton}
      >
        <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color="red" />
      </TouchableOpacity>
      <Text style={styles.title}>{product.title}</Text>
      <Text style={styles.seller}>👤 Seller: {product.seller || "John Doe"}</Text>
      <Text style={styles.description}>
        {product.description || "This is a beautiful artwork created with passion and creativity."}
      </Text>
      <Button title="← Back to Gallery" onPress={() => navigation.goBack()} />
    </View>
  );
};

export default ProductDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
  favoriteButton: {
    position: 'absolute',
    top: 30,
    right: 30,
    backgroundColor: '#ffffffcc',
    padding: 8,
    borderRadius: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 10,
  },
  seller: {
    fontSize: 16,
    color: '#888',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: '#333',
    marginBottom: 30,
  },
});
