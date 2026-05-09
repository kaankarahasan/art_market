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
  Linking,
  Alert
} from 'react-native';
import {
  NavigationProp,
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
  FavoriteUser,
  useFavoriteItems,
  FavoriteItem,
} from '../contexts/FavoritesContext';
import { doc, getDoc, collection, query, where, limit, getDocs, updateDoc } from '@react-native-firebase/firestore';
import { auth, db, functions } from '../firebaseConfig';
import { httpsCallable } from '@react-native-firebase/functions';
import { useStripe } from '@stripe/stripe-react-native';
import ImageViewing from 'react-native-image-viewing';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

import { useThemeContext } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const { width, height } = Dimensions.get('window');

const cardWidth = width * 0.40;

const ProductDetailScreen = () => {
  const { colors, isDarkTheme } = useThemeContext();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'ProductDetail'>>();
  const route = useRoute<ProductDetailRouteProp>();
  const { product } = route.params;
  const { t } = useLanguage();

  const { favoriteUsers, addToFavoriteUsers, removeFromFavoriteUsers } =
    useFavoriteUsers();
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

  const isNavigatingToModal = useRef(false);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [isBuying, setIsBuying] = useState(false);

  const styles = React.useMemo(() => createStyles(colors, isDarkTheme), [colors, isDarkTheme]);

  const scrollRef = useRef<ScrollView>(null);

  const isOwner = productData.ownerId === currentUser?.uid;
  const dynamicTopMargin = height * 0.1;

  const isFavoriteItem = favoriteItems.some(
    (fav: FavoriteItem) => fav.id === productData.id
  );

  const isProductNew = (() => {
    if (!productData.createdAt) return false;
    const date = productData.createdAt instanceof Date ? productData.createdAt : new Date(productData.createdAt);
    return (new Date().getTime() - date.getTime()) < 48 * 60 * 60 * 1000;
  })();

  useFocusEffect(
    useCallback(() => {
      isNavigatingToModal.current = false;
      const parent = navigation.getParent<BottomTabNavigationProp<any>>();
      const defaultStyle = parent?.getState()?.routes[0]?.params?.tabBarStyle;
      parent?.setOptions?.({ tabBarStyle: { display: 'none' } });
      return () => {
        if (!isNavigatingToModal.current) {
          parent?.setOptions?.({ tabBarStyle: defaultStyle });
        }
      };
    }, [navigation])
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
              const value = data[key];
              if (value && typeof value.toDate === 'function')
                data[key] = value.toDate();
            });
            fetchedProducts.push(data as Product);
          }
        });
        setOtherProducts(fetchedProducts);
      } catch (error) {
        console.error('Kullanıcı veya diğer ürünler alınırken hata:', error);
      } finally {
        setLoadingOwner(false);
        setLoadingOtherProducts(false);
      }
    };
    fetchOwnerAndOtherProducts();
  }, [productData.ownerId, productData.id]);

  useFocusEffect(
    useCallback(() => {
      const fetchProduct = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'products', product.id));
          if (docSnap.exists()) {
            const data: any = { id: docSnap.id, ...docSnap.data() };
            Object.keys(data).forEach((key) => {
              const value = data[key];
              if (value && typeof value.toDate === 'function')
                data[key] = value.toDate();
            });
            setProductData(data);
          }
        } catch (err) {
          console.error('Ürün güncellenirken hata:', err);
        }
      };
      fetchProduct();
    }, [product.id])
  );

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    let date: Date;
    if (timestamp instanceof Date) date = timestamp;
    else if (typeof timestamp.toDate === 'function') date = timestamp.toDate();
    else return '';
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const goToUserProfile = () => {
    if (!productData.ownerId) return;
    if (isOwner) navigation.navigate('Profile', {});
    else navigation.navigate('OtherProfile', { userId: productData.ownerId });
  };

  const handleSendMessage = () => {
    if (!currentUser || !productData.ownerId || isOwner) {
      return;
    }
    navigation.navigate('Chat', {
      currentUserId: currentUser.uid,
      otherUserId: productData.ownerId,
    });
  };

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  const handleViewInRoom = () => {
    isNavigatingToModal.current = true;
    const urlToUse = Array.isArray(productData.imageUrls)
      ? productData.imageUrls[0]
      : productData.imageUrls;
      
    if (urlToUse) {
      navigation.navigate('ViewInRoom', { 
        imageUrl: urlToUse, 
        dimensions: productData.dimensions 
      });
    } else {
      Alert.alert(t('error'), t('viewInRoomError'));
    }
  };

  const handleBuy = async () => {
    if (!currentUser) {
      Alert.alert('Giriş Yapın', 'Satın alma işlemi için giriş yapmalısınız.');
      return;
    }
    
    if (!productData.price) {
      Alert.alert('Hata', 'Bu ürün için fiyat bilgisi bulunamadı.');
      return;
    }

    try {
      setIsBuying(true);
      console.log('[Stripe] handleBuy started. Product:', productData.id, 'Price:', productData.price);

      if (!functions) {
        console.error('[Stripe] Firebase Functions başlatılamadı.');
        Alert.alert('Hata', 'Ödeme servisi hazır değil. Lütfen uygulamayı yeniden başlatın.');
        setIsBuying(false);
        return;
      }

      // 1. Backend'den clientSecret al
      const createPaymentIntentFn = httpsCallable(functions, 'createPaymentIntent');
      console.log('[Stripe] Calling createPaymentIntent...');
      
      const response = await createPaymentIntentFn({
        amount: Math.round(Number(productData.price) * 100),
        currency: 'try',
        productId: productData.id,
        sellerId: productData.ownerId,
      });

      console.log('[Stripe] Raw response from function:', JSON.stringify(response.data));

      const responseData = response.data as any;
      const clientSecret = responseData?.clientSecret;

      if (!clientSecret) {
        console.error('[Stripe] clientSecret is missing from response:', responseData);
        Alert.alert('Hata', 'Ödeme oturumu başlatılamadı. Sunucudan clientSecret gelmedi.');
        setIsBuying(false);
        return;
      }

      console.log('[Stripe] clientSecret received (first 20 chars):', clientSecret.substring(0, 20));

      // 2. Stripe PaymentSheet başlat
      console.log('[Stripe] Initializing PaymentSheet...');
      const initResponse = await initPaymentSheet({
        merchantDisplayName: 'Umay Art Market',
        paymentIntentClientSecret: clientSecret,
        returnURL: 'umay://stripe-redirect',
        allowsDelayedPaymentMethods: false,
      });
      
      if (initResponse.error) {
        console.error('[Stripe] initPaymentSheet error:', initResponse.error);
        Alert.alert('Ödeme Hatası', `PaymentSheet başlatılamadı: ${initResponse.error.message}`);
        setIsBuying(false);
        return;
      }

      console.log('[Stripe] PaymentSheet initialized. Presenting...');

      // 3. PaymentSheet göster
      const paymentResponse = await presentPaymentSheet();

      if (paymentResponse.error) {
        if (paymentResponse.error.code === 'Canceled') {
          console.log('[Stripe] Payment canceled by user.');
        } else {
          console.error('[Stripe] presentPaymentSheet error:', paymentResponse.error);
          Alert.alert('Ödeme Hatası', paymentResponse.error.message);
        }
      } else {
        console.log('[Stripe] Payment successful!');
        
        try {
          // Update Firestore directly for immediate feedback and persistence
          await updateDoc(doc(db, 'products', productData.id), {
            isSold: true,
            status: 'sold'
          });
          console.log('[Firestore] Product status updated to sold.');
        } catch (dbError) {
          console.error('[Firestore] Error updating product status:', dbError);
          // Still show success since payment was successful
        }

        Alert.alert('Başarılı 🎉', 'Satın alma işlemi başarıyla gerçekleşti!');
        setProductData(prev => ({...prev, isSold: true}));
      }
    } catch (e: any) {
      console.error('[Stripe] Unexpected error in handleBuy:', e?.message || e);
      console.error('[Stripe] Error details:', JSON.stringify(e));
      Alert.alert('Hata', `Bir sorun oluştu: ${e?.message || 'Bilinmeyen hata'}`);
    } finally {
      setIsBuying(false);
    }
  };

  const renderImages = () => {
    const images: string[] = Array.isArray(productData.imageUrls)
      ? productData.imageUrls.filter((url) => url && url.trim() !== '')
      : productData.imageUrls
        ? [productData.imageUrls]
        : [];

    if (images.length === 0) {
      return (
        <View style={[styles.mainImageContainer, styles.imagePlaceholder]}>
          <Ionicons
            name="image-outline"
            size={64}
            color={colors.secondaryText}
          />
          <Text style={{ color: colors.secondaryText, marginTop: 8 }}>
            {t('noImage')}
          </Text>
        </View>
      );
    }

    return (
      <View>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.mainImageContainer}
        >
          {images.map((uri, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setIsImageViewVisible(true)}
            >
              <Image
                source={{ uri }}
                style={styles.mainImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.squareIndicatorContainer}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.squareDot,
                {
                  backgroundColor:
                    activeIndex === index
                      ? colors.text
                      : colors.secondaryText,
                },
              ]}
            />
          ))}
        </View>

        <View style={{ height: 20 }} />
      </View>
    );
  };

  const imagesArray = Array.isArray(productData.imageUrls)
    ? productData.imageUrls
      .filter((url) => url && url.trim() !== '')
      .map((uri) => ({ uri }))
    : productData.imageUrls
      ? [{ uri: productData.imageUrls }]
      : [];

  const categories = [
    { label: t('cat_yagli_boya'), value: 'yagli_boya' },
    { label: t('cat_suluboya'), value: 'suluboya' },
    { label: t('cat_akrilik'), value: 'akrilik' },
    { label: t('cat_heykel'), value: 'heykel' },
    { label: t('cat_fotograf'), value: 'fotograf' },
    { label: t('cat_dijital'), value: 'dijital' },
    { label: t('cat_cizim'), value: 'cizim' },
    { label: t('cat_grafik'), value: 'grafik' },
    { label: t('cat_seramik'), value: 'seramik' },
    { label: t('cat_kolaj'), value: 'kolaj' },
    { label: t('cat_diger'), value: 'diger' },
  ];

  const getCategoryLabel = (value: string | undefined) => {
    if (!value) return t('unknown');
    const cat = categories.find((c) => c.value === value);
    return cat ? cat.label : value;
  };

  const handleFavoriteToggle = (item: Product) => {
    const isFav = favoriteItems.some(fav => fav.id === item.id);
    const imageUrl = Array.isArray(item.imageUrls) ? item.imageUrls[0] : item.imageUrls;

    const favItem: FavoriteItem = {
      id: item.id,
      title: item.title || t('noTitle'),
      username: ownerData?.username || t('unknown'),
      imageUrl: imageUrl || undefined,
      price: item.price || 0,
      year: item.year || '',
    };
    isFav ? removeFavorite(item.id) : addFavorite(favItem);
  };

  const renderOtherProductItem = ({ item }: { item: Product }) => {
    const isFavorite = favoriteItems.some(fav => fav.id === item.id);
    const firstImage = Array.isArray(item.imageUrls)
      ? item.imageUrls[0]
      : item.imageUrls;

    const imageHeight = cardWidth * 1.1;

    const handlePress = () => {
      const serializableProduct = {
        ...item,
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : new Date().toISOString(),
      };
      navigation.push('ProductDetail', { product: serializableProduct });
    };

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          {firstImage ? (
            <Image
              source={{ uri: firstImage || undefined }}
              style={[styles.image, { height: imageHeight }]}
            />
          ) : (
            <View style={[styles.noImage, { height: imageHeight }]}>
              <Text style={styles.noImageText}>{t('noImageText')}</Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.userRow}>
            <Text style={styles.username} numberOfLines={1}>
              {ownerData?.fullName || t('unknownSeller')}
            </Text>
            <TouchableOpacity
              onPress={() => handleFavoriteToggle(item)}
              style={styles.favoriteButton}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={20}
                color={isFavorite ? '#FF3040' : colors.text}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {item.title}{item.year ? `, ${item.year}` : ''}
          </Text>

          <Text style={styles.price}>
            ₺{item.price ? Number(item.price).toLocaleString('tr-TR') : '0'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={isDarkTheme ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={styles.topButtonsContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color={isDarkTheme ? '#FFF' : '#333'} />
        </TouchableOpacity>

        {isOwner && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              navigation.navigate('UpdateProduct', { product: productData })
            }
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={26} color={isDarkTheme ? '#FFF' : '#333'} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {renderImages()}

        <View style={styles.content}>
          {loadingOwner ? (
            <ActivityIndicator size="small" color={colors.secondaryText} />
          ) : (
            ownerData && (
              <View style={styles.ownerHeader}>
                <TouchableOpacity
                  onPress={goToUserProfile}
                  style={styles.ownerContainer}
                >
                  {ownerData.profilePicture && (
                    <Image
                      source={{ uri: ownerData.profilePicture }}
                      style={styles.ownerImage}
                    />
                  )}
                  <Text style={styles.ownerName}>
                    {ownerData.fullName ||
                      ownerData.email ||
                      t('unknown')}
                  </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {/* Odada Gör — Sadece İkon */}
                  <TouchableOpacity
                    onPress={handleViewInRoom}
                    style={styles.iconActionButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="easel-outline" size={22} color={colors.text} />
                  </TouchableOpacity>

                  {/* Favori Butonu */}
                  <TouchableOpacity
                    onPress={() =>
                      isFavoriteItem
                        ? removeFavorite(productData.id)
                        : addFavorite(productData as FavoriteItem)
                    }
                    style={styles.favoriteButtonNew}
                  >
                    <Ionicons
                      name={isFavoriteItem ? 'heart' : 'heart-outline'}
                      size={26}
                      color={isFavoriteItem ? '#FF3040' : colors.text}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )
          )}

          <Text style={styles.mainTitle}>
            {productData.title}
            {productData.year && `, ${productData.year}`}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={[styles.mainPrice, { marginBottom: 0 }]}>
              {productData.price ? `₺${Number(productData.price).toLocaleString('tr-TR')}` : t('unknown')}
            </Text>
            
            {productData.isSold ? (
              <View style={styles.soldBadge}>
                <Text style={styles.soldBadgeText}>SATILDI</Text>
              </View>
            ) : null}
          </View>

          {/* Inline Satın Al butonu (scroll içi) kaldırıldı — alt bara taşındı */}

          <Text style={styles.description}>
            {productData.description || t('noDescription')}
          </Text>

          <View style={styles.divider} />

          {productData.dimensions && (
            <Text style={styles.detail}>
              {t('dimension')}:{' '}
              {['height', 'width']
                .map((key) =>
                  productData.dimensions
                    ? productData.dimensions[
                    key as keyof typeof productData.dimensions
                    ]
                    : null
                )
                .filter(Boolean)
                .join(' × ')}{' '}
              cm
            </Text>
          )}

          <Text style={styles.detail}>
            {t('category')}: {getCategoryLabel(productData.category)}
          </Text>
          {productData.createdAt && (
            <Text style={styles.detail}>
              {t('addedDate')}: {formatDate(productData.createdAt)}
              {isProductNew && (
                <Text style={{ color: '#FF3040', fontWeight: 'bold' }}> ({t('newBadge').toLowerCase()})</Text>
              )}
            </Text>
          )}
        </View>

        {loadingOtherProducts ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.otherProductsContainer}>
            <View style={styles.otherProductsHeader}>
              <Text style={styles.otherProductsTitle}>
                {ownerData?.fullName || t('seller')} {t('otherProducts')}
              </Text>
            </View>

            {otherProducts.length > 0 ? (
              <FlatList
                data={otherProducts}
                renderItem={renderOtherProductItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 15 }}
              />
            ) : (
              <Text style={styles.noOtherProductsText}>
                {t('noOtherProducts')}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {productData.ownerId && currentUser && (
        <View style={[
          styles.messageButtonContainer,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }
        ]}>
          {/* Mesaj Butonu — sahip olmayan kullanıcılara göster */}
          {!isOwner && (
            <TouchableOpacity
              style={styles.messageButton}
              onPress={handleSendMessage}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.background} />
              <Text style={[styles.messageButtonText, { color: colors.background }]}>{t('sendMessage')}</Text>
            </TouchableOpacity>
          )}

          {/* Satın Al Butonu — sahip olmayan kullanıcılara, satılmamış ürünlerde */}
          {!isOwner && !productData.isSold && (
            <TouchableOpacity
              style={[styles.buyButtonBar, isBuying && { opacity: 0.7 }]}
              onPress={handleBuy}
              disabled={isBuying}
              activeOpacity={0.8}
            >
              {isBuying ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buyButtonText}>Satın Al</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Sahip ise sadece Odada Gör — tam genişlikte */}
          {isOwner && (
            <TouchableOpacity
              style={[styles.arButton, { flex: 1 }]}
              onPress={handleViewInRoom}
              activeOpacity={0.8}
            >
              <Ionicons name="easel-outline" size={22} color={colors.text} />
              <Text style={[styles.arButtonText, { color: colors.text }]}>{t('viewInRoom')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ImageViewing
        images={imagesArray}
        imageIndex={activeIndex}
        visible={isImageViewVisible}
        onRequestClose={() => setIsImageViewVisible(false)}
        backgroundColor={colors.background}
        HeaderComponent={({ imageIndex }: { imageIndex: number }, _ref?: any) => (
          <View style={[styles.imageHeaderContainer, { paddingTop: insets.top }]}>
            <TouchableOpacity
              style={styles.imageCloseButton}
              onPress={() => setIsImageViewVisible(false)}
            >
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
        FooterComponent={({ imageIndex }: { imageIndex: number }, _ref?: any) => (
          <View style={[styles.squareIndicatorContainerFullScreen, { paddingBottom: insets.bottom + 20 }]}>
            {imagesArray.map((_, idx) => (
              <View
                key={`dot-fullscreen-${idx}`}
                style={[
                  styles.squareDot,
                  {
                    backgroundColor:
                      imageIndex === idx
                        ? '#FFF'
                        : 'rgba(255, 255, 255, 0.5)',
                  },
                ]}
              />
            ))}
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default ProductDetailScreen;

const createStyles = (colors: any, isDarkTheme: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  backButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: isDarkTheme ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)',
  },
  editButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: isDarkTheme ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)',
  },
  mainImageContainer: { height: height * 0.6 },
  mainImage: { width, height: height * 0.6 },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  squareIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },

  content: { paddingHorizontal: 20, paddingTop: 10 },
  ownerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ownerContainer: { flexDirection: 'row', alignItems: 'center' },
  ownerImage: { width: 38, height: 38, borderRadius: 19, marginRight: 10 },
  ownerName: { fontSize: 15, color: colors.secondaryText },
  favoriteButtonNew: {
    backgroundColor: colors.card,
    padding: 8,
    borderRadius: 50,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  mainPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 20,
  },
  detail: { fontSize: 15, color: colors.secondaryText, marginBottom: 6 },
  divider: {
    height: 1,
    backgroundColor: isDarkTheme ? '#333' : '#E0E0E0',
    marginVertical: 16,
    opacity: 0.5,
  },
  otherProductsContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: isDarkTheme ? '#333' : '#EEE',
    paddingTop: 16,
    minHeight: 100,
  },
  otherProductsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  otherProductsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  noOtherProductsText: {
    fontSize: 14,
    color: colors.secondaryText,
    paddingHorizontal: 20,
    fontStyle: 'italic',
  },

  card: {
    borderRadius: 12,
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    width: cardWidth,
    marginRight: 10,
    marginLeft: 5,
  },
  imageContainer: {
    padding: 10,
    height: 'auto',
  },
  image: {
    width: '100%',
    resizeMode: 'cover',
    borderRadius: 8,
  },
  noImage: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8E8E8',
    borderRadius: 8,
  },
  noImageText: {
    color: colors.secondaryText,
  },
  infoContainer: {
    padding: 12,
    paddingTop: 0,
    backgroundColor: colors.card,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  username: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  favoriteButton: {
    padding: 2,
  },
  title: {
    fontSize: 15,
    color: colors.secondaryText,
    marginBottom: 8,
    lineHeight: 20,
  },
  price: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
  },

  messageButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    borderTopWidth: 1,
    borderTopColor: colors.card,
  },
  messageButton: {
    flex: 1,
    backgroundColor: colors.text,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  arButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.text,
  },
  arButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  imageHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
  },
  imageCloseButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    marginTop: 10,
  },
  squareIndicatorContainerFullScreen: {
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  squareDot: {
    width: 10,
    height: 10,
    borderRadius: 0,
  },
  soldBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  soldBadgeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  iconActionButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  buyButtonBar: {
    flex: 1,
    backgroundColor: '#111',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
});