import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  View,
  Dimensions,
  StatusBar,
  Platform,
  FlatList,
  Alert,
  Animated,
} from 'react-native';
import {
  RouteProp,
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RootStackParamList, Product } from '../routes/types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  useFavoriteUsers,
  useFavoriteItems,
  FavoriteItem,
} from '../contexts/FavoritesContext';
import { doc, getDoc, collection, query, where, limit, getDocs } from '@react-native-firebase/firestore';
import { auth, db } from '../firebaseConfig';
import ImageViewing from 'react-native-image-viewing';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

import { useThemeContext } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import ProductCard, { ProductCardItem } from '../components/ProductCard';
import { artworkFollowerService } from '../services/artworkFollowerService';

const { width, height } = Dimensions.get('window');
const cardWidth = width * 0.45;

type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

const ProductDetailScreen = () => {
  const { colors, isDarkTheme } = useThemeContext();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ProductDetailRouteProp>();
  const { product } = route.params;
  const { t } = useLanguage();

  const { favoriteItems, addFavorite, removeFavorite } = useFavoriteItems();
  const insets = useSafeAreaInsets();
  const currentUser = auth.currentUser;

  const [productData, setProductData] = useState<Product>(() => {
    const pd: any = { ...product };
    Object.keys(pd).forEach((key) => {
      const value = pd[key];
      if (value && typeof value.toDate === 'function') pd[key] = value.toDate();
    });
    return pd;
  });

  const [ownerData, setOwnerData] = useState<{
    username?: string;
    email?: string;
    profilePicture?: string;
    fullName?: string;
  } | null>(null);
  const [loadingOwner, setLoadingOwner] = useState(false);
  const [otherProducts, setOtherProducts] = useState<Product[]>([]);
  const [loadingOtherProducts, setLoadingOtherProducts] = useState(false);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const styles = React.useMemo(() => createStyles(colors, isDarkTheme), [colors, isDarkTheme]);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const isOwner = productData.ownerId === currentUser?.uid;
  const isFavoriteItem = favoriteItems.some((fav: FavoriteItem) => fav.id === productData.id);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const formatCategory = (cat: string | undefined) => {
    if (!cat) return '';
    const translationKey = `cat_${cat.toLowerCase().replace(/ /g, '_')}` as any;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent<BottomTabNavigationProp<any>>();
      const defaultStyle = parent?.getState()?.routes[0]?.params?.tabBarStyle;
      parent?.setOptions?.({ tabBarStyle: { display: 'none' } });
      
      const unsubFollow = artworkFollowerService.onFollowStatusChange(productData.id, (status) => {
        setIsFollowing(status);
      });

      return () => {
        parent?.setOptions?.({ tabBarStyle: defaultStyle });
        unsubFollow();
      };
    }, [navigation, productData.id])
  );

  useEffect(() => {
    const fetchOwnerAndOtherProducts = async () => {
      if (!productData.ownerId) return;
      setLoadingOwner(true);
      setLoadingOtherProducts(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', productData.ownerId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data) {
            setOwnerData({
              username: data.username,
              email: data.email,
              profilePicture: data.photoURL || '',
              fullName: data.fullName,
            });
          }
        }

        const q = query(collection(db, 'products'), where('ownerId', '==', productData.ownerId), limit(10));
        const querySnapshot = await getDocs(q);
        const fetchedProducts: Product[] = [];
        querySnapshot.forEach((doc: any) => {
          if (doc.id !== productData.id) {
            const data: any = { id: doc.id, ...doc.data() };
            Object.keys(data).forEach((key) => {
              if (data[key] && typeof data[key].toDate === 'function') data[key] = data[key].toDate();
            });
            fetchedProducts.push(data as Product);
          }
        });
        setOtherProducts(fetchedProducts);
      } catch (error) {
        console.error('Owner/Other products fetch error:', error);
      } finally {
        setLoadingOwner(false);
        setLoadingOtherProducts(false);
      }
    };
    fetchOwnerAndOtherProducts();
  }, [productData.ownerId, productData.id]);

  const handleToggleFollow = async () => {
    if (!currentUser) {
      Alert.alert(t('warning'), t('loginRequired'));
      return;
    }
    try {
      const mainImage = Array.isArray(productData.imageUrls) ? productData.imageUrls[0] : (productData.imageUrls || '');
      const newStatus = await artworkFollowerService.toggleFollowArtwork(
        productData.id,
        productData.title || '',
        mainImage
      );
      setIsFollowing(newStatus);
    } catch (error) {
      Alert.alert(t('error'), 'İşlem sırasında bir hata oluştu.');
    }
  };

  const handleViewInRoom = () => {
    const urlToUse = Array.isArray(productData.imageUrls) ? productData.imageUrls[0] : productData.imageUrls;
    if (urlToUse) {
      navigation.navigate('ViewInRoom', { imageUrl: urlToUse, dimensions: productData.dimensions });
    } else {
      Alert.alert(t('error'), t('viewInRoomError'));
    }
  };

  const renderImages = () => {
    // Favoriler veya diğer kaynaklardan gelen verilerde dizi veya tekil URL kontrolü yap
    const images: string[] = Array.isArray(productData?.imageUrls) && productData.imageUrls.length > 0
      ? productData.imageUrls.filter((url) => url && url.trim() !== '')
      : (productData?.imageUrls ? [productData.imageUrls] : ((productData as any)?.imageUrl ? [(productData as any).imageUrl] : []));

    if (images.length === 0) {
      return (
        <View style={[styles.mainImageContainer, styles.imagePlaceholder]}>
          <Ionicons name="image-outline" size={64} color={colors.secondaryText} />
          <Text style={{ color: colors.secondaryText, marginTop: 8 }}>{t('noImage')}</Text>
        </View>
      );
    }

    return (
      <View>
        <ScrollView
          ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onScroll={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          scrollEventThrottle={16} style={styles.mainImageContainer}
        >
          {images.map((uri, index) => (
            <TouchableOpacity key={index} onPress={() => setIsImageViewVisible(true)} activeOpacity={0.9}>
              <Image source={{ uri }} style={styles.mainImage} resizeMode="contain" />
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.squareIndicatorContainer}>
          {images.map((_, index) => (
            <View key={index} style={[styles.squareDot, { backgroundColor: activeIndex === index ? colors.text : colors.secondaryText }]} />
          ))}
        </View>
      </View>
    );
  };

  const imagesArray = Array.isArray(productData.imageUrls)
    ? productData.imageUrls.filter((url) => url && url.trim() !== '').map((uri) => ({ uri }))
    : productData.imageUrls ? [{ uri: productData.imageUrls }] : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* SOLID HEADER */}
      <SafeAreaView edges={['top', 'left', 'right']} style={{ backgroundColor: colors.background }}>
        <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {!isOwner && (
            <TouchableOpacity 
              onPress={handleToggleFollow} 
              style={styles.rightAction}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name={isFollowing ? "notifications" : "notifications-outline"} 
                size={24} 
                color={isFollowing ? colors.primary : colors.text} 
              />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <Animated.ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 150 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {renderImages()}
        
        <View style={styles.content}>
          <View style={styles.mainHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mainTitle}>{productData.title}{productData.year ? `, ${productData.year}` : ''}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.mainPrice}>{productData.price ? `₺${Number(productData.price).toLocaleString('tr-TR')}` : t('unknown')}</Text>
                {productData.isSold && <View style={styles.soldBadge}><Text style={styles.soldBadgeText}>SATILDI</Text></View>}
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => isFavoriteItem ? removeFavorite(productData.id) : addFavorite(productData as FavoriteItem)} 
              style={styles.favoriteButtonNew}
              activeOpacity={0.7}
            >
              <Ionicons name={isFavoriteItem ? 'heart' : 'heart-outline'} size={28} color={isFavoriteItem ? '#FF3040' : colors.text} />
            </TouchableOpacity>
          </View>

          {ownerData && (
            <View style={[styles.artistCard, { backgroundColor: colors.card }]}>
              <TouchableOpacity onPress={() => {
                if (!productData.ownerId) return;
                if (isOwner) navigation.navigate('Main', { screen: 'ProfileTab' });
                else navigation.navigate('OtherProfile', { userId: productData.ownerId });
              }} style={styles.ownerContainer} activeOpacity={0.7}>
                {ownerData.profilePicture ? (
                  <Image source={{ uri: ownerData.profilePicture }} style={styles.ownerImage} />
                ) : (
                  <View style={[styles.ownerImage, { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="person" size={20} color={colors.secondaryText} />
                  </View>
                )}
                <View>
                   <Text style={styles.artistLabel}>{t('artist')}</Text>
                   <Text style={styles.ownerName}>{ownerData.fullName || ownerData.username || t('unknown')}</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.descriptionSection}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>{t('description')}</Text>
            <Text style={styles.description}>{productData.description || t('noDescription')}</Text>
          </View>

          <View style={[styles.detailsGrid, { borderTopColor: colors.border }]}>
             <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>{t('category')}</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formatCategory(productData.category)}</Text>
             </View>
             {productData.dimensions && (
               <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>{t('dimension')}</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {['height', 'width'].map((k) => productData.dimensions?.[k as 'height' | 'width']).filter(Boolean).join(' × ')} cm
                  </Text>
               </View>
             )}
          </View>
        </View>

        {otherProducts.length > 0 && (
          <View style={styles.otherProductsContainer}>
            <Text style={styles.otherProductsTitle}>{ownerData?.fullName || t('seller')} {t('otherProducts')}</Text>
            <FlatList
              data={otherProducts} 
              horizontal 
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id} 
              contentContainerStyle={{ paddingHorizontal: 20, marginTop: 15 }}
              renderItem={({ item }) => (
                <View style={{ marginRight: 16 }}>
                  <ProductCard 
                    item={item as any}
                    columnWidth={cardWidth}
                    isFavorite={favoriteItems.some(fav => fav.id === item.id)}
                    isDarkTheme={isDarkTheme}
                    colors={colors}
                    newBadgeLabel={t('newBadge')}
                    noImageLabel={t('noImageText')}
                    onPress={() => navigation.push('ProductDetail', { product: item })}
                    onFavoriteToggle={() => favoriteItems.some(fav => fav.id === item.id) ? removeFavorite(item.id) : addFavorite(item as any)}
                  />
                </View>
              )}
            />
          </View>
        )}
      </Animated.ScrollView>

      {currentUser && (
        <View style={[styles.bottomWrapper, { backgroundColor: colors.background, paddingBottom: insets.bottom + 10 }]}>
          {!isOwner && !productData.isSold ? (
            <View style={styles.bottomMainRow}>
               <View style={styles.secondaryActions}>
                  <TouchableOpacity onPress={() => {
                    if (!currentUser || !productData.ownerId || isOwner) return;
                    navigation.navigate('Chat', { currentUserId: currentUser.uid, otherUserId: productData.ownerId });
                  }} style={[styles.iconAction, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleViewInRoom} style={[styles.iconAction, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="easel-outline" size={24} color={colors.text} />
                  </TouchableOpacity>
               </View>
               <View style={styles.primaryActions}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.text, borderWidth: 1.5 }]} 
                    onPress={() => navigation.navigate('Offer', { product: productData })}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.btnText, { color: colors.text }]}>{t('makeOffer')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: colors.text }]} 
                    onPress={() => navigation.navigate('Checkout', { product: productData })}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.btnText, { color: colors.background }]}>Hemen Al</Text>
                  </TouchableOpacity>
               </View>
            </View>
          ) : isOwner ? (
            <TouchableOpacity 
              style={[styles.fullWidthBtn, { backgroundColor: colors.text }]} 
              onPress={() => navigation.navigate('UpdateProduct', { product: productData })}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={22} color={colors.background} />
              <Text style={[styles.btnText, { color: colors.background }]}>Eseri Düzenle</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <ImageViewing
        images={imagesArray} imageIndex={activeIndex} visible={isImageViewVisible}
        onRequestClose={() => setIsImageViewVisible(false)} backgroundColor={colors.background}
      />
    </View>
  );
};

