import React from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { useFavorites } from '../contexts/FavoritesContext';
import { Ionicons } from '@expo/vector-icons';

const dummyData = [
  { id: '1', title: 'Artwork 1', image: 'https://picsum.photos/id/1015/200/300' },
  { id: '2', title: 'Artwork 2', image: 'https://picsum.photos/id/1016/200/300' },
  { id: '3', title: 'Artwork 3', image: 'https://picsum.photos/id/1018/200/300' },
  { id: '4', title: 'Artwork 4', image: 'https://picsum.photos/id/1020/200/300' },
  { id: '5', title: 'Artwork 5', image: 'https://picsum.photos/id/1021/200/300' },
  { id: '6', title: 'Artwork 6', image: 'https://picsum.photos/id/1024/200/300' },
  { id: '7', title: 'Artwork 7', image: 'https://picsum.photos/id/1025/200/300' },
  { id: '8', title: 'Artwork 8', image: 'https://picsum.photos/id/1027/200/300' },
  { id: '9', title: 'Artwork 9', image: 'https://picsum.photos/id/1033/200/300' },
  { id: '10', title: 'Artwork 10', image: 'https://picsum.photos/id/1035/200/300' },
  { id: '11', title: 'Artwork 11', image: 'https://picsum.photos/id/1037/200/300' },
  { id: '12', title: 'Artwork 12', image: 'https://picsum.photos/id/1039/200/300' },
];

const numColumns = 2;
const itemSize = Dimensions.get('window').width / numColumns - 20;

const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { favorites, addToFavorites, removeFromFavorites } = useFavorites();

  const renderItem = ({ item }: { item: typeof dummyData[0] }) => {
    const isFavorite = favorites.some((fav) => fav.id === item.id);

    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => navigation.navigate('ProductDetail', { product: item })}>
          <Image source={{ uri: item.image }} style={styles.image} />
          <Text style={styles.title}>{item.title}</Text>
        </TouchableOpacity>
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
    <View style={styles.container}>
      <FlatList
        data={dummyData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
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
});
