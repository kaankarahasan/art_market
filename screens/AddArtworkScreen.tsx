import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

// Maksimum fotoğraf boyutu (5MB)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Firebase yapılandırması
const auth = getAuth();
const firestore = getFirestore();
const storage = getStorage();

const AddArtworkScreen = () => {
  const [image, setImage] = useState<string | null | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  // Fotoğraf boyutunu kontrol etme
  const checkImageSize = async (uri: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    if (blob.size > MAX_IMAGE_SIZE) {
      Alert.alert('Hata', 'Yüklediğiniz fotoğraf çok büyük. Lütfen daha küçük bir fotoğraf seçin.');
      return false;
    }
    return true;
  };

  // Fotoğrafı küçültme
  const resizeImage = async (uri: string) => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }], // Fotoğrafın genişliğini 800px yapıyoruz
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG } // Sıkıştırma ve format belirleniyor
      );
      return result.uri;
    } catch (error) {
      console.error('Resim boyutlandırma hatası:', error);
    }
  };

  // Fotoğraf seçme
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin gerekli', 'Fotoğraflara erişim izni verilmelidir.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const isValidSize = await checkImageSize(result.assets[0].uri);
      if (isValidSize) {
        const resizedUri = await resizeImage(result.assets[0].uri); // Fotoğrafı küçültüyoruz
        setImage(resizedUri);
      }
    }
  };

  // Eser yükleme
  const uploadArtwork = async () => {
    if (!image || !title.trim()) {
      Alert.alert('Eksik bilgi', 'Lütfen görsel ve başlık giriniz.');
      return;
    }

    setUploading(true);
    try {
      const response = await fetch(image);
      const blob = await response.blob();

      const imageRef = ref(storage, `artworks/${Date.now()}.jpg`);
      await uploadBytes(imageRef, blob);
      const imageUrl = await getDownloadURL(imageRef);

      await addDoc(collection(firestore, 'products'), {
        ownerId: auth.currentUser?.uid,
        title,
        description,
        imageUrl,
        isSold: false,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Başarılı', 'Eser başarıyla yüklendi.');
      setImage(undefined); // Resim sıfırlanıyor
      setTitle('');
      setDescription('');
    } catch (err) {
      console.error('Yükleme hatası:', err);
      Alert.alert('Hata', 'Eser yüklenirken bir sorun oluştu.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Yeni Eser Ekle</Text>

      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {image ? (
          <Image source={{ uri: image }} style={styles.imagePreview} />
        ) : (
          <Text style={styles.imageText}>Görsel seç</Text>
        )}
      </TouchableOpacity>

      <TextInput
        placeholder="Başlık"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />
      <TextInput
        placeholder="Açıklama (isteğe bağlı)"
        value={description}
        onChangeText={setDescription}
        style={[styles.input, { height: 80 }]}
        multiline
      />

      <TouchableOpacity
        onPress={uploadArtwork}
        style={styles.uploadButton}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.uploadButtonText}>Yükle</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default AddArtworkScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  imagePicker: {
    borderWidth: 1,
    borderColor: '#ccc',
    height: 200,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%' },
  imageText: { color: '#999' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 8,
    marginTop: 10,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
