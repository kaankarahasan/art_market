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

type Product = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  ownerId: string;
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

  useEffect(() => {
    const search = (searchText ?? '').toLowerCase();

    const filteredP = allProducts.filter(
      (item) =>
        item.title.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search)
    );

    const filteredU = allUsers.filter(
      (user) =>
        user.fullName.toLowerCase().includes(search) ||
        (user.username?.toLowerCase().includes(search) ?? false)
    );

    setFilteredProducts(filteredP);
    setFilteredUsers(filteredU);
  }, [searchText, allProducts, allUsers]);

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

  const renderCategory = (category: Category) => (
    <TouchableOpacity
      key={category.id}
      style={styles.category}
      onPress={() => setSearchText(category.name)} // kategoriye tıklayınca arama kutusuna yaz
    >
      <Text style={styles.categoryText}>{category.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Ürün veya kullanıcı ara..."
        value={searchText}
        onChangeText={(text) => setSearchText(text ?? '')}
        style={styles.input}
      />

      {(searchText?.trim() ?? '') === '' ? (
        <>
          <Text style={styles.sectionTitle}>Kategoriler</Text>
          <ScrollView contentContainerStyle={styles.categoriesContainer}>
            {categories.map(renderCategory)}
          </ScrollView>
        </>
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
            <Text>Sonuç bulunamadı.</Text>
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
  input: {
    backgroundColor: '#f2f2f2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
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
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  category: {
    backgroundColor: '#dedede',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
