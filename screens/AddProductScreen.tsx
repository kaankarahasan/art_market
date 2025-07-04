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
import { MediaType } from 'expo-image-picker';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { v4 as uuidv4 } from 'uuid';

const AddProductScreen = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const navigation = useNavigation();

  const pickImage = async () => {
    console.log("ImagePicker keys:", Object.keys(ImagePicker));
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Hata', 'Galeriden resim seçmek için izin gerekli.');
      return;
    }

    console.log("ImagePicker keys:", Object.keys(ImagePicker));

    const result = await ImagePicker.launchImageLibraryAsync({
      // MediaType enum'u desteklenmiyorsa eski şekilde kullanılır
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
    const imageRef = ref(storage, `product_images/${imageId}.jpg`);

    console.log('Yükleme başlatılıyor:', imageRef.fullPath);

    await uploadBytes(imageRef, blob);

    const downloadURL = await getDownloadURL(imageRef);
    console.log('Download URL:', downloadURL);

    return downloadURL;
  } catch (error: any) {
    console.log("🔥 Upload error object:", error);
    console.log("🔥 Upload error JSON:", JSON.stringify(error));
    Alert.alert('Hata', error.message ?? 'Resim yüklenemedi.');
    return '';
  } finally {
    setUploading(false);
  }
};

  console.log('Aktif kullanıcı:', auth.currentUser);
  const handleAddProduct = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Uyarı', 'Lütfen tüm alanları doldurun.');
      return;
    }

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı.');
        return;
      }

      let imageUrl = '';
      if (image) {
        imageUrl = await uploadImageAsync(image);
        if (!imageUrl) return;
      }

      await addDoc(collection(db, 'products'), {
        title,
        description,
        ownerId: userId,
        isSold: false,
        createdAt: serverTimestamp(),
        imageUrl,
      });

      Alert.alert('Başarılı', 'Ürün başarıyla eklendi.');
      setTitle('');
      setDescription('');
      setImage(null);
      navigation.goBack();
    } catch (error) {
      console.error('Ürün eklenirken hata:', error);
      Alert.alert('Hata', 'Ürün eklenirken bir sorun oluştu.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Ürün Adı</Text>
      <TextInput
        style={styles.input}
        placeholder="Ürün adı girin"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Açıklama</Text>
      <TextInput
        style={[styles.input, { height: 100 }]}
        placeholder="Açıklama girin"
        multiline
        value={description}
        onChangeText={setDescription}
      />

      <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
        <Text style={styles.imagePickerText}>Resim Seç</Text>
      </TouchableOpacity>

      {image && <Image source={{ uri: image }} style={styles.previewImage} />}

      <Button
        title={uploading ? 'Yükleniyor...' : 'Kaydet'}
        onPress={handleAddProduct}
        disabled={uploading}
      />
    </View>
  );
};

export default AddProductScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  label: {
    marginBottom: 5,
    fontWeight: 'bold',
  },
  imagePicker: {
    backgroundColor: '#eee',
    padding: 12,
    alignItems: 'center',
    marginBottom: 15,
    borderRadius: 5,
  },
  imagePickerText: {
    color: '#555',
  },
  previewImage: {
    width: 150,
    height: 150,
    marginBottom: 15,
    borderRadius: 10,
    alignSelf: 'center',
  },
});