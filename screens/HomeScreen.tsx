import React, { useState, useEffect, useCallback } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes/types';
import { useFavorites } from '../contexts/FavoritesContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

const numColumns = 2;
const itemSize = Dimensions.get('window').width / numColumns - 20;

const HomeScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { favorites, addToFavorites, removeFromFavorites } = useFavorites();
  const insets = useSafeAreaInsets();

  // Hem ürün hem kullanıcıları her odaklandığında yenile
  useFocusEffect(
    useCallback(() => {
      const fetchData = async () => {
        try {
          setLoading(true);

          const productSnap = await getDocs(
            query(collection(db, 'products'), where('isSold', '==', false), limit(50))
          );
          const productList = productSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setProducts(shuffleArray(productList));

          const userSnap = await getDocs(collection(db, 'users'));
          const userList = userSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setUsers(userList);
        } catch (error) {
          console.error('Veriler alınırken hata:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }, [])
  );

  const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const filteredProducts = products.filter(product =>
    product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(user => {
    const queryLower = searchQuery.toLowerCase();
    const usernameMatch = user.username?.toLowerCase().includes(queryLower);
    const fullNameMatch = user.fullName?.toLowerCase().includes(queryLower);
    return usernameMatch || fullNameMatch;
  });

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

  const renderUser = ({ item }: { item: any }) => {
    const currentUser = auth.currentUser;

    const handlePress = () => {
      if (!currentUser) return;

      if (item.id === currentUser.uid) {
        navigation.navigate('Profile' as never);
      } else {
        navigation.navigate('OtherProfile', { userId: item.id });
      }
    };

    return (
      <TouchableOpacity onPress={handlePress} style={styles.userCard}>
        <Image
          source={item.profilePicture ? { uri: item.profilePicture } : require('../assets/default-avatar.png')}
          style={styles.userAvatar}
        />
        <View>
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.fullName}>{item.fullName}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TextInput
        style={styles.searchBox}
        placeholder="Ürün veya kullanıcı ara..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        clearButtonMode="while-editing"
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#666" />
        </View>
      ) : (
        <>
          {searchQuery.length > 0 && filteredUsers.length > 0 && (
            <View style={styles.userListContainer}>
              <Text style={styles.sectionTitle}>Kullanıcılar</Text>
              <FlatList
                data={filteredUsers}
                renderItem={renderUser}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
              />
            </View>
          )}

          {filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text>Aradığınız ürün bulunamadı.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              renderItem={renderItem}
              keyExtractor={item => item.id.toString()}
              numColumns={numColumns}
              columnWrapperStyle={styles.row}
              contentContainerStyle={{ padding: 10, paddingBottom: 30 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchBox: {
    margin: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  card: {
    backgroundColor: '#f9f9f9',
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
  title: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  desc: { fontSize: 12, color: '#555' },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 50,
  },
  userListContainer: {
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eee',
    padding: 10,
    marginRight: 10,
    borderRadius: 8,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  fullName: {
    fontSize: 12,
    color: '#555',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
});
