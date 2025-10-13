import React, { useState, useContext } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Alert,
  Image,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
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
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [height, setHeight] = useState('');
  const [width, setWidth] = useState('');
  const [depth, setDepth] = useState('');
  const [year, setYear] = useState('');

  const navigation = useNavigation();

  const categories = [
    { label: 'Yağlı Boya', value: 'yagli_boya' },
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

  const pickImages = async () => {
    if (images.length >= 3) {
      Alert.alert('Uyarı', 'En fazla 3 fotoğraf ekleyebilirsiniz.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Hata', 'Galeriden resim seçmek için izin gerekli.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 3 - images.length,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 3));
    }
  };

  const takePhoto = async () => {
    if (images.length >= 3) {
      Alert.alert('Uyarı', 'En fazla 3 fotoğraf ekleyebilirsiniz.');
      return;
    }
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
      setImages((prev) => [...prev, result.assets[0].uri].slice(0, 3));
    }
  };

  const uploadImageAsync = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const imageId = uuidv4();
    const imagePath = `product_images/${imageId}.jpg`;
    const imageRef = ref(storage, imagePath);
    await uploadBytes(imageRef, blob, { contentType: 'image/jpeg' });
    const downloadURL = await getDownloadURL(imageRef);
    return downloadURL;
  };

  const handleAddProduct = async () => {
    if (!title.trim() || !description.trim() || !price.trim() || !category.trim()) {
      Alert.alert('Uyarı', 'Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    if (year && (parseInt(year) < 1000 || parseInt(year) > new Date().getFullYear())) {
      Alert.alert('Uyarı', 'Lütfen geçerli bir yıl girin.');
      return;
    }

    try {
      setUploading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı.');
        return;
      }

      const userSnap = await getDoc(doc(db, 'users', userId));
      const userData = userSnap.data();
      const username = userData?.username || 'Bilinmeyen';
      const userProfileImage = userData?.photoURL || '';

      const imageUrls: string[] = [];
      for (const uri of images) {
        const url = await uploadImageAsync(uri);
        imageUrls.push(url);
      }

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
        year: year ? parseInt(year) : null,
        isSold: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        imageUrls,
        mainImageUrl: imageUrls[0] || '',
      });

      Alert.alert('Başarılı', 'Ürün başarıyla eklendi.');
      setTitle('');
      setDescription('');
      setPrice('');
      setCategory('');
      setHeight('');
      setWidth('');
      setDepth('');
      setYear('');
      setImages([]);
      navigation.goBack();
    } catch (error) {
      console.error('Ürün eklenirken hata:', error);
      Alert.alert('Hata', 'Ürün eklenirken bir sorun oluştu.');
    } finally {
      setUploading(false);
    }
  };

  const getCategoryLabel = (value: string) => {
    const cat = categories.find((c) => c.value === value);
    return cat ? cat.label : 'Kategori Seçin';
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Yeni Eser Ekle</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Ürün Adı</Text>
        <TextInput
          style={styles.input}
          placeholder="Ürün adı girin"
          placeholderTextColor="#6E6E6E"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Yıl</Text>
        <TextInput
          style={styles.input}
          placeholder="Yapım yılı (örn: 2024)"
          placeholderTextColor="#6E6E6E"
          keyboardType="numeric"
          value={year}
          onChangeText={setYear}
          maxLength={4}
        />

        <Text style={styles.label}>Açıklama</Text>
        <TextInput
          style={[styles.input, { height: 100 }]}
          placeholder="Açıklama girin"
          placeholderTextColor="#6E6E6E"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Fiyat (₺)</Text>
        <TextInput
          style={styles.input}
          placeholder="Fiyat girin"
          placeholderTextColor="#6E6E6E"
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
        />

        <Text style={styles.label}>Kategori</Text>
        <TouchableOpacity
          style={styles.categorySelector}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.categorySelectorText}>
            {category ? getCategoryLabel(category) : 'Kategori Seçin'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Boyut (cm)</Text>
        <View style={styles.dimensionsContainer}>
          <View style={styles.dimensionBox}>
            <Text style={styles.dimensionLabel}>Yükseklik</Text>
            <TextInput
              style={styles.dimensionInput}
              keyboardType="numeric"
              value={height}
              onChangeText={setHeight}
            />
          </View>
          <View style={styles.dimensionBox}>
            <Text style={styles.dimensionLabel}>Genişlik</Text>
            <TextInput
              style={styles.dimensionInput}
              keyboardType="numeric"
              value={width}
              onChangeText={setWidth}
            />
          </View>
          <View style={styles.dimensionBox}>
            <Text style={styles.dimensionLabel}>Kalınlık</Text>
            <TextInput
              style={styles.dimensionInput}
              keyboardType="numeric"
              value={depth}
              onChangeText={setDepth}
            />
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Fotoğraflar (max 3)</Text>
        <View style={styles.imageRow}>
          {images.map((uri, index) => (
            <Image key={index} source={{ uri }} style={styles.imagePreview} />
          ))}
        </View>

        <View style={styles.imageButtons}>
          <TouchableOpacity style={styles.button} onPress={pickImages}>
            <Text style={styles.buttonText}>Galeriden Seç</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={takePhoto}>
            <Text style={styles.buttonText}>Kameradan Çek</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, { marginTop: 10, alignSelf: 'center', width: '90%' }]}
        onPress={handleAddProduct}
        disabled={uploading}
      >
        {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Kaydet</Text>}
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Kategori Seçin</Text>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setCategory(item.value);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={[styles.button, { marginTop: 10 }]} onPress={() => setModalVisible(false)}>
              <Text style={styles.buttonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const getStyles = (isDarkTheme: boolean) =>
  StyleSheet.create({
    container: { flexGrow: 1, padding: 20, backgroundColor: isDarkTheme ? '#121212' : '#F4F4F4' },
    header: { fontSize: 22, fontWeight: 'bold', color: '#333333', marginBottom: 20, textAlign: 'center' },
    card: { backgroundColor: isDarkTheme ? '#1E1E1E' : '#fff', borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
    label: { color: '#6E6E6E', marginBottom: 5, fontWeight: '600' },
    input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 10, backgroundColor: '#F4F4F4', color: '#333333', marginBottom: 15 },
    categorySelector: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, backgroundColor: '#F4F4F4', padding: 12, marginBottom: 15 },
    categorySelectorText: { color: '#333333' },
    dimensionsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    dimensionBox: { flex: 1, alignItems: 'center' },
    dimensionLabel: { color: '#6E6E6E', fontSize: 12, marginBottom: 4 },
    dimensionInput: { width: '80%', backgroundColor: '#F4F4F4', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, textAlign: 'center', color: '#333333', padding: 6 },
    imageRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
    imagePreview: { width: 90, height: 90, borderRadius: 8, marginHorizontal: 5 },
    imageButtons: { flexDirection: 'row', justifyContent: 'space-around' },
    button: { backgroundColor: '#333333', padding: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    buttonText: { color: '#fff', fontWeight: '600' },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalContent: { backgroundColor: '#fff', borderRadius: 10, padding: 20, width: '80%', maxHeight: '70%' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333333', textAlign: 'center', marginBottom: 10 },
    modalItem: { padding: 12, borderBottomColor: '#eee', borderBottomWidth: 1 },
    modalItemText: { color: '#333333' },
  });

export default AddProductScreen;
