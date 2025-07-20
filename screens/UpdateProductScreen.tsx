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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { updateProduct } from '../utils/updateProduct';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { RootStackParamList } from '../routes/types';
import { v4 as uuidv4 } from 'uuid';
import { useThemeContext } from '../contexts/ThemeContext';

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          Resim Seç
        </Text>
      </TouchableOpacity>

      {image && <Image source={{ uri: image }} style={styles.previewImage} />}

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
    </View>
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
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 15,
    borderRadius: 8,
  },
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
