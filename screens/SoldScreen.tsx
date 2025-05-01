import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const numColumns = 2;
const itemMargin = 10;
const screenWidth = Dimensions.get('window').width;
const itemWidth = (screenWidth - itemMargin * (numColumns + 1)) / numColumns;

const SoldScreen = () => {
  const [soldProducts, setSoldProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSoldProducts = async () => {
      try {
        const auth = getAuth();
        const firestore = getFirestore();
        const user = auth.currentUser;

        if (!user) return;

        const userRef = doc(firestore, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        const userData = userSnap.data();
        const sold = Array.isArray(userData?.soldProducts) ? userData.soldProducts : [];

        setSoldProducts(sold);
      } catch (err) {
        console.error('Satılan ürünler alınamadı:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSoldProducts();
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.itemContainer}>
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.image}
        resizeMode="cover"
      />
      <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
      {item.price && <Text style={styles.price}>{item.price} ₺</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#666" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {soldProducts.length === 0 ? (
        <Text style={styles.emptyText}>Henüz satılan ürün yok.</Text>
      ) : (
        <FlatList
          data={soldProducts}
          renderItem={renderItem}
          keyExtractor={(item, index) => index.toString()}
          numColumns={numColumns}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

export default SoldScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    color: '#888',
  },
  listContent: {
    paddingHorizontal: itemMargin,
  },
  itemContainer: {
    width: itemWidth,
    margin: itemMargin,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    padding: 10,
  },
  image: {
    width: itemWidth - 20,
    height: itemWidth - 20,
    borderRadius: 6,
  },
  title: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  price: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
  },
});
