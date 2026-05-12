/**
 * ProductCard.tsx
 * - Image height state kendi içinde yönetiliyor (parent cascade re-render yok)
 * - React.memo + özel eşitlik ile gereksiz re-render engelleniyor
 */
import React, { memo, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export interface ProductCardItem {
  id: string;
  title?: string;
  username?: string;
  price?: number;
  year?: string | number;
  imageUrls?: string[];
  imageUrl?: string;
  mainImageUrl?: string;
  isSold?: boolean;
  createdAt?: any;
  description?: string;
  category?: string;
  dimensions?: { width?: string | number; height?: string | number };
  aiVisualTags?: string[] | string;
  ownerId?: string;
}

// Kart için deterministik başlangıç yüksekliği (id'den üret)
export function getStableHeight(id: string, imageWidth: number): number {
  // 0.7 ile 1.4 arası oranlar → daha asimetrik, Pinterest stili
  const ratio = 0.7 + (parseInt(id.substring(0, 8), 16) % 100) / 142; 
  return Math.round(imageWidth * ratio);
}

interface ProductCardProps {
  item: ProductCardItem;
  columnWidth: number;
  isFavorite: boolean;
  isDarkTheme: boolean;
  colors: any;
  newBadgeLabel: string;
  noImageLabel: string;
  onPress: (item: ProductCardItem) => void;
  onFavoriteToggle: (item: ProductCardItem) => void;
  showSoldBadge?: boolean;
}

const ProductCardInner = ({
  item,
  columnWidth,
  isFavorite,
  isDarkTheme,
  colors,
  newBadgeLabel,
  noImageLabel,
  onPress,
  onFavoriteToggle,
  showSoldBadge = false,
}: ProductCardProps) => {
  // Görüntü genişliği: imageContainer padding 10px × 2
  const imageWidth = columnWidth - 20;

  // Her kart kendi yüksekliğini yönetir → parent'ta cascade re-render yok
  const [imageHeight, setImageHeight] = useState<number>(() =>
    getStableHeight(item.id, imageWidth)
  );
  const [imageError, setImageError] = useState(false);

  const firstImage =
    Array.isArray(item.imageUrls) && item.imageUrls.length > 0
      ? item.imageUrls[0]
      : item.mainImageUrl || item.imageUrl || null;

  const isProductNew = (() => {
    if (!item.createdAt) return false;
    const date = item.createdAt instanceof Date ? item.createdAt : new Date(item.createdAt);
    return (Date.now() - date.getTime()) < 48 * 60 * 60 * 1000;
  })();

  const handlePress  = useCallback(() => onPress(item), [item, onPress]);
  const handleFav    = useCallback(() => onFavoriteToggle(item), [item, onFavoriteToggle]);

  const cardBg       = colors.card;
  const placeholderBg = isDarkTheme ? '#2a2a2a' : '#efefef';
  const showImage    = !!firstImage && !imageError;

  return (
    <View style={[styles.card, { width: columnWidth, backgroundColor: cardBg }]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.82}>

        {/* ── Görsel ── */}
        <View style={styles.imageContainer}>
          {showImage ? (
            <Image
              source={{ uri: firstImage as string }}
              style={{ width: imageWidth, height: imageHeight, borderRadius: 10, backgroundColor: placeholderBg }}
              resizeMode="cover"
              progressiveRenderingEnabled={true}
              fadeDuration={300}
              onLoad={(e) => {
                const { width: w, height: h } = e.nativeEvent.source;
                if (w > 0) {
                  // Yüksekliği gerçek orana göre güncelle, ama sınırları koru
                  const calc = Math.max(100, Math.min(Math.round(imageWidth * (h / w)), 600));
                  setImageHeight(calc);
                }
              }}
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={{ width: imageWidth, height: imageHeight, borderRadius: 8, backgroundColor: placeholderBg, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="image-outline" size={28} color={colors.secondaryText} />
              <Text style={[styles.noImageText, { color: colors.secondaryText, marginTop: 4 }]}>
                {noImageLabel}
              </Text>
            </View>
          )}

          {/* NEW badge */}
          {isProductNew && !item.isSold && (
            <View style={styles.newBadgeContainer}>
              <View style={styles.newBadgeBackground}>
                <Text style={styles.newBadgeText}>{newBadgeLabel}</Text>
              </View>
            </View>
          )}

          {/* Sold dot */}
          {showSoldBadge && item.isSold && (
            <View style={[styles.soldDot, { borderColor: cardBg }]} />
          )}
        </View>

        {/* ── Bilgi ── */}
        <View style={[styles.infoContainer, { backgroundColor: cardBg }]}>
          <View style={styles.userRow}>
            <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
              {item.username || '—'}
            </Text>
            <TouchableOpacity
              onPress={handleFav}
              style={styles.favBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={18}
                color={isFavorite ? '#FF3040' : colors.text}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: colors.secondaryText }]} numberOfLines={2}>
            {item.title}{item.year ? `, ${item.year}` : ''}
          </Text>

          <Text style={[styles.price, { color: colors.text }]}>
            ₺{item.price ? Number(item.price).toLocaleString('tr-TR') : '0'}
          </Text>
        </View>

      </TouchableOpacity>
    </View>
  );
};

// Sadece gerçekten değişen prop'larda re-render
const ProductCard = memo(ProductCardInner, (prev, next) =>
  prev.item.id        === next.item.id      &&
  prev.isFavorite     === next.isFavorite   &&
  prev.isDarkTheme    === next.isDarkTheme  &&
  prev.colors         === next.colors       &&
  prev.columnWidth    === next.columnWidth
);

export default ProductCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  imageContainer: { padding: 10 },
  noImageText: { fontSize: 11 },
  infoContainer: { paddingHorizontal: 10, paddingBottom: 12 },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
    paddingTop: 4,
  },
  username: { fontSize: 12, flex: 1 },
  favBtn: { padding: 2 },
  title: { fontSize: 13, marginBottom: 5, lineHeight: 18 },
  price: { fontSize: 15, fontWeight: '700' },
  newBadgeContainer: { position: 'absolute', top: 0, right: 0, width: 60, height: 60, overflow: 'hidden' },
  newBadgeBackground: {
    position: 'absolute', top: 5, right: -20,
    backgroundColor: '#FF3040', width: 80, height: 22,
    transform: [{ rotate: '45deg' }],
    justifyContent: 'center', alignItems: 'center',
  },
  newBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  soldDot: { position: 'absolute', top: 8, right: 8, width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF3B30', borderWidth: 2 },
});
