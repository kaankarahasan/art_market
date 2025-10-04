import React, { useState, useContext } from 'react';
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  Text,
  Alert,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { v4 as uuidv4 } from 'uuid';
import { ThemeContext } from '../contexts/ThemeContext';

const AddProductScreen = () => {
  const { isDarkTheme } = useContext(ThemeContext);
  const styles = getStyles(isDarkTheme);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [height, setHeight] = useState('');
  const [width, setWidth] = useState('');
  const [depth, setDepth] = useState('');

  const navigation = useNavigation();

  // Sanat kategorileri
  const categories = [
    { label: 'Yağlı Boya', value: 'yagliبoya' },
    { label: 'Suluboya', value: 'suluboya' },
    { label: 'Akrilik', value: 'akrilik' },
    { label: 'Heykel', value: 'heykel' },
    { label: 'Fotoğraf', value: 'fotograf' },
    { label: 'Dijital Sanat', value: 'dijital' },
    { label: 'Çizim', value: 'cizim' },
    { label: 'Grafik Tasarım', value: 'grafik' },
    { label: 'Seramik', value: 'seramik' },
    { label: 'Kolaj', value: 'kolaj' },
    { label: 'Diğer', value: 'diger' },
  ];

  // Galeriden resim seçme
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Hata', 'Galeriden resim seçmek için izin gerekli.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  // Kameradan fotoğraf çekme
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Hata', 'Kamerayı kullanmak için izin gerekli.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImageAsync = async (uri: string): Promise<string> => {
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const imageId = uuidv4();
      const imagePath = `product_images/${imageId}.jpg`;
      const imageRef = ref(storage, imagePath);

      await uploadBytes(imageRef, blob, { contentType: 'image/jpeg' });

      const downloadURL = await getDownloadURL(imageRef);
      return downloadURL;
    } catch (error: any) {
      Alert.alert('Hata', error.message ?? 'Resim yüklenemedi.');
      return '';
    } finally {
      setUploading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!title.trim() || !description.trim() || !price.trim() || !category.trim()) {
      Alert.alert('Uyarı', 'Lütfen tüm zorunlu alanları doldurun.');
      return;
    }

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı.');
        return;
      }

      const userDocRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userDocRef);
      const userData = userSnap.data();

      const username = userData?.username || 'Bilinmeyen';
      const userProfileImage = userData?.photoURL || '';

      let imageUrl = '';
      if (image) {
        imageUrl = await uploadImageAsync(image);
        if (!imageUrl) return;
      }

      // Boyut bilgilerini obje olarak hazırlama
      const dimensions = {
        height: height ? parseFloat(height) : null,
        width: width ? parseFloat(width) : null,
        depth: depth ? parseFloat(depth) : null,
      };

      await addDoc(collection(db, 'products'), {
        title,
        description,
        ownerId: userId,
        username,
        userProfileImage,
        price: parseFloat(price),
        category,
        dimensions,
        isSold: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        imageUrl,
      });

      Alert.alert('Başarılı', 'Ürün başarıyla eklendi.');
      setTitle('');
      setDescription('');
      setPrice('');
      setCategory('');
      setHeight('');
      setWidth('');
      setDepth('');
      setImage(null);
      navigation.goBack();
    } catch (error) {
      console.error('Ürün eklenirken hata:', error);
      Alert.alert('Hata', 'Ürün eklenirken bir sorun oluştu.');
    }
  };

  const selectCategory = (value: string) => {
    setCategory(value);
    setModalVisible(false);
  };

  const getCategoryLabel = (value: string) => {
    const cat = categories.find((c) => c.value === value);
    return cat ? cat.label : 'Kategori Seçin';
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Ürün Adı</Text>
      <TextInput
        style={styles.input}
        placeholder="Ürün adı girin"
        placeholderTextColor={isDarkTheme ? '#999' : '#999'}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Açıklama</Text>
      <TextInput
        style={[styles.input, { height: 100 }]}
        placeholder="Açıklama girin"
        placeholderTextColor={isDarkTheme ? '#999' : '#999'}
        multiline
        value={description}
        onChangeText={setDescription}
      />

      <Text style={styles.label}>Fiyat (₺)</Text>
      <TextInput
        style={styles.input}
        placeholder="Fiyat girin"
        placeholderTextColor={isDarkTheme ? '#999' : '#999'}
        keyboardType="numeric"
        value={price}
        onChangeText={setPrice}
      />

      <Text style={styles.label}>Kategori</Text>
      <TouchableOpacity
        style={styles.categorySelector}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.categorySelectorText, !category && styles.placeholder]}>
          {category ? getCategoryLabel(category) : 'Kategori Seçin'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Boyut (cm)</Text>
      <View style={styles.dimensionsContainer}>
        <View style={styles.dimensionInputWrapper}>
          <Text style={styles.dimensionLabel}>Yükseklik</Text>
          <TextInput
            style={styles.dimensionInput}
            placeholder="0"
            placeholderTextColor={isDarkTheme ? '#999' : '#999'}
            keyboardType="numeric"
            value={height}
            onChangeText={setHeight}
          />
        </View>
        <View style={styles.dimensionInputWrapper}>
          <Text style={styles.dimensionLabel}>Genişlik</Text>
          <TextInput
            style={styles.dimensionInput}
            placeholder="0"
            placeholderTextColor={isDarkTheme ? '#999' : '#999'}
            keyboardType="numeric"
            value={width}
            onChangeText={setWidth}
          />
        </View>
        <View style={styles.dimensionInputWrapper}>
          <Text style={styles.dimensionLabel}>Kalınlık</Text>
          <TextInput
            style={styles.dimensionInput}
            placeholder="0"
            placeholderTextColor={isDarkTheme ? '#999' : '#999'}
            keyboardType="numeric"
            value={depth}
            onChangeText={setDepth}
          />
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Kategori Seçin</Text>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.categoryItem}
                  onPress={() => selectCategory(item.value)}
                >
                  <Text style={styles.categoryItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 }}>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          <Text style={styles.imagePickerText}>Galeriden Resim Seç</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.imagePicker} onPress={takePhoto}>
          <Text style={styles.imagePickerText}>Kameradan Fotoğraf Çek</Text>
        </TouchableOpacity>
      </View>

      {image && <Image source={{ uri: image }} style={styles.previewImage} />}

      <Button
        title={uploading ? 'Yükleniyor...' : 'Kaydet'}
        onPress={handleAddProduct}
        disabled={uploading}
        color={isDarkTheme ? '#90caf9' : '#1976d2'}
      />
    </ScrollView>
  );
};

