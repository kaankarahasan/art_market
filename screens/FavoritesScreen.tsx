import React, { useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useFavorites } from '../contexts/FavoritesContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList, Product } from '../routes/types';
import { ThemeContext } from '../contexts/ThemeContext';

const numColumns = 2;
const itemSize = Dimensions.get('window').width / numColumns - 20;

const FavoritesScreen = () => {
  const { favorites, removeFromFavorites } = useFavorites();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { isDarkTheme, colors } = useContext(ThemeContext);

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: isDarkTheme ? colors.card : '#f0f0f0' }]}
      onPress={() => navigation.navigate('ProductDetail', { product: item })}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.image} />
      <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
      <TouchableOpacity
        onPress={() => removeFromFavorites(item.id)}
        style={styles.favoriteButton}
      >
        <Ionicons name="close-circle" size={20} color="red" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: colors.background },
      ]}
    >
      {favorites.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.text }]}>
          No favorites yet!
        </Text>
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
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  card: {
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
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
});

export default FavoritesScreen;
