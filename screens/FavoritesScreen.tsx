import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Product } from '../routes/types';
import { useFavoriteItems, FavoriteItem } from '../contexts/FavoritesContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../routes/types';
import { useThemeContext } from '../contexts/ThemeContext';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

const screenWidth = Dimensions.get('window').width;
const columnWidth = (screenWidth - 45) / 2;

const FavoritesScreen = () => {
  const { favoriteItems, removeFavorite } = useFavoriteItems();
  const { colors, isDarkTheme } = useThemeContext();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [imageHeights, setImageHeights] = useState<{ [key: string]: number }>({});
  const [isLoading, setIsLoading] = useState(true);

  const styles = useMemo(() => createStyles(colors), [colors]);

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

  const distributeProducts = useCallback(() => {
    const leftColumn: FavoriteItem[] = [];
    const rightColumn: FavoriteItem[] = [];
    let leftHeight = 0;
    let rightHeight = 0;

    favoriteItems.forEach(product => {
      const imageHeight = imageHeights[product.id] || 250;
      // Match HomeScreen height estimate
      const infoHeightEstimate = 12 + 15 + 6 + 20 + 8 + 20 + 12; // approx 93
      const cardHeight = imageHeight + infoHeightEstimate;

      if (leftHeight <= rightHeight) {
        leftColumn.push(product);
        leftHeight += cardHeight;
      } else {
        rightColumn.push(product);
        rightHeight += cardHeight;
      }
    });

    return { leftColumn, rightColumn };
  }, [favoriteItems, imageHeights]);

  const { leftColumn, rightColumn } = distributeProducts();

  const renderProductCard = (item: FavoriteItem) => {
    const imageHeight = imageHeights[item.id] || 250;
    const firstImage = item.imageUrls?.[0] || item.imageUrl;

    const handlePress = () => {
      const productForDetail: Product = {
        ...item,
        description: item.description || '',
        ownerId: item.ownerId || '',
        imageUrls: item.imageUrls || (item.imageUrl ? [item.imageUrl] : []),
        year: item.year ? Number(item.year) : null,
        // Match HomeScreen serialization
        createdAt: new Date().toISOString(),
      };
      navigation.navigate('ProductDetail', { product: productForDetail });
    };

    return (
      <View key={item.id} style={[styles.card, { width: columnWidth }]}>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.7}
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
              <TouchableOpacity
                onPress={() => removeFavorite(item.id)}
                style={styles.favoriteButton}
              >
                <Ionicons name="heart" size={20} color={colors.text} />
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
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Favoriler</Text>
      </View>

      {favoriteItems.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.text }]}>Henüz favori ürün yok.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }} showsVerticalScrollIndicator={false}>
          <View style={styles.masonryContainer}>
            <View style={styles.column}>{leftColumn.map(renderProductCard)}</View>
            <View style={styles.column}>{rightColumn.map(renderProductCard)}</View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default FavoritesScreen;

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyText: { textAlign: 'center', marginTop: 120, fontSize: 16, fontWeight: '500' },
  masonryContainer: { flexDirection: 'row', paddingHorizontal: 10 },
  column: { flex: 1, paddingHorizontal: 5 },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  imageContainer: { padding: 10 },
  image: { width: '100%', resizeMode: 'contain', borderRadius: 8 },
  noImage: { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  noImageText: { color: colors.secondaryText },
  infoContainer: { padding: 12, paddingTop: 0, backgroundColor: colors.card },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  username: { fontSize: 13, color: colors.text, flex: 1 },
  favoriteButton: { padding: 2 },
  title: { fontSize: 15, color: colors.secondaryText, marginBottom: 8, lineHeight: 20 },
  price: { fontSize: 17, fontWeight: 'bold', color: colors.text },
});
