import React, { useCallback, useMemo } from 'react';
import {
  View,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes/types';
import { useThemeContext } from '../contexts/ThemeContext';
import { useFavoriteItems } from '../contexts/FavoritesContext';
import { useLanguage } from '../contexts/LanguageContext';
import ProductCard, { ProductCardItem } from './ProductCard';
import ProductSkeleton from './skeletons/ProductSkeleton';

const { width: screenWidth } = Dimensions.get('window');
const SIDE_PADDING = 16;
const COLUMN_GAP = 12;
const columnWidth = (screenWidth - SIDE_PADDING * 2 - COLUMN_GAP) / 2;

interface GlobalMasonryListProps {
  data: ProductCardItem[];
  loading?: boolean;
  onEndReached?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  loadingMore?: boolean;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  estimatedItemSize?: number;
  showSoldBadge?: boolean;
  contentContainerStyle?: any;
}

const GlobalMasonryList: React.FC<GlobalMasonryListProps> = ({
  data,
  loading = false,
  onEndReached,
  onRefresh,
  refreshing = false,
  loadingMore = false,
  ListHeaderComponent,
  ListEmptyComponent,
  estimatedItemSize = 350,
  showSoldBadge = false,
  contentContainerStyle,
}) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, isDarkTheme } = useThemeContext();
  const { favoriteItems, addFavorite, removeFavorite } = useFavoriteItems();
  const { t } = useLanguage();

  const favoriteSet = useMemo(() => new Set(favoriteItems.map(f => f.id)), [favoriteItems]);

  const handleFavoriteToggle = useCallback((item: ProductCardItem) => {
    if (favoriteSet.has(item.id)) {
      removeFavorite(item.id);
    } else {
      addFavorite({
        id: item.id,
        title: item.title || t('noTitle'),
        username: item.username || t('unknown'),
        imageUrl: Array.isArray(item.imageUrls) ? item.imageUrls[0] : item.imageUrl || undefined,
        price: item.price || 0,
        year: item.year || '',
        createdAt: item.createdAt,
      });
    }
  }, [favoriteSet, removeFavorite, addFavorite, t]);

  const handleProductPress = useCallback((item: ProductCardItem) => {
    navigation.navigate('ProductDetail', {
      product: {
        ...item,
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : new Date().toISOString(),
      } as any,
    });
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: ProductCardItem }) => (
    <View style={{ padding: COLUMN_GAP / 2 }}>
      <ProductCard
        item={item}
        columnWidth={columnWidth}
        isFavorite={favoriteSet.has(item.id)}
        isDarkTheme={isDarkTheme}
        colors={colors}
        newBadgeLabel={t('newBadge')}
        noImageLabel={t('noImageText')}
        onPress={handleProductPress}
        onFavoriteToggle={handleFavoriteToggle}
        showSoldBadge={showSoldBadge}
      />
    </View>
  ), [favoriteSet, isDarkTheme, colors, handleProductPress, handleFavoriteToggle, t, showSoldBadge]);

  const renderListHeader = () => {
    if (!ListHeaderComponent) return null;
    if (React.isValidElement(ListHeaderComponent)) return ListHeaderComponent;
    const Component = ListHeaderComponent as React.ComponentType<any>;
    return <Component />;
  };

  if (loading && data.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        {renderListHeader()}
        <View style={{ 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          paddingHorizontal: SIDE_PADDING, 
          paddingTop: 10,
          justifyContent: 'space-between'
        }}>
          {[1, 2, 3, 4, 5, 6].map(i => <ProductSkeleton key={i} />)}
        </View>
      </View>
    );
  }

  return (
    <FlashList<ProductCardItem>
      {...({ masonry: true } as any)}
      data={data}
      numColumns={2}
      optimizeItemArrangement={true}
      renderItem={renderItem}
      keyExtractor={(item: ProductCardItem) => item.id}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      estimatedItemSize={estimatedItemSize}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      contentContainerStyle={{
        paddingHorizontal: SIDE_PADDING - (COLUMN_GAP / 2),
        paddingTop: 10,
        ...contentContainerStyle,
      }}
      showsVerticalScrollIndicator={false}
      ListFooterComponent={loadingMore ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.text} />
        </View>
      ) : null}
      refreshControl={onRefresh ? (
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.text}
          colors={[colors.text]}
        />
      ) : undefined}
      drawDistance={screenWidth}
      removeClippedSubviews={true}
    />
  );
};

const styles = StyleSheet.create({
  footerLoader: {
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default React.memo(GlobalMasonryList);
