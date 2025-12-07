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
import { Ionicons } from '@expo/vector-icons';
import {
  useFavoriteUsers,
  FavoriteUser,
  useFavoriteItems,
  FavoriteItem,
} from '../contexts/FavoritesContext';
import {
  getDoc,
  doc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import ImageViewing from 'react-native-image-viewing';
// YENİ EKLENDİ: Güvenli alan için
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

import { useThemeContext } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

const cardWidth = width * 0.45;

const ProductDetailScreen = () => {
  const { colors, isDarkTheme } = useThemeContext();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, 'ProductDetail'>>();
  const route = useRoute<ProductDetailRouteProp>();
  const { product } = route.params;

  const { favoriteUsers, addToFavoriteUsers, removeFromFavoriteUsers } =
    useFavoriteUsers();
  const { favoriteItems, addFavorite, removeFavorite } = useFavoriteItems();

  const insets = useSafeAreaInsets(); // YENİ EKLENDİ
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

  const styles = React.useMemo(() => createStyles(colors, isDarkTheme), [colors, isDarkTheme]);

  const scrollRef = useRef<ScrollView>(null);

  const isOwner = productData.ownerId === currentUser?.uid;
  const dynamicTopMargin = height * 0.1;

  const isFavoriteItem = favoriteItems.some(
    (fav: FavoriteItem) => fav.id === productData.id
  );

  useFocusEffect(
    useCallback(() => {
      const parent = navigation.getParent<BottomTabNavigationProp<any>>();
      const defaultStyle = parent?.getState()?.routes[0]?.params?.tabBarStyle;
      parent?.setOptions?.({ tabBarStyle: { display: 'none' } });
      return () => {
        parent?.setOptions?.({ tabBarStyle: defaultStyle });
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
          setOwnerData({
            username: data.username,
            email: data.email,
            profilePicture: data.photoURL || '',
            fullName: data.fullName,
          });
        }
        const productsQuery = query(
          collection(db, 'products'),
          where('ownerId', '==', productData.ownerId),
          limit(10)
        );
        const querySnapshot = await getDocs(productsQuery);
        const fetchedProducts: Product[] = [];
        querySnapshot.forEach((doc) => {
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
          const docRef = doc(db, 'products', product.id);
          const docSnap = await getDoc(docRef);
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

  // YENİ EKLENDİ: Mesaj gönderme navigasyonu
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
            Görsel bulunamadı
          </Text>
        </View>
      );
    }

    return (
      <View style={{ marginTop: dynamicTopMargin }}>
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

  const handleFavoriteToggle = (item: Product) => {
    const isFav = favoriteItems.some(fav => fav.id === item.id);
    const imageUrl = Array.isArray(item.imageUrls) ? item.imageUrls[0] : item.imageUrls;

    const favItem: FavoriteItem = {
      id: item.id,
      title: item.title || 'Başlık Yok',
      username: ownerData?.username || 'Bilinmeyen',
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
              <Text style={styles.noImageText}>Resim yok</Text>
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.userRow}>
            <Text style={styles.username} numberOfLines={1}>
              {ownerData?.fullName || 'Satıcı'}
            </Text>
            <TouchableOpacity
              onPress={() => handleFavoriteToggle(item)}
              style={styles.favoriteButton}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={20}
                color={colors.text}
              />
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

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDarkTheme ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
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
        // YENİ: Butonun yer kaplaması için contentContainer'a paddingBottom eklendi
        // 80 (buton yüksekliği) + 20 (boşluk)
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
                      'Bilinmiyor'}
                  </Text>
                </TouchableOpacity>

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
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>
            )
          )}

          <Text style={styles.mainTitle}>
            {productData.title}
            {productData.year && `, ${productData.year}`}
          </Text>

          <Text style={styles.mainPrice}>
            {productData.price ? `${productData.price} ₺` : 'Belirtilmemiş'}
          </Text>

          <Text style={styles.description}>
            {productData.description ||
              'Bu ürün hakkında detaylı bilgi bulunmamaktadır.'}
          </Text>

          <View style={styles.divider} />

          {productData.dimensions && (
            <Text style={styles.detail}>
              Boyut:{' '}
              {['height', 'width', 'depth']
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
            Kategori: {productData.category || 'Bilinmiyor'}
          </Text>
          {productData.createdAt && (
            <Text style={styles.detail}>
              Eklenme Tarihi: {formatDate(productData.createdAt)}
            </Text>
          )}
        </View>

        {/* --- Diğer Ürünler Bölümü --- */}
        {loadingOtherProducts ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.otherProductsContainer}>
            <Text style={styles.otherProductsTitle}>
              {ownerData?.fullName || 'Satıcının'} Diğer Ürünleri
            </Text>

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
                Bu satıcının başka bir ürünü bulunmamaktadır.
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* --- YENİ EKLENDİ: Sabit Mesaj Butonu --- */}
      {!isOwner && productData.ownerId && currentUser && (
        <View style={[
          styles.messageButtonContainer,
          // Güvenli alan (çentik vs.) için alttan boşluk
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 6 : 12 }
        ]}>
          <TouchableOpacity
            style={styles.messageButton}
            onPress={handleSendMessage}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.background} />
            <Text style={[styles.messageButtonText, { color: colors.background }]}>Mesaj Gönder</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* --- YENİ BÖLÜM SONU --- */}


      <ImageViewing
        images={imagesArray}
        imageIndex={activeIndex}
        visible={isImageViewVisible}
        onRequestClose={() => setIsImageViewVisible(false)}
        backgroundColor={colors.background}
        FooterComponent={({ imageIndex }) => (
          <View style={styles.squareIndicatorContainerFullScreen}>
            {imagesArray.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.squareDot,
                  {
                    backgroundColor:
                      imageIndex === idx
                        ? colors.text
                        : colors.secondaryText,
                  },
                ]}
              />
            ))}
          </View>
        )}
      />
    </View>
  );
};

export default ProductDetailScreen;

const createStyles = (colors: any, isDarkTheme: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topButtonsContainer: {
    position: 'absolute',
    top:
      Platform.OS === 'ios'
        ? 50
        : StatusBar.currentHeight
          ? StatusBar.currentHeight + 10
          : 50,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  backButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: isDarkTheme ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)',
  },
  editButton: {
    padding: 6,
    borderRadius: 20,
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
  squareIndicatorContainerFullScreen: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 20,
  },
  squareDot: { width: 10, height: 10, borderRadius: 2 },
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
  otherProductsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  noOtherProductsText: {
    fontSize: 14,
    color: colors.secondaryText,
    paddingHorizontal: 20,
    fontStyle: 'italic',
  },

  // --- KART STİLLERİ ---
  card: {
    borderRadius: 12,
    overflow: 'hidden',
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

  // --- Mesaj Butonu Stilleri ---
  messageButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    borderTopWidth: 1,
    borderTopColor: colors.card,
  },
  messageButton: {
    backgroundColor: colors.text, // Zıt renk
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageButtonText: {
    // Rengi inline style ile veriyoruz
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});