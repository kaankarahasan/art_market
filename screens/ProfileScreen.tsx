import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import { useFavorites } from '../contexts/FavoritesContext';
import { useSold } from '../contexts/SoldContext';
import { Ionicons } from '@expo/vector-icons';

const dummyUser = {
  username: 'John Doe',
  profilePicture: 'https://randomuser.me/api/portraits/men/1.jpg',
  followers: 1200,
  following: 180,
  bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum.',
  products: [
    { id: '1', title: 'Product 1', image: 'https://picsum.photos/id/1015/200/200' },
    { id: '2', title: 'Product 2', image: 'https://picsum.photos/id/1016/200/200' },
    { id: '3', title: 'Product 3', image: 'https://picsum.photos/id/1018/200/200' },
    { id: '4', title: 'Product 4', image: 'https://picsum.photos/id/1020/200/200' },
    { id: '5', title: 'Product 5', image: 'https://picsum.photos/id/1021/200/200' },
    { id: '6', title: 'Product 6', image: 'https://picsum.photos/id/1024/200/200' },
    { id: '7', title: 'Product 7', image: 'https://picsum.photos/id/1015/200/200' },
    { id: '8', title: 'Product 8', image: 'https://picsum.photos/id/1016/200/200' },
    { id: '9', title: 'Product 9', image: 'https://picsum.photos/id/1018/200/200' },
  ],
};

const numColumns = 2;
const itemSize = Dimensions.get('window').width / numColumns - 30;

const ProfileScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { addToFavorites, removeFromFavorites, favorites } = useFavorites();
  const { soldCount } = useSold();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<any>>(null);
  const [productsPositionY, setProductsPositionY] = useState(0);

  const { username, profilePicture, followers, following, bio, products } = dummyUser;

  const isFavorite = (productId: string) => favorites.some(fav => fav.id === productId);

  const handleFavorite = (item: typeof products[0]) => {
    isFavorite(item.id) ? removeFromFavorites(item.id) : addToFavorites(item);
  };

  const handleScrollToProducts = () => {
    flatListRef.current?.scrollToOffset({ offset: productsPositionY, animated: true });
  };

  const renderProduct = ({ item }: { item: typeof products[0] }) => (
    <View style={styles.productCard}>
      <TouchableOpacity
        onPress={() => navigation.navigate('ProductDetail', { product: item })}
        style={styles.imageWrapper}
      >
        <Image source={{ uri: item.image }} style={styles.productImage} />
      </TouchableOpacity>
      <Text style={styles.productTitle}>{item.title}</Text>
      <TouchableOpacity onPress={() => handleFavorite(item)} style={styles.favoriteButton}>
        <Ionicons
          name={isFavorite(item.id) ? 'heart' : 'heart-outline'}
          size={20}
          color={isFavorite(item.id) ? 'red' : 'gray'}
        />
      </TouchableOpacity>
    </View>
  );

  const ListHeader = () => (
    <>
      <View style={styles.headerContainer}>
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={() => { setModalVisible(true); setSelectedImage(profilePicture); }}>
            <Image source={{ uri: profilePicture }} style={styles.profileImage} />
          </TouchableOpacity>
          <View style={styles.userInfo}>
            <Text style={styles.username}>{username}</Text>

            <View style={styles.gridStatsContainer}>
              <View style={styles.gridRow}>
                <TouchableOpacity onPress={handleScrollToProducts} style={styles.gridItem}>
                  <Text style={styles.gridNumber}>{products.length}</Text>
                  <Text style={styles.gridLabel}>Products</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Sold')} style={styles.gridItem}>
                  <Text style={styles.gridNumber}>{soldCount}</Text>
                  <Text style={styles.gridLabel}>Sold</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.gridRow}>
                <TouchableOpacity onPress={() => navigation.navigate('Followers')} style={styles.gridItem}>
                  <Text style={styles.gridNumber}>{followers}</Text>
                  <Text style={styles.gridLabel}>Followers</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Following')} style={styles.gridItem}>
                  <Text style={styles.gridNumber}>{following}</Text>
                  <Text style={styles.gridLabel}>Following</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.bio}>{bio}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <View onLayout={e => setProductsPositionY(e.nativeEvent.layout.y)}>
        <Text style={styles.sectionTitle}>My Products</Text>
      </View>
    </>
  );

  return (
    <>
      <FlatList
        ref={flatListRef}
        data={products}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        numColumns={numColumns}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.flatListContainer}
        ListHeaderComponent={ListHeader}
      />

      <Modal
        visible={modalVisible}
        transparent
        onRequestClose={() => setModalVisible(false)}
        animationType="fade"
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
              <View style={styles.modalImageContainer}>
                <Image source={{ uri: selectedImage || '' }} style={styles.modalImage} />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  flatListContainer: {
    padding: 15,
    paddingBottom: 50,
  },
  headerContainer: {
    marginBottom: 20,
    position: 'relative', // önemli!
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsButton: {
    position: 'absolute', // önemli!
    top: 0,
    right: 0,
    padding: 8,
    zIndex: 1,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  gridStatsContainer: {
    marginTop: 10,
    flexDirection: 'column',
    gap: 8,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginHorizontal: 5,
  },
  gridNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  gridLabel: {
    fontSize: 12,
    color: '#666',
  },
  bio: {
    fontSize: 13,
    color: '#333',
    marginTop: 10,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 20,
  },
  row: {
    justifyContent: 'space-evenly',
    marginBottom: 15,
  },
  productCard: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    width: itemSize,
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 10,
  },
  imageWrapper: {
    width: itemSize - 20,
    height: 120,
    marginBottom: 10,
  },
  productImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  favoriteButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageContainer: {
    width: '90%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
});

export default ProfileScreen;
