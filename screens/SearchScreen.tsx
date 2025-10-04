import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes/types';
import { Ionicons } from '@expo/vector-icons';

type Product = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  ownerId: string;
  category?: string;
  dimensions?: {
    height: number | null;
    width: number | null;
    depth: number | null;
  };
};

type User = {
  id: string;
  fullName: string;
  username?: string;
  profileImage?: string;
};

type Category = {
  id: string;
  name: string;
};

const SearchScreen = () => {
  const [searchText, setSearchText] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const filterOptions = [
    { id: '1', label: 'Boyut' },
    { id: '2', label: 'Renk' },
    { id: '3', label: 'Ücret' },
    { id: '4', label: 'Sanatçı' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productSnap = await getDocs(collection(db, 'products'));
        const userSnap = await getDocs(collection(db, 'users'));
        const categorySnap = await getDocs(collection(db, 'categories'));

        const products: Product[] = productSnap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Product, 'id'>),
        }));

        const users: User[] = userSnap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<User, 'id'>),
        }));

        const cats: Category[] = categorySnap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Category, 'id'>),
        }));

        setAllProducts(products);
        setAllUsers(users);
        setCategories(cats);
      } catch (error) {
        console.error('Veri çekme hatası:', error);
      }
    };

    fetchData();
  }, []);

  const parseDimensions = (text: string) => {
    const patterns = [
      /(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/,
      /(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          height: parseFloat(match[1]),
          width: parseFloat(match[2]),
          depth: match[3] ? parseFloat(match[3]) : null,
        };
      }
    }
    return null;
  };

  const matchesDimensions = (product: Product, searchDimensions: any) => {
    if (!product.dimensions) return false;

    const { height, width, depth } = product.dimensions;
    const tolerance = 5;

    const heightMatch = searchDimensions.height
      ? height && Math.abs(height - searchDimensions.height) <= tolerance
      : true;
    const widthMatch = searchDimensions.width
      ? width && Math.abs(width - searchDimensions.width) <= tolerance
      : true;
    const depthMatch = searchDimensions.depth
      ? depth && Math.abs(depth - searchDimensions.depth) <= tolerance
      : true;

    return heightMatch && widthMatch && depthMatch;
  };

  useEffect(() => {
    const search = (searchText ?? '').toLowerCase().trim();

    const searchDimensions = parseDimensions(search);

    const filteredP = allProducts.filter((item) => {
      if (searchDimensions) {
        return matchesDimensions(item, searchDimensions);
      }

      const titleMatch = item.title.toLowerCase().includes(search);
      const descriptionMatch = item.description.toLowerCase().includes(search);
      const categoryMatch = item.category?.toLowerCase().includes(search) ?? false;

      return titleMatch || descriptionMatch || categoryMatch;
    });

    const filteredU = allUsers.filter(
      (user) =>
        user.fullName.toLowerCase().includes(search) ||
        (user.username?.toLowerCase().includes(search) ?? false)
    );

    setFilteredProducts(filteredP);
    setFilteredUsers(filteredU);
  }, [searchText, allProducts, allUsers]);

  const clearSearch = () => {
    setSearchText('');
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ProductDetail', { product: item })}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.image} />
      <View style={styles.cardContent}>
        <Text style={styles.title}>{item.title}</Text>
        <Text numberOfLines={2} style={styles.description}>
          {item.description}
        </Text>
        {item.category && (
          <View style={styles.productCategoryBadge}>
            <Text style={styles.productCategoryText}>{item.category}</Text>
          </View>
        )}
        {item.dimensions && (item.dimensions.height || item.dimensions.width || item.dimensions.depth) && (
          <Text style={styles.dimensionText}>
            {[
              item.dimensions.height && `Y:${item.dimensions.height}`,
              item.dimensions.width && `G:${item.dimensions.width}`,
              item.dimensions.depth && `K:${item.dimensions.depth}`,
            ]
              .filter(Boolean)
              .join(' × ')}{' '}
            cm
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => navigation.navigate('OtherProfile', { userId: item.id })}
    >
      <Image
        source={
          item.profileImage
            ? { uri: item.profileImage }
            : require('../assets/default-profile.png')
        }
        style={styles.avatar}
      />
      <View>
        <Text style={styles.userName}>{item.fullName}</Text>
        {item.username && <Text style={styles.userUsername}>@{item.username}</Text>}
      </View>
    </TouchableOpacity>
  );

  const renderFilterBox = ({ item }: { item: { id: string; label: string } }) => (
    <View style={styles.filterBox}>
      <Text style={styles.filterBoxText}>{item.label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            placeholder="Ara..."
            value={searchText}
            onChangeText={(text) => setSearchText(text ?? '')}
            style={styles.input}
            placeholderTextColor="#999"
          />
          {searchText.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {(searchText?.trim() ?? '') === '' ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.exploreTitle}>Kategorileri Keşfedin</Text>
          <FlatList
            data={filterOptions}
            keyExtractor={(item) => item.id}
            renderItem={renderFilterBox}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.filterRow}
          />
        </ScrollView>
      ) : (
        <>
          {filteredUsers.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Kullanıcılar</Text>
              <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id}
                renderItem={renderUser}
              />
            </>
          )}

          {filteredProducts.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Ürünler</Text>
              <FlatList
                data={filteredProducts}
                keyExtractor={(item) => item.id}
                renderItem={renderProduct}
              />
            </>
          )}

          {filteredUsers.length === 0 && filteredProducts.length === 0 && (
            <Text style={styles.noResultText}>Sonuç bulunamadı.</Text>
          )}
        </>
      )}
    </View>
  );
};

export default SearchScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: '#fff',
  },
  searchWrapper: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  exploreTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#111',
  },
  filterRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterBox: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    marginHorizontal: 6,
    paddingVertical: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterBoxText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    position: 'absolute',
    top: 12,
    left: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    color: '#555',
    fontSize: 14,
    marginTop: 4,
  },
  productCategoryBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  productCategoryText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  dimensionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 10,
    backgroundColor: '#ccc',
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  userUsername: {
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 8,
  },
  noResultText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
});