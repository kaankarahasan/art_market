import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useFavorites } from '../contexts/FavoritesContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../routes/types';
import { ThemeContext } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const screenWidth = Dimensions.get('window').width;
const columnWidth = (screenWidth - 70) / 2;

const FavoritesScreen = () => {
  const { favorites, removeFromFavorites } = useFavorites();
  const { colors } = useContext(ThemeContext);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [imageHeights, setImageHeights] = useState<{ [key: string]: number }>({});

  const handleImageLoad = (productId: string, width: number, height: number) => {
    const imageWidth = columnWidth - 20;
    const aspectRatio = height / width;
    const calculatedHeight = imageWidth * aspectRatio;
    setImageHeights(prev => ({ ...prev, [productId]: calculatedHeight }));
  };

  const distributeProducts = () => {
    const leftColumn: any[] = [];
    const rightColumn: any[] = [];
    let leftHeight = 0;
    let rightHeight = 0;

    favorites.forEach(product => {
      const imageHeight = imageHeights[product.id] || 250;
      const cardHeight = imageHeight + 130;
      if (leftHeight <= rightHeight) {
        leftColumn.push(product);
        leftHeight += cardHeight;
      } else {
        rightColumn.push(product);
        rightHeight += cardHeight;
      }
    });

    return { leftColumn, rightColumn };
  };

  const { leftColumn, rightColumn } = distributeProducts();

  const goToProductDetail = (product: any) => {
    // Firestore Timestamp varsa Date objesine çevir
    const productWithDates = { ...product };
    Object.keys(productWithDates).forEach(key => {
      const value = productWithDates[key];
      if (value && typeof value.toDate === 'function') {
        productWithDates[key] = value.toDate();
      }
    });
    navigation.navigate('ProductDetail', { product: productWithDates });
  };

  const renderProductCard = (item: any) => {
    const imageHeight = imageHeights[item.id] || 250;
    const firstImage = item.imageUrls?.[0] || item.imageUrl;

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.8}
        onPress={() => goToProductDetail(item)}
        style={[styles.card, { width: columnWidth }]}
      >
        <View style={styles.imageContainer}>
          {firstImage ? (
            <Image
              source={{ uri: firstImage }}
              style={[styles.image, { height: imageHeight }]}
              onLoad={(e) => {
                const { width, height } = e.nativeEvent.source;
                handleImageLoad(item.id, width, height);
              }}
            />
          ) : (
            <View style={[styles.image, styles.noImage, { height: 200 }]}>
              <Text style={styles.noImageText}>Resim yok</Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.userRow}>
            <Text style={styles.username} numberOfLines={1}>
              {item.username || 'Bilinmeyen'}
            </Text>
            <TouchableOpacity onPress={() => removeFromFavorites(item.id)} style={styles.removeButton}>
              <Ionicons name="close" size={18} color="#333333" />
            </TouchableOpacity>
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {item.title}{item.year ? `, ${item.year}` : ''}
          </Text>

          <Text style={styles.price}>
            ₺{item.price ? item.price.toLocaleString('tr-TR') : '0'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!favorites)
    return <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.primary} />;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 10 }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>

      {favorites.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.text }]}>Henüz favori ürün yok.</Text>
      ) : (
        <View style={[styles.masonryContainer, { paddingTop: insets.top + 70 }]}>
          <View style={styles.column}>{leftColumn.map(renderProductCard)}</View>
          <View style={styles.column}>{rightColumn.map(renderProductCard)}</View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default FavoritesScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, position: 'relative' },
  backButton: {
    position: 'absolute',
    left: 15,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 25,
    padding: 6,
    elevation: 3,
  },
  emptyText: { textAlign: 'center', marginTop: 120, fontSize: 16, fontWeight: '500' },
  masonryContainer: { flexDirection: 'row', paddingHorizontal: 10, paddingBottom: 30 },
  column: { flex: 1, paddingHorizontal: 5 },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#F7F7F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1.5,
  },
  imageContainer: { padding: 10 },
  image: { width: '100%', resizeMode: 'contain', borderRadius: 8 },
  noImage: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#E8E8E8' },
  noImageText: { color: '#6E6E6E' },
  infoContainer: { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 2 },
  userRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  username: { fontSize: 13, color: '#0A0A0A', flex: 1 },
  removeButton: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20, padding: 4, marginLeft: 6 },
  title: { fontSize: 15, color: '#6E6E6E', marginTop: 6, marginBottom: 6 },
  price: { fontSize: 17, fontWeight: 'bold', color: '#0A0A0A' },
});
