import React, { useState, useEffect } from 'react';
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
  Animated,
  StatusBar,
  Dimensions,
  FlatList,
} from 'react-native';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { launchImageLibrary } from 'react-native-image-picker';
import ImagePicker from 'react-native-image-crop-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { updateProduct } from '../utils/updateProduct';
import { ref, putFile, getDownloadURL } from '@react-native-firebase/storage';
import { storage } from '../firebaseConfig';
import { RootStackParamList } from '../routes/types';
import uuid from 'react-native-uuid';
import { useThemeContext } from '../contexts/ThemeContext';
import { Product } from '../routes/types';
import { useLanguage } from '../contexts/LanguageContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type UpdateProductRouteProp = RouteProp<RootStackParamList, 'UpdateProduct'>;

const UpdateProductScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<UpdateProductRouteProp>();
  const { product } = route.params;

  const { colors, isDarkTheme } = useThemeContext();
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

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

  const handlePriceChange = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    if (!numericValue) {
      setPrice('');
      return;
    }
    const formatted = parseInt(numericValue, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    setPrice(formatted);
  };

  const removeImage = (index: number) => {
    if (imageUrls.length <= 1) {
      Alert.alert(t('warning'), t('atLeastOnePhoto'));
      return;
    }
    setImageUrls((prev) => {
      const newUrls = prev.filter((_, i) => i !== index);
      if (selectedIndex >= newUrls.length) {
        setSelectedIndex(Math.max(0, newUrls.length - 1));
      }
      return newUrls;
    });
  };

  const cropImage = async (uri: string, index: number) => {
    try {
      const cropped = await ImagePicker.openCropper({
        path: uri,
        width: 1000,
        height: 1000,
        cropping: true,
        mediaType: 'photo',
      });
      if (cropped.path) {
        setImageUrls((prev) => {
          const newUrls = [...prev];
          newUrls[index] = cropped.path;
          return newUrls;
        });
      }
    } catch (err: any) {
      if (err.message !== 'User cancelled image selection') {
        console.warn(err);
      }
    }
  };

  const changeSingleImage = async (index: number) => {
    try {
      const pickedImage = await ImagePicker.openPicker({
        mediaType: 'photo',
        cropping: false,
      });

      if (pickedImage && pickedImage.path) {
        setImageUrls((prev) => {
          const newUrls = [...prev];
          newUrls[index] = pickedImage.path;
          return newUrls;
        });
      }
    } catch (err: any) {
      if (err.message !== 'User cancelled image selection') {
        console.warn(err);
      }
    }
  };

  const uploadImageAsync = async (uri: string): Promise<string> => {
    if (uri.startsWith('http')) return uri;
    const imageId = uuid.v4();
    const imagePath = `product_images/${imageId}.jpg`;
    const imageRef = ref(storage, imagePath);
    await putFile(imageRef, uri);
    return await getDownloadURL(imageRef);
  };

  const handleUpdate = async () => {
    if (!title.trim() || !description.trim() || !price.trim() || !category.trim()) {
      Alert.alert(t('warning'), t('fillRequired'));
      return;
    }
    if (imageUrls.length === 0) {
      Alert.alert(t('warning'), t('atLeastOnePhoto'));
      return;
    }

    try {
      setUploading(true);
      const finalUrls: string[] = [];
      for (const uri of imageUrls) {
        const url = await uploadImageAsync(uri);
        finalUrls.push(url);
      }

      await updateProduct(product.id, {
        title,
        description,
        price: parseFloat(price.replace(/\./g, '')),
        category,
        imageUrls: finalUrls,
        mainImageUrl: finalUrls[0],
      });

      setFeedback({ type: 'success', message: t('productUpdated') });
    } catch (error: any) {
      console.error('Update error:', error);
      setFeedback({ type: 'error', message: error.message || t('productUpdateError') });
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (feedback) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        if (feedback.type === 'success') hideFeedback();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const hideFeedback = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      const isSuccess = feedback?.type === 'success';
      setFeedback(null);
      if (isSuccess) navigation.goBack();
    });
  };

  const renderDraggableItem = ({ item, drag, isActive }: RenderItemParams<string>) => {
    const index = imageUrls.indexOf(item);
    const isSelected = selectedIndex === index;
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          style={[
            styles.thumbWrapper,
            { 
              opacity: isActive ? 0.6 : 1, 
              borderColor: isSelected ? colors.primary : 'transparent', 
              borderWidth: 2 
            }
          ]}
          onPress={() => setSelectedIndex(index)}
        >
          <Image source={{ uri: item }} style={styles.thumbImage} />
          {isSelected && (
            <View style={styles.selectedOverlay}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            </View>
          )}
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        {/* HEADER */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.largeTitle, { color: colors.text }]}>{t('editProduct')}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 40 + insets.bottom }}>
          {/* IMAGE SECTION */}
          <View style={styles.imageSection}>
             <View style={[styles.mainImageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
               {imageUrls.length > 0 ? (
                 <>
                   <Image source={{ uri: imageUrls[selectedIndex] || imageUrls[0] }} style={styles.mainPreviewImage} />
                   <View style={styles.imageOverlayContainer}>
                     <TouchableOpacity 
                       style={[styles.blurActionBtn, { backgroundColor: 'rgba(0,0,0,0.5)' }]} 
                       onPress={() => changeSingleImage(selectedIndex)}
                     >
                       <Ionicons name="camera" size={18} color="#fff" />
                       <Text style={styles.blurBtnLabel}>{t('changePhoto') || 'Değiştir'}</Text>
                     </TouchableOpacity>

                     <TouchableOpacity 
                       style={[styles.blurActionBtn, { backgroundColor: 'rgba(0,0,0,0.5)', marginHorizontal: 8 }]} 
                       onPress={() => cropImage(imageUrls[selectedIndex], selectedIndex)}
                     >
                       <Ionicons name="crop" size={18} color="#fff" />
                       <Text style={styles.blurBtnLabel}>{t('crop') || 'Kırp'}</Text>
                     </TouchableOpacity>

                     <TouchableOpacity 
                       style={[styles.blurActionBtn, { backgroundColor: 'rgba(255,59,48,0.6)' }]} 
                       onPress={() => removeImage(selectedIndex)}
                     >
                       <Ionicons name="trash-outline" size={18} color="#fff" />
                       <Text style={styles.blurBtnLabel}>{t('remove') || 'Kaldır'}</Text>
                     </TouchableOpacity>
                   </View>
                 </>
               ) : (
                 <TouchableOpacity onPress={pickImage} style={styles.imagePlaceholder}>
                   <Ionicons name="image-outline" size={48} color={colors.secondaryText} />
                   <Text style={{ color: colors.secondaryText, marginTop: 8 }}>Görsel Seç</Text>
                 </TouchableOpacity>
               )}
             </View>

             <View style={styles.thumbnailArea}>
               <Text style={[styles.galleryTitle, { color: colors.secondaryText }]}>{t('galleryHint')}</Text>
               <GestureHandlerRootView style={{ height: 100 }}>
                 <DraggableFlatList
                    data={imageUrls}
                    onDragEnd={({ data }) => setImageUrls(data)}
                    keyExtractor={(item) => item}
                    renderItem={renderDraggableItem}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                 />
               </GestureHandlerRootView>
             </View>

             <TouchableOpacity onPress={pickImage} style={styles.updateImageBtn}>
               <Ionicons name="add-circle" size={20} color={colors.primary} />
               <Text style={[styles.blurBtnLabel, { color: colors.primary, marginLeft: 6 }]}>{t('addPhoto')}</Text>
             </TouchableOpacity>
          </View>

          {/* FORM SECTION */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>{t('productNameLabel')}</Text>
              <TextInput
                style={[styles.underlineInput, { borderBottomColor: focusedField === 'title' ? colors.primary : colors.border, color: colors.text }]}
                value={title}
                onChangeText={setTitle}
                onFocus={() => setFocusedField('title')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>{t('descriptionLabel')}</Text>
              <TextInput
                style={[styles.underlineInput, { borderBottomColor: focusedField === 'desc' ? colors.primary : colors.border, color: colors.text }]}
                value={description}
                onChangeText={setDescription}
                multiline
                onFocus={() => setFocusedField('desc')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>{t('priceLabel')}</Text>
              <View style={[styles.underlinePriceContainer, { borderBottomColor: focusedField === 'price' ? colors.primary : colors.border }]}>
                <Text style={[styles.currencySymbol, { color: colors.text }]}>₺</Text>
                <TextInput
                  style={[styles.priceInput, { color: colors.text }]}
                  keyboardType="number-pad"
                  value={price}
                  onChangeText={handlePriceChange}
                  onFocus={() => setFocusedField('price')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>{t('categoryLabel')}</Text>
              <TouchableOpacity
                style={[styles.underlineInput, { borderBottomColor: colors.border }]}
                onPress={() => setModalVisible(true)}
              >
                <Text style={{ color: colors.text, fontSize: 16 }}>{getCategoryLabel(category)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.mainActionButton, { backgroundColor: uploading ? colors.border : colors.text }]}
            onPress={handleUpdate}
            disabled={uploading}
          >
            {uploading ? <ActivityIndicator color={colors.background} /> : <Text style={[styles.mainActionButtonText, { color: colors.background }]}>{t('save')}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* CATEGORY MODAL */}
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
              <Text style={{ color: colors.background, textAlign: 'center', fontWeight: 'bold' }}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* FEEDBACK OVERLAY */}
      {feedback && (
        <Animated.View style={[styles.feedbackOverlay, { opacity: fadeAnim, backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[styles.feedbackContent, { backgroundColor: colors.card }]}>
            <Ionicons 
              name={feedback.type === 'success' ? 'checkmark-circle' : (feedback.type === 'warning' ? 'warning' : 'alert-circle')} 
              size={54} 
              color={feedback.type === 'success' ? '#4CD964' : (feedback.type === 'warning' ? '#FF9500' : '#FF3B30')} 
            />
            <Text style={[styles.feedbackMessage, { color: colors.text }]}>{feedback.message}</Text>
            <TouchableOpacity style={[styles.closeFeedback, { backgroundColor: colors.text }]} onPress={hideFeedback}>
              <Text style={{ color: colors.background, fontWeight: 'bold' }}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
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
  imageOverlayContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingTop: 10,
  },
  blurActionBtn: {
    flexDirection: 'row',
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  blurBtnLabel: { color: '#fff', fontSize: 12, fontWeight: '600', marginLeft: 6 },
  thumbnailArea: { marginTop: 24, width: '100%' },
  galleryTitle: { fontSize: 12, fontWeight: '600', marginBottom: 12, paddingHorizontal: 4 },
  thumbWrapper: { width: 90, height: 90, borderRadius: 16, marginRight: 12, overflow: 'hidden', position: 'relative' },
  thumbImage: { width: '100%', height: '100%' },
  selectedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  updateImageBtn: { marginTop: 12, flexDirection: 'row', alignItems: 'center', padding: 10 },
  formSection: { marginBottom: 32 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  underlineInput: { borderBottomWidth: 1.5, paddingVertical: 10, fontSize: 16 },
  underlinePriceContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, paddingVertical: 4 },
  currencySymbol: { fontSize: 20, fontWeight: 'bold', marginRight: 8 },
  priceInput: { flex: 1, fontSize: 20, fontWeight: '600' },
  mainActionButton: { height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  mainActionButtonText: { fontSize: 17, fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { borderRadius: 32, padding: 24, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  modalItem: { paddingVertical: 18, borderBottomWidth: 1 },
  modalCloseBtn: { paddingVertical: 16, borderRadius: 16, marginTop: 20 },
  feedbackOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 30 },
  feedbackContent: { width: '100%', padding: 30, borderRadius: 32, alignItems: 'center', elevation: 20 },
  feedbackMessage: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginTop: 20, marginBottom: 30 },
  closeFeedback: { paddingHorizontal: 40, paddingVertical: 15, borderRadius: 16 },
});

export default UpdateProductScreen;
