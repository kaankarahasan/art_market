import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { useFavorites } from '../contexts/FavoritesContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

const numColumns = 2;
const itemSize = Dimensions.get('window').width / numColumns - 20;

const HomeScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { favorites, addToFavorites, removeFromFavorites } = useFavorites();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchRandomProducts = async () => {
      try {
        setLoading(true);
        const productsRef = collection(db, 'products');
        const q = query(productsRef, where('isSold', '==', false), limit(50));
        const snapshot = await getDocs(q);

        let productsArray = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Shuffle products
        for (let i = productsArray.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [productsArray[i], productsArray[j]] = [productsArray[j], productsArray[i]];
        }

        setProducts(productsArray);
      } catch (error) {
        console.error('Ürünler alınırken hata:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRandomProducts();
  }, []);

  // Arama filtreleme: ürün başlığı ve açıklamasında arama yap
  const filteredProducts = products.filter(product =>
    product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: any }) => {
    const isFavorite = favorites.some(fav => fav.id === item.id);

    return (
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => navigation.navigate('ProductDetail', { product: item })}
          activeOpacity={0.7}
        >
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.image} />
          ) : (
            <View style={[styles.image, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text>Resim yok</Text>
            </View>
          )}
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => (isFavorite ? removeFromFavorites(item.id) : addToFavorites(item))}
          style={styles.favoriteButton}
        >
          <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={22} color="red" />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#666" />
      </View>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <View style={[styles.emptyContainer, { paddingTop: insets.top }]}>
        <Text>Aradığınız ürün bulunamadı.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TextInput
        style={styles.searchBox}
        placeholder="Ürünlerde ara..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        clearButtonMode="while-editing"
      />
      <FlatList
        data={filteredProducts}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        numColumns={numColumns}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{ padding: 10, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default HomeScreen;

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
    position: 'relative',
  },
  image: {
    width: itemSize - 20,
    height: itemSize - 20,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#ddd',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  desc: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  favoriteButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  searchBox: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 20,
    marginHorizontal: 15,
    paddingHorizontal: 12,
    marginBottom: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
