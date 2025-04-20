import React, { useLayoutEffect } from 'react';
import { View, Text, Image, StyleSheet, Button } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../App';


type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

const ProductDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<ProductDetailRouteProp>();
  const { product } = route.params;

  useLayoutEffect(() => {
    // ProductDetailScreen açıldığında alt barı göster
    navigation.setOptions({
      tabBarStyle: { display: 'flex' }, // Alt barı göster
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image source={{ uri: product.image }} style={styles.image} />
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
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
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
