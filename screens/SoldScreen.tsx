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
import { doc, getDoc } from '@react-native-firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { useThemeContext } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const numColumns = 2;
const itemMargin = 10;
const screenWidth = Dimensions.get('window').width;
const itemWidth = (screenWidth - itemMargin * (numColumns + 1)) / numColumns;

type SoldProduct = {
  id?: string;
  title: string;
  imageUrl: string;
  price?: number;
};

const SoldScreen = () => {
  const { colors } = useThemeContext();
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchSoldProducts = async () => {
      try {
        const user = auth.currentUser;

        if (!user) return;

        const userSnap = await getDoc(doc(db, 'users', user.uid));

        const userData = userSnap.data() as any;
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

  const renderItem = ({ item }: { item: SoldProduct }) => (
    <View style={[styles.itemContainer, { backgroundColor: colors.card }]}>
      <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
        {item.title}
      </Text>
      {item.price && (
        <Text style={[styles.price, { color: colors.text + 'cc' }]}>₺{Number(item.price).toLocaleString('tr-TR')}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {soldProducts.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.text + '99' }]}>
          {t('noSold')}
        </Text>
      ) : (
        <FlatList
          data={soldProducts}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.id ?? index.toString()}
          numColumns={numColumns}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

export default SoldScreen;

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 10 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 16 },
  listContent: { paddingHorizontal: itemMargin },
  itemContainer: {
    width: itemWidth,
    margin: itemMargin,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    padding: 10,
  },
  image: { width: itemWidth - 20, height: itemWidth - 20, borderRadius: 6 },
  title: { marginTop: 8, fontSize: 14, fontWeight: '600' },
  price: { marginTop: 4, fontSize: 13 },
});
