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
  StatusBar,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import ImagePicker from 'react-native-image-crop-picker';
import { doc, getDoc, collection, addDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { ref, putFile, getDownloadURL } from '@react-native-firebase/storage';
import { auth, db, storage } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import uuid from 'react-native-uuid';
import RNFS from 'react-native-fs';
import { analyzeArtworkImage } from '../utils/aiEnrichment';
import { ThemeContext } from '../contexts/ThemeContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useLanguage } from '../contexts/LanguageContext';

const AddProductScreen = () => {
  const { colors, isDarkTheme } = useContext(ThemeContext);
  const { t } = useLanguage();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [year, setYear] = useState('');
  const [category, setCategory] = useState('');
  const [height, setHeight] = useState('');
  const [width, setWidth] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  const takePhoto = async () => {
    if (images.length >= 5) {
      Alert.alert(t('warning'), t('maxPhotos'));
      return;
    }

    try {
      const image = await ImagePicker.openCamera({
        width: 1200,
        height: 1200,
        cropping: true,
        freeStyleCropEnabled: true,
        mediaType: 'photo',
      });

      if (image.path) {
        setImages((prev) => [...prev, image.path].slice(0, 5));
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled image selection') {
        console.error(error);
        Alert.alert(t('error'), 'Kamera açılırken bir sorun oluştu.');
      }
    }
  };

  const cropImage = async (uri: string, index: number) => {
    try {
      const cleanUri = uri.startsWith('file://') ? uri : `file://${uri}`;
      const image = await ImagePicker.openCropper({
        path: cleanUri,
        width: 1200,
        height: 1200,
        freeStyleCropEnabled: true,
        cropping: true,
        mediaType: 'photo',
        cropperToolbarTitle: t('cropImage') || 'Görseli Kırp',
        cropperActiveWidgetColor: colors.primary,
        cropperToolbarColor: colors.background,
        cropperToolbarWidgetColor: colors.text,
        hideBottomControls: false,
      });

      if (image.path) {
        setImages((prev) => {
          const newImages = [...prev];
          newImages[index] = image.path;
          return newImages;
        });
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled image selection') {
        console.error(error);
        Alert.alert(t('error'), 'Görsel kırpılırken bir sorun oluştu.');
      }
    }
  };

  const pickImages = async () => {
    if (images.length >= 5) {
      Alert.alert(t('warning'), t('maxPhotos'));
      return;
    }

    try {
      const pickedImages = await ImagePicker.openPicker({
        multiple: true,
        maxFiles: 5 - images.length,
        mediaType: 'photo',
        cropping: false,
      });

      if (pickedImages && Array.isArray(pickedImages)) {
        const uris = pickedImages.map((img) => img.path);
        setImages((prev) => [...prev, ...uris].slice(0, 5));
      }
    } catch (error: any) {
      if (error.message !== 'User cancelled image selection') {
        console.error(error);
        Alert.alert(t('error'), 'Galeri açılırken bir sorun oluştu.');
      }
    }
  };

  const uploadImageAsync = async (uri: string): Promise<string> => {
    const imageId = uuid.v4();
    const imagePath = `product_images/${imageId}.jpg`;
    const imageRef = ref(storage, imagePath);
    await putFile(imageRef, uri);
    const downloadURL = await getDownloadURL(imageRef);
    return downloadURL;
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

  const handleAddProduct = async () => {
    if (!title.trim() || !description.trim() || !price.trim() || !category.trim()) {
      Alert.alert(t('warning'), t('fillRequired'));
      return;
    }
    if (year && (parseInt(year) < 1000 || parseInt(year) > new Date().getFullYear())) {
      Alert.alert(t('warning'), t('validYear'));
      return;
    }

    try {
      setUploading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userSnap = await getDoc(doc(db, 'users', userId));
      const userData = userSnap.data();
      const username = userData?.username || 'Bilinmeyen';
      const userProfileImage = userData?.photoURL || '';

      const imageUrls: string[] = [];
      for (const uri of images) {
        const url = await uploadImageAsync(uri);
        imageUrls.push(url);
      }

      let aiVisualTags: string[] = [];
      if (images.length > 0) {
        try {
          const base64Image = await RNFS.readFile(images[0], 'base64');
          aiVisualTags = await analyzeArtworkImage(base64Image, 'image/jpeg');
        } catch (e) {}
      }

      const dimensions = {
        height: height ? parseFloat(height) : null,
        width: width ? parseFloat(width) : null,
      };

      await addDoc(collection(db, 'products'), {
        title,
        description,
        ownerId: userId,
        username,
        userProfileImage,
        price: parseFloat(price.replace(/\./g, '')),
        category,
        dimensions,
        year: year ? parseInt(year) : null,
        isSold: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        imageUrls,
        mainImageUrl: imageUrls[0] || '',
        aiVisualTags,
      });

      Alert.alert(t('success'), t('productAdded'));
      navigation.goBack();
    } catch (error) {
      console.error('Ürün eklenirken hata:', error);
      Alert.alert(t('error'), t('productAddError'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.largeTitle, { color: colors.text }]}>{t('addNewProduct')}</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 24, paddingBottom: 40 + insets.bottom }}
      >
        {/* IMAGE SECTION */}
        <View style={styles.imageSection}>
          <TouchableOpacity
            style={[styles.mainImageCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={pickImages}
            activeOpacity={0.8}
          >
            {images.length > 0 ? (
              <Image source={{ uri: images[0] }} style={styles.mainPreviewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={48} color={colors.secondaryText} />
                <Text style={[styles.imagePlaceholderText, { color: colors.secondaryText }]}>{t('pickPhotos')}</Text>
              </View>
            )}
            <View style={styles.imageOverlayContainer}>
              <TouchableOpacity 
                style={[styles.blurActionBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]} 
                onPress={pickImages}
              >
                <Ionicons name="camera" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailList}>
              {images.map((uri, index) => (
                <View key={index} style={styles.thumbWrapper}>
                  <Image source={{ uri }} style={styles.thumbImage} />
                  
                  {/* Action Buttons with Blur Effect */}
                  <TouchableOpacity 
                    onPress={() => cropImage(uri, index)} 
                    style={[styles.thumbActionBtn, { right: 5, top: 5 }]}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="crop" size={12} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.thumbActionBtn, { left: 5, top: 5, backgroundColor: 'rgba(255,59,48,0.4)' }]} 
                    onPress={() => setImages(prev => prev.filter((_, i) => i !== index))}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addMoreThumb} onPress={pickImages}>
                 <Ionicons name="add" size={24} color={colors.secondaryText} />
              </TouchableOpacity>
            </ScrollView>
          )}

          <TouchableOpacity onPress={pickImages} style={styles.updateImageBtn}>
             <Text style={[styles.updateImageBtnText, { color: colors.secondaryText }]}>{t('pickFromGallery')}</Text>
          </TouchableOpacity>
        </View>

        {/* FORM SECTION */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('productNameLabel')}</Text>
            <TextInput
              style={[styles.underlineInput, { borderBottomColor: focusedField === 'title' ? colors.primary : colors.border, color: colors.text }]}
              placeholder={t('productName')}
              placeholderTextColor={colors.secondaryText}
              value={title}
              onChangeText={setTitle}
              onFocus={() => setFocusedField('title')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('yearLabel')}</Text>
            <TextInput
              style={[styles.underlineInput, { borderBottomColor: focusedField === 'year' ? colors.primary : colors.border, color: colors.text }]}
              placeholder="2024"
              placeholderTextColor={colors.secondaryText}
              keyboardType="numeric"
              value={year}
              onChangeText={setYear}
              maxLength={4}
              onFocus={() => setFocusedField('year')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('descriptionLabel')}</Text>
            <TextInput
              style={[styles.underlineInput, { borderBottomColor: focusedField === 'desc' ? colors.primary : colors.border, color: colors.text }]}
              placeholder={t('description')}
              placeholderTextColor={colors.secondaryText}
              multiline
              value={description}
              onChangeText={setDescription}
              onFocus={() => setFocusedField('desc')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('priceLabel')}</Text>
            <View style={[styles.underlinePriceContainer, { borderBottomColor: focusedField === 'price' ? colors.primary : colors.border }]}>
              <Text style={[styles.currencySymbol, { color: colors.text }]}>₺</Text>
              <TextInput
                style={[styles.priceInput, { color: colors.text }]}
                placeholder="0"
                placeholderTextColor={colors.secondaryText}
                keyboardType="number-pad"
                value={price}
                onChangeText={handlePriceChange}
                onFocus={() => setFocusedField('price')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('categoryLabel')}</Text>
            <TouchableOpacity
              style={[styles.underlineInput, { borderBottomColor: colors.border, justifyContent: 'center' }]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={{ color: category ? colors.text : colors.secondaryText, fontSize: 16 }}>
                {category ? getCategoryLabel(category) : t('selectCategory')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('size')}</Text>
            <View style={styles.dimensionsRow}>
              <View style={[styles.dimInputWrapper, { borderBottomColor: focusedField === 'height' ? colors.primary : colors.border }]}>
                <Text style={styles.dimLabel}>{t('height')} (cm)</Text>
                <TextInput
                  style={[styles.dimInput, { color: colors.text }]}
                  keyboardType="numeric"
                  value={height}
                  onChangeText={setHeight}
                  onFocus={() => setFocusedField('height')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              <View style={[styles.dimInputWrapper, { borderBottomColor: focusedField === 'width' ? colors.primary : colors.border }]}>
                <Text style={styles.dimLabel}>{t('width')} (cm)</Text>
                <TextInput
                  style={[styles.dimInput, { color: colors.text }]}
                  keyboardType="numeric"
                  value={width}
                  onChangeText={setWidth}
                  onFocus={() => setFocusedField('width')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.mainActionButton, { backgroundColor: uploading ? colors.border : colors.text }]}
          onPress={handleAddProduct}
          disabled={uploading}
        >
          {uploading ? <ActivityIndicator color={colors.background} /> : <Text style={[styles.mainActionButtonText, { color: colors.background }]}>{t('save')}</Text>}
        </TouchableOpacity>
      </ScrollView>

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
                  <Text style={{ color: colors.text, fontSize: 16 }}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: colors.text }]} onPress={() => setModalVisible(false)}>
              <Text style={{ color: colors.background, fontWeight: 'bold' }}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  headerContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 10,
  },
  headerBackButton: {
    marginBottom: 12,
    marginLeft: -5,
  },
  largeTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  imageSection: { alignItems: 'center', marginBottom: 32 },
  mainImageCard: { width: '100%', height: 320, borderRadius: 24, borderWidth: 1, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  mainPreviewImage: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center' },
  imagePlaceholderText: { marginTop: 10, fontSize: 16, fontWeight: '600' },
  imageOverlayContainer: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    flexDirection: 'row',
  },
  blurActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  thumbnailList: { marginTop: 20, width: '100%' },
  thumbWrapper: { marginRight: 15, position: 'relative' },
  thumbImage: { width: 80, height: 80, borderRadius: 16 },
  thumbActionBtn: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  addMoreThumb: { width: 80, height: 80, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
  updateImageBtn: { marginTop: 12, padding: 8 },
  updateImageBtnText: { fontSize: 13, fontWeight: '600', opacity: 0.7, letterSpacing: 0.5 },
  formSection: { marginBottom: 32 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#6E6E6E', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  underlineInput: { borderBottomWidth: 1.5, paddingVertical: 10, fontSize: 16 },
  underlinePriceContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, paddingVertical: 4 },
  currencySymbol: { fontSize: 20, fontWeight: 'bold', marginRight: 8 },
  priceInput: { flex: 1, fontSize: 20, fontWeight: '600' },
  dimensionsRow: { flexDirection: 'row', gap: 20 },
  dimInputWrapper: { flex: 1, borderBottomWidth: 1.5, paddingVertical: 8 },
  dimLabel: { fontSize: 11, color: '#999', marginBottom: 4 },
  dimInput: { fontSize: 16, fontWeight: '500' },
  mainActionButton: { height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  mainActionButtonText: { fontSize: 17, fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { borderRadius: 32, padding: 24, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  modalItem: { paddingVertical: 18, borderBottomWidth: 1 },
  modalCloseBtn: { paddingVertical: 16, borderRadius: 16, marginTop: 20 },
});

export default AddProductScreen;
