import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { RouteProp, useRoute, NavigationProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../routes/types'
import { auth, db } from '../firebase';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { Product } from '../routes/types';

type OtherProfileRouteProp = RouteProp<RootStackParamList, 'OtherProfile'>;

const OtherProfileScreen = () => {
  const route = useRoute<OtherProfileRouteProp>();
  // Navigation'a tip veriyoruz:
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { userId } = route.params;

  const currentUser = auth.currentUser;
  const [userData, setUserData] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());

          // Takipte mi kontrolü:
          if (!currentUser?.uid) return;
          const currentUserRef = doc(db, 'users', currentUser.uid);
          const currentUserSnap = await getDoc(currentUserRef);
          const following = currentUserSnap.data()?.following || [];
          setIsFollowing(following.includes(userId));
        }

        // Kullanıcının ürünlerini çekiyoruz, id'yi ilk yazıyoruz:
        const q = query(collection(db, 'products'), where('ownerId', '==', userId));
        const snapshot = await getDocs(q);
        const productList = snapshot.docs.map((doc) => {
          const data = doc.data() as Product;
          // Eğer data içinde id varsa, onu sil veya almadan kullan:
          const { id, ...rest } = data as any; // id'yi ayırıp atmıyoruz
          return {
            id: doc.id,  // kesinlikle bu id geçerli olacak
            ...rest,
          };
        });


        setProducts(productList);
      } catch (error) {
        console.error('Kullanıcı profili alınamadı:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, currentUser?.uid]);

  // Takip Et / Takipten Çık fonksiyonu
  const toggleFollow = async () => {
    if (!currentUser?.uid) return;

    const currentUserRef = doc(db, 'users', currentUser.uid);
    const targetUserRef = doc(db, 'users', userId);

    try {
      if (isFollowing) {
        await updateDoc(currentUserRef, {
          following: arrayRemove(userId),
        });
        await updateDoc(targetUserRef, {
          followers: arrayRemove(currentUser.uid),
        });
      } else {
        await updateDoc(currentUserRef, {
          following: arrayUnion(userId),
        });
        await updateDoc(targetUserRef, {
          followers: arrayUnion(currentUser.uid),
        });
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Takip işlemi hatası:', error);
    }
  };

  // Ürün detayına gitme fonksiyonu
  const goToProductDetail = (product: Product) => {
    navigation.navigate('ProductDetail', { product });
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#000" />;
  }

  return (
    <View style={styles.container}>
      {userData?.profilePicture ? (
        <Image source={{ uri: userData.profilePicture }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: '#ccc' }]} />
      )}
      <Text style={styles.username}>{userData?.username || 'Kullanıcı'}</Text>
      <Text style={styles.bio}>{userData?.bio || 'Açıklama yok.'}</Text>

      <TouchableOpacity onPress={toggleFollow} style={styles.followButton}>
        <Text style={styles.followText}>
          {isFollowing ? 'Takibi Bırak' : 'Takip Et'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Ürünleri</Text>
      {products.length === 0 ? (
        <Text style={styles.emptyText}>Henüz ürün eklememiş.</Text>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.productList}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => goToProductDetail(item)}
              style={styles.productCard}
            >
              <Image source={{ uri: item.imageUrl || item.image }} style={styles.productImage} />
              <Text numberOfLines={1} style={styles.productTitle}>{item.title}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

export default OtherProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  avatar: { width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginBottom: 10 },
  username: { fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  bio: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 10 },
  followButton: {
    backgroundColor: '#0066cc',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
    alignSelf: 'center',
  },
  followText: { color: '#fff', fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  emptyText: { textAlign: 'center', color: '#777' },
  productList: { gap: 15 },
  productCard: {
    flex: 1,
    margin: 5,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    overflow: 'hidden',
  },
  productImage: { width: '100%', height: 100 },
  productTitle: { padding: 5, fontSize: 14 },
});
