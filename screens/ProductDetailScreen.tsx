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
} from 'react-native';
import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import { RootStackParamList, Product } from '../routes/types';
import { Ionicons } from '@expo/vector-icons';
import { useFavorites } from '../contexts/FavoritesContext';
import { getDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import ImageViewing from 'react-native-image-viewing';

type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

const { width, height } = Dimensions.get('window');

const COLORS = {
  divider: '#333333',
  secondaryText: '#6E6E6E',
  card: '#F4F4F4',
  primaryText: '#0A0A0A',
  background: '#FFFFFF',
  favoriteIcon: '#333333',
  activeDot: '#000000',
  inactiveDot: '#C4C4C4',
};

const ProductDetailScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<ProductDetailRouteProp>();
  const { product } = route.params;
  const { favorites, addToFavorites, removeFromFavorites } = useFavorites();

  const currentUser = auth.currentUser;
  const [productData, setProductData] = useState<Product>(() => {
    const pd: any = { ...product };
    Object.keys(pd).forEach((key) => {
      const value = pd[key];
      if (value && typeof value.toDate === 'function') {
        pd[key] = value.toDate();
      }
    });
    return pd;
  });
  const [ownerData, setOwnerData] = useState<{ username?: string; email?: string; profilePicture?: string } | null>(null);
  const [loadingOwner, setLoadingOwner] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const isFavorite = favorites.some((fav) => fav.id === productData.id);
  const isOwner = productData.ownerId === currentUser?.uid;

  const dynamicTopMargin = height * 0.1;

  useEffect(() => {
    const fetchOwnerData = async () => {
      if (!productData.ownerId) return;
      setLoadingOwner(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', productData.ownerId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setOwnerData({
            username: data.username,
            email: data.email,
            profilePicture: data.photoURL || '',
          });
        }
      } catch (error) {
        console.error('Kullanıcı verisi alınırken hata:', error);
      } finally {
        setLoadingOwner(false);
      }
    };
    fetchOwnerData();
  }, [productData.ownerId]);

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
              if (value && typeof value.toDate === 'function') {
                data[key] = value.toDate();
              }
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
    if (isOwner) navigation.navigate('Profile', { userId: undefined });
    else navigation.navigate('OtherProfile', { userId: productData.ownerId });
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
        <View style={[styles.imageContainer, styles.imagePlaceholder]}>
          <Ionicons name="image-outline" size={64} color={COLORS.secondaryText} />
          <Text style={{ color: COLORS.secondaryText, marginTop: 8 }}>Görsel bulunamadı</Text>
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
          style={styles.imageContainer}
        >
          {images.map((uri, index) => (
            <TouchableOpacity key={index} onPress={() => setIsImageViewVisible(true)}>
              <Image source={{ uri }} style={styles.image} resizeMode="contain" />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.squareIndicatorContainer}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.squareDot,
                { backgroundColor: activeIndex === index ? COLORS.activeDot : COLORS.inactiveDot },
              ]}
            />
          ))}
        </View>

        <View style={{ height: 20 }} />
      </View>
    );
  };

  const renderDimensions = () => {
    const dimensions = (productData as any).dimensions;
    if (!dimensions) return null;
    const { height, width, depth } = dimensions;
    const parts = [];
    if (height) parts.push(`Y: ${height}`);
    if (width) parts.push(`G: ${width}`);
    if (depth) parts.push(`K: ${depth}`);
    return <Text style={styles.detail}>📐 Boyut: {parts.join(' × ')} cm</Text>;
  };

  const imagesArray = Array.isArray(productData.imageUrls)
    ? productData.imageUrls.filter((url) => url && url.trim() !== '').map((uri) => ({ uri }))
    : productData.imageUrls
    ? [{ uri: productData.imageUrls }]
    : [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Geri ve edit butonları */}
      <View style={styles.topButtonsContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#333333" />
        </TouchableOpacity>

        {isOwner && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('UpdateProduct', { product: productData })}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={26} color="#333333" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
        {renderImages()}

        <View style={styles.content}>
          {loadingOwner ? (
            <ActivityIndicator size="small" color={COLORS.secondaryText} />
          ) : (
            ownerData && (
              <View style={styles.ownerHeader}>
                <TouchableOpacity onPress={goToUserProfile} style={styles.ownerContainer}>
                  {ownerData.profilePicture && (
                    <Image source={{ uri: ownerData.profilePicture }} style={styles.ownerImage} />
                  )}
                  <Text style={styles.ownerName}>
                    {ownerData.username || ownerData.email || 'Bilinmiyor'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    isFavorite
                      ? removeFromFavorites(productData.id)
                      : addToFavorites(productData)
                  }
                  style={styles.favoriteButtonNew}
                >
                  <Ionicons
                    name={isFavorite ? 'heart' : 'heart-outline'}
                    size={26}
                    color={COLORS.favoriteIcon}
                  />
                </TouchableOpacity>
              </View>
            )
          )}

          <Text style={styles.title}>
            {productData.title}
            {productData.year && `, ${productData.year}`}
          </Text>

          <Text style={styles.price}>
            {productData.price ? `${productData.price} ₺` : 'Belirtilmemiş'}
          </Text>

          <Text style={styles.description}>
            {productData.description || 'Bu ürün hakkında detaylı bilgi bulunmamaktadır.'}
          </Text>

          <View style={styles.divider} />

          {renderDimensions()}
          <Text style={styles.detail}>📦 Kategori: {productData.category || 'Bilinmiyor'}</Text>
          {productData.createdAt && (
            <Text style={styles.detail}>
              📅 Eklenme Tarihi: {formatDate(productData.createdAt)}
            </Text>
          )}
        </View>
      </ScrollView>

      <ImageViewing
        images={imagesArray}
        imageIndex={activeIndex}
        visible={isImageViewVisible}
        onRequestClose={() => setIsImageViewVisible(false)}
        backgroundColor={COLORS.background}
        FooterComponent={({ imageIndex }) => (
          <View style={styles.squareIndicatorContainerFullScreen}>
            {imagesArray.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.squareDot,
                  { backgroundColor: imageIndex === idx ? COLORS.activeDot : COLORS.inactiveDot },
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    marginBottom: 0,
    paddingBottom: 0,
  },
  topButtonsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 50,
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
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  editButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  imageContainer: {
    height: height * 0.6,
  },
  image: {
    width,
    height: height * 0.6,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.card,
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
  squareDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  ownerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ownerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  ownerName: {
    fontSize: 15,
    color: COLORS.secondaryText,
  },
  favoriteButtonNew: {
    backgroundColor: COLORS.card,
    padding: 8,
    borderRadius: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.primaryText,
    marginBottom: 8,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: COLORS.primaryText,
    lineHeight: 22,
    marginBottom: 20,
  },
  detail: {
    fontSize: 15,
    color: COLORS.secondaryText,
    marginBottom: 6,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 16,
    opacity: 0.2,
  },
});