const createStyles = (colors: any, isDarkTheme: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  backButton: {
    paddingRight: 10,
  },
  rightAction: {
    paddingLeft: 10,
  },
  mainImageContainer: { height: height * 0.55, width },
  mainImage: { width, height: height * 0.55 },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.card },
  squareIndicatorContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 10, gap: 6 },
  squareDot: { width: 6, height: 6, borderRadius: 3 },
  content: { padding: 24 },
  mainHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  mainTitle: { fontSize: 26, fontWeight: 'bold', color: colors.text, marginBottom: 8, letterSpacing: -0.5 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mainPrice: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: 0.5 },
  soldBadge: { backgroundColor: '#FF3B30', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  soldBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  favoriteButtonNew: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  
  artistCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 24, marginBottom: 32 },
  ownerContainer: { flexDirection: 'row', alignItems: 'center' },
  ownerImage: { width: 50, height: 50, borderRadius: 25, marginRight: 16 },
  artistLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: colors.secondaryText, marginBottom: 2 },
  ownerName: { fontSize: 16, fontWeight: '700', color: colors.text },
  
  descriptionSection: { marginBottom: 32 },
  sectionLabel: { fontSize: 13, fontWeight: 'bold', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.6, color: colors.text },
  description: { fontSize: 16, color: colors.text, lineHeight: 28 },
  
  detailsGrid: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 24, marginBottom: 32, gap: 40 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 11, color: colors.secondaryText, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 },
  detailValue: { fontSize: 15, fontWeight: '600', color: colors.text },
  
  otherProductsContainer: { marginTop: 10, paddingBottom: 60 },
  otherProductsTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, paddingHorizontal: 24, marginBottom: 10 },
  
  bottomWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, borderTopWidth: 1, borderTopColor: colors.border },
  bottomMainRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  secondaryActions: { flexDirection: 'row', gap: 10 },
  iconAction: { width: 54, height: 54, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  primaryActions: { flex: 1, flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: 'bold' },
  fullWidthBtn: { width: '100%', height: 54, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});

export default ProductDetailScreen;