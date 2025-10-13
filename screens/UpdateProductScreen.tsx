import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  Alert,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { updateProduct } from '../utils/updateProduct';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { RootStackParamList } from '../routes/types';
import { v4 as uuidv4 } from 'uuid';
import { useThemeContext } from '../contexts/ThemeContext';
import { Product } from '../routes/types';

type UpdateProductRouteProp = RouteProp<RootStackParamList, 'UpdateProduct'>;

const UpdateProductScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<UpdateProductRouteProp>();
  const { product } = route.params;

  const { colors } = useThemeContext();

  const [title, setTitle] = useState(product.title || '');
  const [description, setDescription] = useState(product.description || '');
  const [price, setPrice] = useState(product.price ? String(product.price) : '');
  const [category, setCategory] = useState(product.category || '');
  const [imageUrls, setImageUrls] = useState<string[]>(product.imageUrls || []);
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
      setImageUrls((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const uploadImageAsync = async (uri: string): Promise<string> => {
    try {
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
    }
  };

  const handleUpdate = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Uyarı', 'Başlık ve açıklama zorunludur.');
      return;
    }

    setUploading(true);

    // 🔹 Yeni yüklenen görselleri storage'a yükle
    const uploadedUrls: string[] = [];
    for (const img of imageUrls) {
      if (!img.startsWith('https://')) {
        const url = await uploadImageAsync(img);
        if (url) uploadedUrls.push(url);
      } else {
        uploadedUrls.push(img); // zaten URL ise atla
      }
    }

    await updateProduct(product.id, {
      title,
      description,
      price: parseFloat(price),
      category,
      imageUrls: uploadedUrls,
      mainImageUrl: uploadedUrls[0] || '', // ana görsel
    });

    setUploading(false);
    Alert.alert('Başarılı', 'Ürün güncellendi.');
    navigation.goBack();
  };

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.text }]}>Ürün Adı</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        value={title}
        onChangeText={setTitle}
        placeholder="Ürün adı"
        placeholderTextColor={colors.text + '99'}
      />

      <Text style={[styles.label, { color: colors.text }]}>Açıklama</Text>
      <TextInput
        style={[
          styles.input,
          { height: 80, borderColor: colors.border, color: colors.text },
        ]}
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Ürün açıklaması"
        placeholderTextColor={colors.text + '99'}
      />

      <Text style={[styles.label, { color: colors.text }]}>Fiyat (₺)</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder="Fiyat"
        placeholderTextColor={colors.text + '99'}
      />

      <Text style={[styles.label, { color: colors.text }]}>Kategori</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        value={category}
        onChangeText={setCategory}
        placeholder="Kategori"
        placeholderTextColor={colors.text + '99'}
      />

      <TouchableOpacity
        style={[styles.imagePicker, { backgroundColor: colors.card }]}
        onPress={pickImage}
      >
        <Text style={[styles.imagePickerText, { color: colors.primary }]}>
          Resim Ekle
        </Text>
      </TouchableOpacity>

      {/* 🔹 Görseller preview ve silme */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
        {imageUrls.map((img, index) => (
          <View key={index} style={{ marginRight: 10, position: 'relative' }}>
            <Image source={{ uri: img }} style={styles.previewImage} />
            <TouchableOpacity
              onPress={() => removeImage(index)}
              style={styles.removeImageButton}
            >
              <Text style={styles.removeImageText}>X</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.updateButton,
          { backgroundColor: uploading ? colors.border : colors.primary },
        ]}
        onPress={handleUpdate}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.updateButtonText}>Güncelle</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

export default UpdateProductScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
  },
  label: { fontWeight: 'bold', marginBottom: 5 },
  imagePicker: {
    padding: 12,
    alignItems: 'center',
    borderRadius: 5,
    marginBottom: 15,
  },
  imagePickerText: { fontWeight: '600' },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ff5252',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: { color: '#fff', fontWeight: 'bold' },
  updateButton: {
    paddingVertical: 15,
    borderRadius: 6,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
