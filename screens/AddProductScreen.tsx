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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useLanguage } from '../contexts/LanguageContext';

const AddProductScreen = () => {
  const { isDarkTheme } = useContext(ThemeContext);
  const styles = getStyles(isDarkTheme);
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [height, setHeight] = useState('');
  const [width, setWidth] = useState('');
  const [year, setYear] = useState('');

  const navigation = useNavigation();

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

  const takePhoto = async () => {
    if (images.length >= 3) {
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
        setImages((prev) => [...prev, image.path].slice(0, 3));
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
      // Sorunlu uri temizliği (bazı durumlarda file:// gerekebilir veya gerekmez)
      const cleanUri = uri.startsWith('file://') ? uri : `file://${uri}`;
      
      const image = await ImagePicker.openCropper({
        path: cleanUri,
        width: 1200,
        height: 1200,
        freeStyleCropEnabled: true,
        cropping: true,
        mediaType: 'photo',
        cropperToolbarTitle: t('cropImage') || 'Görseli Kırp',
        cropperActiveWidgetColor: '#FF3040',
        cropperToolbarColor: isDarkTheme ? '#121212' : '#F4F4F4',
        cropperToolbarWidgetColor: isDarkTheme ? '#FFFFFF' : '#333333',
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
    if (images.length >= 3) {
      Alert.alert(t('warning'), t('maxPhotos'));
      return;
    }

    try {
      const pickedImages = await ImagePicker.openPicker({
        multiple: true,
        maxFiles: 3 - images.length,
        mediaType: 'photo',
        cropping: false, // Çoklu seçimde cropping kapalıdır, sonra tek tek yapılacak
      });

      if (pickedImages && Array.isArray(pickedImages)) {
        const uris = pickedImages.map((img) => img.path);
        setImages((prev) => [...prev, ...uris].slice(0, 3));
        
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

    // Native putFile çok daha hızlıdır (blob'a gerek duymaz)
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

      let aiVisualTags: string[] = [];
      if (images.length > 0) {
        try {
          console.log("📸 İlk görsel analiz için hazırlanıyor...");
          const base64Image = await RNFS.readFile(images[0], 'base64');
          aiVisualTags = await analyzeArtworkImage(base64Image, 'image/jpeg');
        } catch (analyzeError) {
          console.error('Görsel analizi sırasında hata (görmezden geliniyor):', analyzeError);
        }
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
      setTitle('');
      setDescription('');
      setPrice('');
      setCategory('');
      setHeight('');
      setWidth('');
      setYear('');
      setImages([]);
      navigation.goBack();
    } catch (error) {
      console.error('Ürün eklenirken hata:', error);
      Alert.alert(t('error'), t('productAddError'));
    } finally {
      setUploading(false);
    }
  };

  const getCategoryLabel = (value: string) => {
    const cat = categories.find((c) => c.value === value);
    return cat ? cat.label : t('selectCategory');
  };

  return (
    <View style={[styles.mainContainer, { paddingTop: insets.top, backgroundColor: isDarkTheme ? '#121212' : '#F4F4F4' }]}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={isDarkTheme ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('addNewProduct')}</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}>

        <View style={styles.card}>
          <Text style={styles.label}>{t('productName')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('productName')}
            placeholderTextColor="#6E6E6E"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>{t('year')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('yearPlaceholder')}
            placeholderTextColor="#6E6E6E"
            keyboardType="numeric"
            value={year}
            onChangeText={setYear}
            maxLength={4}
          />

          <Text style={styles.label}>{t('description')}</Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            placeholder={t('description')}
            placeholderTextColor="#6E6E6E"
            multiline
            value={description}
            onChangeText={setDescription}
          />

          <Text style={styles.label}>{t('price')}</Text>
          <View style={styles.priceInputContainer}>
            <Text style={styles.currencySymbol}>₺</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="0"
              placeholderTextColor="#6E6E6E"
              keyboardType="number-pad"
              value={price}
              onChangeText={handlePriceChange}
            />
          </View>

          <Text style={styles.label}>{t('category')}</Text>
          <TouchableOpacity
            style={styles.categorySelector}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.categorySelectorText}>
              {category ? getCategoryLabel(category) : t('selectCategory')}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>{t('size')}</Text>
          <View style={styles.dimensionsContainer}>
            <View style={styles.dimensionBox}>
              <Text style={styles.dimensionLabel}>{t('height')}</Text>
              <TextInput
                style={styles.dimensionInput}
                keyboardType="numeric"
                value={height}
                onChangeText={setHeight}
              />
            </View>
            <View style={styles.dimensionBox}>
              <Text style={styles.dimensionLabel}>{t('width')}</Text>
              <TextInput
                style={styles.dimensionInput}
                keyboardType="numeric"
                value={width}
                onChangeText={setWidth}
              />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{t('photos')}</Text>
          <View style={styles.imageRow}>
            {images.map((uri, index) => (
              <TouchableOpacity key={index} onPress={() => cropImage(uri, index)} activeOpacity={0.7}>
                <View style={styles.imageContainer}>
                  <Image source={{ uri }} style={styles.imagePreview} />
                  <View style={styles.cropIconBadge}>
                    <Ionicons name="crop" size={16} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.imageButtons}>
            <TouchableOpacity style={styles.button} onPress={pickImages}>
              <Text style={styles.buttonText}>{t('pickFromGallery')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={takePhoto}>
              <Text style={styles.buttonText}>{t('takeFromCamera')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, { marginTop: 10, alignSelf: 'center', width: '90%' }]}
          onPress={handleAddProduct}
          disabled={uploading}
        >
          {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('save')}</Text>}
        </TouchableOpacity>

        <Modal visible={modalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('selectCategory')}</Text>
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
                <Text style={styles.buttonText}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

const getStyles = (isDarkTheme: boolean) =>
  StyleSheet.create({
    mainContainer: { flex: 1 },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 15,
      paddingVertical: 12,
      backgroundColor: isDarkTheme ? '#121212' : '#F4F4F4',
      borderBottomWidth: 1,
      borderBottomColor: isDarkTheme ? '#333' : '#E0E0E0',
    },
    backButton: { paddingRight: 10, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: isDarkTheme ? '#fff' : '#333' },
    scrollContent: { padding: 20 },
    // container: { flexGrow: 1, padding: 20, backgroundColor: isDarkTheme ? '#121212' : '#F4F4F4' }, // Replaced by mainContainer+scrollContent, kept if needed for other refs logic but commented out to avoid confusion or keep as legacy
    // header: { fontSize: 22, fontWeight: 'bold', color: '#333333', marginBottom: 20, textAlign: 'center' }, // Replaced by headerTitle
    card: { backgroundColor: isDarkTheme ? '#1E1E1E' : '#fff', borderRadius: 12, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
    label: { color: '#6E6E6E', marginBottom: 5, fontWeight: '600' },
    input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 10, backgroundColor: '#F4F4F4', color: '#333333', marginBottom: 15 },
    priceInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, backgroundColor: '#F4F4F4', marginBottom: 15, paddingHorizontal: 10 },
    currencySymbol: { fontSize: 16, color: '#333333', fontWeight: 'bold', marginRight: 5 },
    priceInput: { flex: 1, paddingVertical: 10, color: '#333333', fontSize: 16 },
    categorySelector: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, backgroundColor: '#F4F4F4', padding: 12, marginBottom: 15 },
    categorySelectorText: { color: '#333333' },
    dimensionsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    dimensionBox: { flex: 1, alignItems: 'center' },
    dimensionLabel: { color: '#6E6E6E', fontSize: 12, marginBottom: 4 },
    dimensionInput: { width: '80%', backgroundColor: '#F4F4F4', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, textAlign: 'center', color: '#333333', padding: 6 },
    imageRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10, flexWrap: 'wrap' },
    imageContainer: { position: 'relative', marginHorizontal: 5 },
    imagePreview: { width: 90, height: 90, borderRadius: 8 },
    cropIconBadge: {
      position: 'absolute',
      bottom: -5,
      right: -5,
      backgroundColor: '#333',
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: isDarkTheme ? '#1E1E1E' : '#fff',
    },
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
