import React, { useLayoutEffect, useState, useEffect, useCallback } from 'react';
import {
  Text,
  Image,
  StyleSheet,
  Button,
  TouchableOpacity,
  ActivityIndicator,
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

type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;

const ProductDetailScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<ProductDetailRouteProp>();
  const { product } = route.params;
  const { favorites, addToFavorites, removeFromFavorites } = useFavorites();

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
          console.warn('⚠️ Kullanıcı Firestore’da bulunamadı.');
        }
      } catch (error) {
        console.error('🔥 Kullanıcı verisi alınırken hata:', error);
      } finally {
        setLoadingOwner(false);
      }
    };

    fetchOwnerData();
  }, [productData.ownerId]);

  // Geri dönünce ürünü tekrar getir
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

  return (
    <SafeAreaView style={styles.container}>
      <Image source={{ uri: productData.imageUrl }} style={styles.image} />

      <TouchableOpacity
        onPress={() =>
          isFavorite ? removeFromFavorites(productData.id) : addToFavorites(productData)
        }
        style={styles.favoriteButton}
      >
        <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color="red" />
      </TouchableOpacity>

      <Text style={styles.title}>{productData.title}</Text>

      {loadingOwner ? (
        <ActivityIndicator size="small" color="#666" />
      ) : ownerData ? (
        <TouchableOpacity onPress={goToUserProfile}>
          {ownerData.profilePicture && ownerData.profilePicture.length > 5 && (
            <Image source={{ uri: ownerData.profilePicture }} style={styles.ownerImage} />
          )}
          <Text style={[styles.ownerName, { textDecorationLine: 'underline', color: '#0066cc' }]}>
            👤 Satıcı: {ownerData.username || ownerData.email || 'Bilinmiyor'}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.ownerName}>👤 Satıcı bilgisi yok</Text>
      )}

      <Text style={styles.detail}>📦 Kategori: {productData.category || 'Bilinmiyor'}</Text>
      <Text style={styles.detail}>
        💰 Fiyat: {productData.price ? `${productData.price} ₺` : 'Belirtilmemiş'}
      </Text>
      {productData.createdAt && (
        <Text style={styles.detail}>📅 Eklenme Tarihi: {formatDate(productData.createdAt)}</Text>
      )}

      <Text style={styles.description}>
        {productData.description || 'Bu ürün hakkında detaylı bilgi bulunmamaktadır.'}
      </Text>

      {isOwner && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('UpdateProduct', { product: productData })}
        >
          <Text style={styles.editButtonText}>Ürünü Güncelle</Text>
        </TouchableOpacity>
      )}

      <Button title="← Galeriye Dön" onPress={() => navigation.goBack()} />
    </SafeAreaView>
  );
};

export default ProductDetailScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff', position: 'relative' },
  image: { width: '100%', height: 300, borderRadius: 12, marginBottom: 20 },
  favoriteButton: {
    position: 'absolute',
    top: 60,
    right: 30,
    backgroundColor: '#ffffffcc',
    padding: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 10 },
  description: { fontSize: 16, color: '#333', marginTop: 10, marginBottom: 20 },
  detail: { fontSize: 15, color: '#555', marginBottom: 5 },
  ownerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  ownerImage: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  ownerName: { fontSize: 16, color: '#888', marginBottom: 5 },
  editButton: {
    backgroundColor: '#0066cc',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
    alignItems: 'center',
  },
  editButtonText: { color: '#fff', fontWeight: 'bold' },
});
