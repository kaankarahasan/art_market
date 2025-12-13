import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Product } from '../routes/types';
import { useFavoriteItems, FavoriteItem } from '../contexts/FavoritesContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../routes/types';
import { useThemeContext } from '../contexts/ThemeContext';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

const screenWidth = Dimensions.get('window').width;
const columnWidth = (screenWidth - 70) / 2;

const FavoritesScreen = () => {
  const { favoriteItems, removeFavorite } = useFavoriteItems();
  const { colors, isDarkTheme } = useThemeContext();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [imageHeights, setImageHeights] = useState<{ [key: string]: number }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // small delay to ensure AsyncStorage loaded items
    const timer = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(timer);
  }, []);

  const handleImageLoad = (productId: string, width: number, height: number) => {
    const imageWidth = columnWidth - 20;
    const aspectRatio = height / width;
    const calculatedHeight = imageWidth * aspectRatio;
    setImageHeights(prev => ({ ...prev, [productId]: calculatedHeight }));
  };

  const distributeProducts = () => {
    const leftColumn: FavoriteItem[] = [];
    const rightColumn: FavoriteItem[] = [];
    let leftHeight = 0;
    let rightHeight = 0;

    favoriteItems.forEach(product => {
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

  const goToProductDetail = (product: FavoriteItem) => {
    const productForDetail: Product = {
      ...product,
      description: product.description || '',
      ownerId: product.ownerId || '',
      imageUrls: product.imageUrls || [],
      year: product.year ? Number(product.year) : null,
    };
    navigation.navigate('ProductDetail', { product: productForDetail });
  };

  const renderProductCard = (item: FavoriteItem) => {
    const imageHeight = imageHeights[item.id] || 250;
    const firstImage = item.imageUrls?.[0] || item.imageUrl;

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.8}
        onPress={() => goToProductDetail(item)}
        style={[styles.card, { width: columnWidth, backgroundColor: colors.card }]}
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
            <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
              {item.username || 'Bilinmeyen'}
            </Text>
            <TouchableOpacity
              onPress={() => removeFavorite(item.id)}
              style={[styles.removeButton, { backgroundColor: isDarkTheme ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)' }]}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: colors.secondaryText }]} numberOfLines={2}>
            {item.title}{item.year ? `, ${item.year}` : ''}
          </Text>

          <Text style={[styles.price, { color: colors.text }]}>
            ₺{item.price ? item.price.toLocaleString('tr-TR') : '0'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color={colors.primary} />;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <TouchableOpacity
        style={[
          styles.backButton,
          {
            top: insets.top + 10,
            backgroundColor: isDarkTheme ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.9)'
          }
        ]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </TouchableOpacity>

      {favoriteItems.length === 0 ? (
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

    borderRadius: 12,
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
  username: { fontSize: 13, flex: 1 },
  removeButton: { borderRadius: 12, padding: 4, marginLeft: 6 },
  title: { fontSize: 15, marginTop: 6, marginBottom: 6 },
  price: { fontSize: 17, fontWeight: 'bold' },
});
