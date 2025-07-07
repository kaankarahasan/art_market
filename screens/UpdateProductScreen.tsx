import React, { useState } from 'react';
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  Text,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { updateProduct } from '../utils/updateProduct';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../firebase';
import { RootStackParamList } from '../App';
import { v4 as uuidv4 } from 'uuid';
import { Product } from '../types';

// Route type
type UpdateProductRouteProp = RouteProp<RootStackParamList, 'UpdateProduct'>;

const UpdateProductScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<UpdateProductRouteProp>();
  const { product } = route.params;

  const [title, setTitle] = useState(product.title || '');
  const [description, setDescription] = useState(product.description || '');
  const [price, setPrice] = useState(product.price ? String(product.price) : '');
  const [category, setCategory] = useState(product.category || '');
  const [image, setImage] = useState<string | null>(product.imageUrl || null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Galeriye erişim izni gerekli.');
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

  const uploadImageAsync = async (uri: string): Promise<string> => {
    try {
      setUploading(true);
      const response = await fetch(uri);
      const blob = await response.blob();
      const imageId = uuidv4();
      const imageRef = ref(storage, `product_images/${imageId}.jpg`);
      await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(imageRef);
      return downloadURL;
    } catch (error) {
      console.error('Resim yükleme hatası:', error);
      Alert.alert('Hata', 'Resim yüklenemedi.');
      return '';
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Uyarı', 'Başlık ve açıklama zorunludur.');
      return;
    }

    let imageUrl = product.imageUrl;
    if (image && image !== product.imageUrl) {
      imageUrl = await uploadImageAsync(image);
      if (!imageUrl) return;
    }

    await updateProduct(product.id, {
      title,
      description,
      price: parseFloat(price),
      category,
      imageUrl,
    });

    Alert.alert('Başarılı', 'Ürün güncellendi.');
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Ürün Adı</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Açıklama</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>Fiyat (₺)</Text>
      <TextInput
        style={styles.input}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Kategori</Text>
      <TextInput style={styles.input} value={category} onChangeText={setCategory} />

      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        <Text style={styles.imagePickerText}>Resim Seç</Text>
      </TouchableOpacity>

      {image && <Image source={{ uri: image }} style={styles.previewImage} />}

      <Button
        title={uploading ? 'Yükleniyor...' : 'Güncelle'}
        onPress={handleUpdate}
        disabled={uploading}
      />
    </View>
  );
};

export default UpdateProductScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
  },
  label: { fontWeight: 'bold', marginBottom: 5 },
  imagePicker: {
    backgroundColor: '#eee',
    padding: 12,
    alignItems: 'center',
    borderRadius: 5,
    marginBottom: 15,
  },
  imagePickerText: { color: '#555' },
  previewImage: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 15,
    borderRadius: 8,
  },
});