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
  Modal,
  FlatList,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import ImagePicker from 'react-native-image-crop-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { updateProduct } from '../utils/updateProduct';
import { ref } from '@react-native-firebase/storage';
import { storage } from '../firebase';
import { RootStackParamList } from '../routes/types';
import uuid from 'react-native-uuid';
import { useThemeContext } from '../contexts/ThemeContext';
import { Product } from '../routes/types';
import { useLanguage } from '../contexts/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type UpdateProductRouteProp = RouteProp<RootStackParamList, 'UpdateProduct'>;

const UpdateProductScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<UpdateProductRouteProp>();
  const { product } = route.params;

  const { colors } = useThemeContext();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState(product.title || '');
  const [description, setDescription] = useState(product.description || '');
  const [price, setPrice] = useState(() => {
    if (product.price) {
      const numericValue = String(product.price).replace(/[^0-9]/g, '');
      return parseInt(numericValue, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
    return '';
  });
  const [category, setCategory] = useState(product.category || '');
  const [modalVisible, setModalVisible] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>(product.imageUrls || []);

  const categories = [
    { label: t('cat_yagli_boya'), value: 'yagli_boya' },
    { label: t('cat_suluboya'), value: 'suluboya' },
    { label: t('cat_akrilik'), value: 'akrilik' },
    { label: t('cat_heykel'), value: 'heykel' },
    { label: t('cat_fotograf'), value: 'fotograf' },
    { label: t('cat_dijital'), value: 'dijital' },
    { label: t('cat_cizim'), value: 'cizim' },
    { label: t('cat_grafik'), value: 'grafik' },
    { label: t('cat_seramik'), value: 'seramik' },
    { label: t('cat_kolaj'), value: 'kolaj' },
    { label: t('cat_diger'), value: 'diger' },
  ];

  const getCategoryLabel = (value: string) => {
    const cat = categories.find((c) => c.value === value);
    return cat ? cat.label : t('selectCategory');
  };
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    try {
      const pickedImages = await ImagePicker.openPicker({
        multiple: true,
        maxFiles: 5 - imageUrls.length,
        mediaType: 'photo',
        cropping: false,
      });

      if (pickedImages && Array.isArray(pickedImages)) {
        const uris = pickedImages.map((img) => img.path);
        setImageUrls((prev) => [...prev, ...uris]);
        
      }
    } catch (err: any) {
      if (err.message !== 'User cancelled image selection') {
        console.warn(err);
        Alert.alert(t('error'), t('imagePickError'));
      }
    }
  };

  const cropImage = async (uri: string, index: number) => {
    try {
      const cleanUri = uri.startsWith('http') ? uri : (uri.startsWith('file://') ? uri : `file://${uri}`);
      
      const image = await ImagePicker.openCropper({
        path: cleanUri,
        width: 1200,
        height: 1200,
        freeStyleCropEnabled: true,
        cropping: true,
        mediaType: 'photo',
        cropperToolbarTitle: t('cropImage') || 'Görseli Kırp',
        cropperActiveWidgetColor: '#FF3040',
        cropperToolbarColor: '#121212',
        cropperToolbarWidgetColor: '#FFFFFF',
        hideBottomControls: false,
      });

      if (image.path) {
        setImageUrls((prev) => {
          const newUrls = [...prev];
          newUrls[index] = image.path;
          return newUrls;
        });
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled image selection') {
        console.error(error);
        Alert.alert(t('error'), 'Görsel kırpılırken bir sorun oluştu.');
      }
    }
  };

  const uploadImageAsync = async (uri: string): Promise<string> => {
    try {
      const imageId = uuid.v4();
      const storageRef = ref(storage, `product_images/${imageId}.jpg`);
      await storageRef.putFile(uri);
      const downloadURL = await storageRef.getDownloadURL();
      return downloadURL;
    } catch (error) {
      console.error('Resim yükleme hatası:', error);
      Alert.alert(t('error'), t('imageUploadError'));
      return '';
    }
  };

  const handlePriceChange = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    if (!numericValue) {
      setPrice('');
      return;
    }
    const formatted = parseInt(numericValue, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    setPrice(formatted);
  };

  const handleUpdate = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert(t('warning'), t('titleAndDescRequired'));
      return;
    }

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];
      for (const img of imageUrls) {
        if (!img.startsWith('http')) {
          const url = await uploadImageAsync(img);
          if (url) uploadedUrls.push(url);
        } else {
          uploadedUrls.push(img);
        }
      }

      await updateProduct(product.id, {
        title,
        description,
        price: parseFloat(price.replace(/\./g, '')),
        category,
        imageUrls: uploadedUrls,
        mainImageUrl: uploadedUrls[0] || '',
      });

      Alert.alert(t('success'), t('productUpdated'));
      navigation.goBack();
    } catch (error: any) {
      console.error('Update product error:', error);
      Alert.alert(t('error'), t('productUpdateError'));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
      <Text style={[styles.label, { color: colors.text }]}>{t('productNameLabel')}</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        value={title}
        onChangeText={setTitle}
        placeholder={t('productName')}
        placeholderTextColor={colors.text + '99'}
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('descriptionLabel')}</Text>
      <TextInput
        style={[
          styles.input,
          { height: 80, borderColor: colors.border, color: colors.text },
        ]}
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder={t('description')}
        placeholderTextColor={colors.text + '99'}
      />

      <Text style={[styles.label, { color: colors.text }]}>{t('priceLabel')}</Text>
      <View style={[styles.priceInputContainer, { borderColor: colors.border }]}>
        <Text style={[styles.currencySymbol, { color: colors.text }]}>₺</Text>
        <TextInput
          style={[styles.priceInput, { color: colors.text }]}
          value={price}
          onChangeText={handlePriceChange}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={colors.text + '99'}
        />
      </View>

      <Text style={[styles.label, { color: colors.text }]}>{t('categoryLabel')}</Text>
      <TouchableOpacity
        style={[styles.input, { borderColor: colors.border, justifyContent: 'center' }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={{ color: colors.text }}>
          {category ? getCategoryLabel(category) : t('selectCategory')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.imagePicker, { backgroundColor: colors.card }]}
        onPress={pickImage}
      >
        <Text style={[styles.imagePickerText, { color: colors.primary }]}>
          {t('addImage')}
        </Text>
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
        {imageUrls.map((img, index) => (
          <View key={index} style={{ marginRight: 10, position: 'relative' }}>
            <TouchableOpacity onPress={() => cropImage(img, index)} activeOpacity={0.7}>
              <View style={{ position: 'relative' }}>
                <Image source={{ uri: img }} style={styles.previewImage} />
                <View style={[styles.cropIconBadge, { borderColor: colors.background }]}>
                  <Ionicons name="crop" size={14} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
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
          <Text style={styles.updateButtonText}>{t('update2')}</Text>
        )}
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('selectCategory')}</Text>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setCategory(item.value);
                    setModalVisible(false);
                  }}
                >
                  <Text style={{ color: colors.text }}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.primary }]} onPress={() => setModalVisible(false)}>
              <Text style={{ color: colors.background, textAlign: 'center', fontWeight: 'bold' }}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 5,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
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
  cropIconBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#333',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
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
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { borderRadius: 10, padding: 20, width: '80%', maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  modalItem: { padding: 12, borderBottomWidth: 1 },
  closeButton: { padding: 12, borderRadius: 10, marginTop: 10 },
});
