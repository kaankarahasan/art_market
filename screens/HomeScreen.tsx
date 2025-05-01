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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';  // Doğru import işlemi
import { useFavorites } from '../contexts/FavoritesContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

const numColumns = 2;
const itemSize = Dimensions.get('window').width / numColumns - 20;

const HomeScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [artworks, setArtworks] = useState<any[]>([]);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();  // Burada da doğru navigation tipi kullanılıyor
  const { favorites, addToFavorites, removeFromFavorites } = useFavorites();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchFirestoreData = async () => {
      try {
        const userSnapshot = await getDocs(collection(db, 'users'));
        const userList = userSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(userList);

        const artworkSnapshot = await getDocs(collection(db, 'artworks'));
        const artworkList = artworkSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setArtworks(artworkList);
      } catch (error) {
        console.error('Firestore veri çekme hatası:', error);
      }
    };

    fetchFirestoreData();
  }, []);

  const filteredData = [
    ...artworks.filter(
      (item) =>
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.artistName?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    ...users.filter(
      (user) =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  ];

  const renderItem = ({ item }: { item: any }) => {
    const isFavorite = favorites.some((fav) => fav.id === item.id);

    return (
      <View style={styles.card}>
        {item.title ? (
          <TouchableOpacity onPress={() => navigation.navigate('ProductDetail', { product: item })}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <Text style={styles.title}>{item.title}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { user: item })}>
            <Image source={{ uri: item.avatarUrl }} style={styles.image} />
            <Text style={styles.title}>{item.name}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => (isFavorite ? removeFromFavorites(item.id) : addToFavorites(item))}
          style={styles.favoriteButton}
        >
          <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color="red" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TextInput
        style={styles.searchBox}
        placeholder="Search for artworks or users..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={numColumns}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{ padding: 10 }}
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
    paddingHorizontal: 10,
    marginBottom: 15,
  },
});
