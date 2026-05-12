import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes/types';
import { getDoc, doc, updateDoc } from '@react-native-firebase/firestore';
import { ref, putFile, getDownloadURL, deleteObject } from '@react-native-firebase/storage';
import { auth, db, storage } from '../firebaseConfig';
import ImagePicker from 'react-native-image-crop-picker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useThemeContext } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

const EditProfileScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, isDarkTheme } = useThemeContext();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const userId = auth.currentUser?.uid;
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      try {
        const userSnap = await getDoc(doc(db, 'users', userId));
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data) {
            setUsername(data.username || '');
            setBio(data.bio || '');
            setImage(data.photoURL || null);
          }
        }
      } catch (err) {
        console.error("Profile load error:", err);
        Alert.alert(t('error'), 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  const pickImage = async () => {
    try {
      const image = await ImagePicker.openPicker({
        width: 400,
        height: 400,
        cropping: true,
        cropperCircleOverlay: true,
        mediaType: 'photo',
      });

      if (image.path) {
        setImage(image.path);
      }
    } catch (err: any) {
      if (err.message !== 'User cancelled image selection') {
        console.warn(err);
      }
    }
  };

  const takePhoto = async () => {
    try {
      const image = await ImagePicker.openCamera({
        width: 400,
        height: 400,
        cropping: true,
        cropperCircleOverlay: true,
        mediaType: 'photo',
      });

      if (image.path) {
        setImage(image.path);
      }
    } catch (err: any) {
      if (err.message !== 'User cancelled image selection') {
        console.warn(err);
      }
    }
  };

  const cropExistingImage = async () => {
    if (!image) return;
    try {
      const cleanUri = image.startsWith('http') ? image : (image.startsWith('file://') ? image : `file://${image}`);
      const cropped = await ImagePicker.openCropper({
        path: cleanUri,
        width: 400,
        height: 400,
        cropping: true,
        cropperCircleOverlay: true,
        mediaType: 'photo',
        cropperToolbarTitle: t('cropImage') || 'Görseli Kırp',
        cropperActiveWidgetColor: '#FF3040',
        cropperToolbarColor: isDarkTheme ? '#121212' : '#F4F4F4',
        cropperToolbarWidgetColor: isDarkTheme ? '#FFFFFF' : '#333333',
        hideBottomControls: false,
      });

      if (cropped.path) {
        setImage(cropped.path);
      }
    } catch (err: any) {
      if (err.message !== 'User cancelled image selection') {
        console.warn(err);
      }
    }
  };

  const uploadImage = async (uri: string) => {
    if (!userId) return null;
    setUploading(true);

    try {
      const storageRef = ref(storage, `profilePictures/${userId}.jpg`);
      await putFile(storageRef, uri);
      return await getDownloadURL(storageRef);
    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert(t('error'), error.message || 'Failed to upload image');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    if (!userId) return;
    try {
      const storageRef = ref(storage, `profilePictures/${userId}.jpg`);
      await deleteObject(storageRef);
      setImage(null);
    } catch (error: any) {
      console.log('Image removal error:', error.message);
      setImage(null); // Even if it fails to delete (might not exist), clear local state
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
      if (isSuccess) {
        navigation.goBack();
      }
    });
  };

  const handleSave = async () => {
    if (!userId) return;
    try {
      setUploading(true);
      let photoURL = image;
      if (image && !image.startsWith('https://')) {
        const uploadedURL = await uploadImage(image);
        if (uploadedURL) photoURL = uploadedURL;
      }

      await updateDoc(doc(db, 'users', userId), {
        username,
        bio,
        photoURL: photoURL || '',
      });

      setFeedback({ type: 'success', message: t('profileUpdated') });
    } catch (error: any) {
      console.error("Profile update error:", error);
      setFeedback({ type: 'error', message: error.message || 'Profil güncellenirken hata oluştu.' });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={isDarkTheme ? '#90caf9' : '#000'} />
      </View>
    );
  }

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />
      
      {/* HEADER */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.largeTitle, { color: colors.text }]}>{t('editProfile')}</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
      >
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={image ? cropExistingImage : pickImage} activeOpacity={0.8}>
            {image ? (
              <Image source={{ uri: image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.card }]}>
                <Ionicons name="person-outline" size={40} color={colors.secondaryText} />
              </View>
            )}
            <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          
          <View style={styles.photoButtons}>
            <TouchableOpacity style={[styles.photoButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={pickImage}>
              <Text style={[styles.photoButtonText, { color: colors.text }]}>{t('addPhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.photoButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={takePhoto}>
              <Text style={[styles.photoButtonText, { color: colors.text }]}>{t('takeFromCamera')}</Text>
            </TouchableOpacity>
            {image && (
              <TouchableOpacity style={[styles.photoButton, { backgroundColor: colors.card, borderColor: '#FF3B30' }]} onPress={removeImage}>
                <Text style={[styles.photoButtonText, { color: '#FF3B30' }]}>{t('removePhoto')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.secondaryText }]}>{t('usernameLabel')}</Text>
            <TextInput
              style={[
                styles.underlineInput, 
                { borderBottomColor: focusedField === 'username' ? colors.primary : colors.border, color: colors.text }
              ]}
              placeholder={t('usernamePlaceholderEdit')}
              placeholderTextColor={colors.secondaryText}
              value={username}
              onChangeText={setUsername}
              onFocus={() => setFocusedField('username')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.secondaryText }]}>{t('bioLabel')}</Text>
            <TextInput
              style={[
                styles.underlineInput, 
                { borderBottomColor: focusedField === 'bio' ? colors.primary : colors.border, color: colors.text, minHeight: 40 }
              ]}
              placeholder={t('bioPlaceholder')}
              placeholderTextColor={colors.secondaryText}
              value={bio}
              onChangeText={setBio}
              multiline
              onFocus={() => setFocusedField('bio')}
              onBlur={() => setFocusedField(null)}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.mainActionButton, { backgroundColor: uploading ? colors.border : colors.text }]} 
          onPress={handleSave}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.mainActionButtonText, { color: colors.background }]}>{t('saveButton')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  container: { flex: 1, paddingHorizontal: 24 },
  
  avatarSection: { alignItems: 'center', marginBottom: 32, marginTop: 10 },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  cameraBadge: { position: 'absolute', bottom: 5, right: 5, width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  
  photoButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 20 },
  photoButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  photoButtonText: { fontSize: 13, fontWeight: '600' },
  formSection: { marginBottom: 32 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  underlineInput: { borderBottomWidth: 1.5, paddingVertical: 10, fontSize: 16, lineHeight: 22 },
  mainActionButton: { height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 4 },
  mainActionButtonText: { fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 },
  feedbackOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: 30 },
  feedbackContent: { width: '100%', padding: 30, borderRadius: 32, alignItems: 'center', elevation: 20 },
  feedbackMessage: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginTop: 20, marginBottom: 30, lineHeight: 26 },
  closeFeedback: { paddingHorizontal: 40, paddingVertical: 15, borderRadius: 16 },
});

export default EditProfileScreen;
