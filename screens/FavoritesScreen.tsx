import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Product } from '../routes/types';
import { useFavoriteItems } from '../contexts/FavoritesContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../routes/types';
import { useThemeContext } from '../contexts/ThemeContext';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';
import ProductCard, { ProductCardItem, getStableHeight } from '../components/ProductCard';
import GlobalMasonryList from '../components/GlobalMasonryList';

const { width: screenWidth } = Dimensions.get('window');
const SIDE_PADDING = 12;
const COLUMN_GAP = 10;
const columnWidth = Math.floor((screenWidth - SIDE_PADDING * 2 - COLUMN_GAP) / 2);
const imageWidth  = columnWidth - 20;


const FavoritesScreen = () => {
  const { favoriteItems, removeFavorite } = useFavoriteItems();
  const { colors, isDarkTheme } = useThemeContext();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 150);
    return () => clearTimeout(timer);
  }, []);

  const favoriteSet = useMemo(() => new Set(favoriteItems.map(f => f.id)), [favoriteItems]);

  const handleFavoriteToggle = useCallback((item: ProductCardItem) => {
    removeFavorite(item.id);
  }, [removeFavorite]);

  const handleProductPress = useCallback((item: ProductCardItem) => {
    const productForDetail: Product = {
      id: item.id, title: item.title ?? '', username: item.username,
      price: item.price, year: item.year ? Number(item.year) : null,
      imageUrls: item.imageUrls || (item.imageUrl ? [item.imageUrl] : []),
      isSold: item.isSold,
      description: (item as any).description || '',
      ownerId: (item as any).ownerId || '',
      createdAt: new Date().toISOString(),
    };
    navigation.navigate('ProductDetail', { product: productForDetail });
  }, [navigation]);

  const favoriteList = useMemo(
    () => favoriteItems.map(f => f as unknown as ProductCardItem),
    [favoriteItems]
  );


  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ backgroundColor: colors.background }}>
        <View style={[styles.header, { borderBottomColor: isDarkTheme ? '#333' : '#eee' }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('favorites')}</Text>
        </View>
      </SafeAreaView>

      <GlobalMasonryList
        data={favoriteList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color={colors.secondaryText} style={{ opacity: 0.5 }} />
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>{t('noFavorites')}</Text>
          </View>
        }
        contentContainerStyle={{
          paddingBottom: 100 + insets.bottom, // Tab bar padding
        }}
      />
    </View>
  );
};

export default FavoritesScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    paddingRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 120,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