const getStyles = (isDarkTheme: boolean) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 20,
      backgroundColor: isDarkTheme ? '#121212' : '#fff',
    },
    input: {
      borderWidth: 1,
      borderColor: isDarkTheme ? '#444' : '#ccc',
      backgroundColor: isDarkTheme ? '#1e1e1e' : '#fff',
      color: isDarkTheme ? '#fff' : '#000',
      padding: 10,
      marginBottom: 15,
      borderRadius: 5,
    },
    label: {
      marginBottom: 5,
      fontWeight: 'bold',
      color: isDarkTheme ? '#eee' : '#111',
    },
    categorySelector: {
      borderWidth: 1,
      borderColor: isDarkTheme ? '#444' : '#ccc',
      backgroundColor: isDarkTheme ? '#1e1e1e' : '#fff',
      padding: 15,
      marginBottom: 15,
      borderRadius: 5,
    },
    categorySelectorText: {
      color: isDarkTheme ? '#fff' : '#000',
      fontSize: 16,
    },
    placeholder: {
      color: '#999',
    },
    dimensionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 15,
    },
    dimensionInputWrapper: {
      flex: 1,
      marginHorizontal: 4,
    },
    dimensionLabel: {
      fontSize: 12,
      color: isDarkTheme ? '#bbb' : '#666',
      marginBottom: 5,
      textAlign: 'center',
    },
    dimensionInput: {
      borderWidth: 1,
      borderColor: isDarkTheme ? '#444' : '#ccc',
      backgroundColor: isDarkTheme ? '#1e1e1e' : '#fff',
      color: isDarkTheme ? '#fff' : '#000',
      padding: 10,
      borderRadius: 5,
      textAlign: 'center',
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: isDarkTheme ? '#1e1e1e' : '#fff',
      borderRadius: 10,
      padding: 20,
      width: '85%',
      maxHeight: '70%',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 15,
      textAlign: 'center',
      color: isDarkTheme ? '#fff' : '#000',
    },
    categoryItem: {
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: isDarkTheme ? '#333' : '#eee',
    },
    categoryItemText: {
      fontSize: 16,
      color: isDarkTheme ? '#fff' : '#000',
    },
    closeButton: {
      marginTop: 15,
      padding: 15,
      backgroundColor: isDarkTheme ? '#333' : '#eee',
      borderRadius: 5,
      alignItems: 'center',
    },
    closeButtonText: {
      color: isDarkTheme ? '#fff' : '#000',
      fontSize: 16,
      fontWeight: 'bold',
    },
    imagePicker: {
      backgroundColor: isDarkTheme ? '#333' : '#eee',
      padding: 12,
      alignItems: 'center',
      borderRadius: 5,
      flex: 1,
      marginHorizontal: 5,
    },
    imagePickerText: {
      color: isDarkTheme ? '#ccc' : '#555',
    },
    previewImage: {
      width: 150,
      height: 150,
      marginBottom: 15,
      borderRadius: 10,
      alignSelf: 'center',
    },
  });

export default AddProductScreen;