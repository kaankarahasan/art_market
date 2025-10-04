import React, { useLayoutEffect, useState, useEffect, useCallback, useContext } from 'react';
import {
  Text,
  Image,
  StyleSheet,
  Button,
  TouchableOpacity,
  ActivityIndicator,
  View,
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
import { getDoc, doc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../contexts/ThemeContext';

type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

const ProductDetailScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<ProductDetailRouteProp>();
  const { product } = route.params;
  const { favorites, addToFavorites, removeFromFavorites } = useFavorites();

  const { colors } = useContext(ThemeContext);

  const currentUser = auth.currentUser;

  const [productData, setProductData] = useState<Product>(product);
  const [ownerData, setOwnerData] = useState<{
    username?: string;
    email?: string;
    profilePicture?: string;
  } | null>(null);
  const [loadingOwner, setLoadingOwner] = useState(false);

  const isFavorite = favorites.some((fav) => fav.id === productData.id);
  const isOwner = productData.ownerId === currentUser?.uid;

  useLayoutEffect(() => {
    navigation.setOptions({ tabBarStyle: { display: 'flex' } });
  }, [navigation]);

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
            profilePicture: data.profilePicture || '',
          });
        } else {
          console.warn('Kullanıcı bulunamadı');
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
            setProductData({ id: docSnap.id, ...docSnap.data() } as Product);
          }
        } catch (err) {
          console.error('Ürün güncellenirken hata:', err);
        }
      };

      fetchProduct();
    }, [product.id])
  );

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const goToUserProfile = () => {
    if (!productData.ownerId) return;
    if (isOwner) {
      navigation.navigate('Profile', { userId: undefined });
    } else {
      navigation.navigate('OtherProfile', { userId: productData.ownerId });
    }
  };

  const renderDimensions = () => {
    const dimensions = (productData as any).dimensions;
    if (!dimensions) return null;

    const { height, width, depth } = dimensions;
    const hasDimensions = height || width || depth;

    if (!hasDimensions) return null;

    const dimensionParts = [];
    if (height) dimensionParts.push(`Y: ${height}`);
    if (width) dimensionParts.push(`G: ${width}`);
    if (depth) dimensionParts.push(`K: ${depth}`);

    return (
      <Text style={[styles.detail, { color: colors.text }]}>
        📐 Boyut: {dimensionParts.join(' × ')} cm
      </Text>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Image source={{ uri: productData.imageUrl }} style={styles.image} />

      <TouchableOpacity
        onPress={() =>
          isFavorite ? removeFromFavorites(productData.id) : addToFavorites(productData)
        }
        style={[styles.favoriteButton, { backgroundColor: colors.card }]}
      >
        <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={colors.notification} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: colors.text }]}>{productData.title}</Text>

      {loadingOwner ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : ownerData ? (
        <TouchableOpacity onPress={goToUserProfile} style={styles.ownerContainer}>
          {ownerData.profilePicture && ownerData.profilePicture.length > 5 && (
            <Image source={{ uri: ownerData.profilePicture }} style={styles.ownerImage} />
          )}
          <Text
            style={[
              styles.ownerName,
              {
                textDecorationLine: 'underline',
                color: colors.primary,
              },
            ]}
          >
            👤 Satıcı: {ownerData.username || ownerData.email || 'Bilinmiyor'}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={[styles.ownerName, { color: colors.text }]}>👤 Satıcı bilgisi yok</Text>
      )}

      <Text style={[styles.detail, { color: colors.text }]}>📦 Kategori: {productData.category || 'Bilinmiyor'}</Text>
      <Text style={[styles.detail, { color: colors.text }]}>
        💰 Fiyat: {productData.price ? `${productData.price} ₺` : 'Belirtilmemiş'}
      </Text>
      {renderDimensions()}
      {productData.createdAt && (
        <Text style={[styles.detail, { color: colors.text }]}>
          📅 Eklenme Tarihi: {formatDate(productData.createdAt)}
        </Text>
      )}

      <Text style={[styles.description, { color: colors.text }]}>
        {productData.description || 'Bu ürün hakkında detaylı bilgi bulunmamaktadır.'}
      </Text>

      {isOwner && (
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('UpdateProduct', { product: productData })}
        >
          <Text style={[styles.editButtonText, { color: colors.background }]}>Ürünü Güncelle</Text>
        </TouchableOpacity>
      )}

      <Button
        title="← Galeriye Dön"
        color={colors.primary}
        onPress={() => navigation.goBack()}
      />
    </SafeAreaView>
  );
};

export default ProductDetailScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, position: 'relative' },
  image: { width: '100%', height: 300, borderRadius: 12, marginBottom: 20 },
  favoriteButton: {
    position: 'absolute',
    top: 60,
    right: 30,
    padding: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 10 },
  description: { fontSize: 16, marginTop: 10, marginBottom: 20 },
  detail: { fontSize: 15, marginBottom: 5 },
  ownerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  ownerImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  ownerName: { fontSize: 16, marginBottom: 5 },
  editButton: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
    alignItems: 'center',
  },
  editButtonText: { fontWeight: 'bold' },
});