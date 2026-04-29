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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes/types';
import { getDoc, doc, updateDoc } from '@react-native-firebase/firestore';
import { ref } from '@react-native-firebase/storage';
import { auth, db, storage } from '../firebase';
import ImagePicker from 'react-native-image-crop-picker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { ThemeContext } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EditProfileScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isDarkTheme } = useContext(ThemeContext);
  const styles = getStyles(isDarkTheme);
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const userId = auth.currentUser?.uid;
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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
      await storageRef.putFile(uri);
      return await storageRef.getDownloadURL();
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
      await storageRef.delete();
      setImage(null);
    } catch (error: any) {
      console.log('Image removal error:', error.message);
      setImage(null); // Even if it fails to delete (might not exist), clear local state
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    try {
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

      Alert.alert(t('success'), t('profileUpdated'));
      navigation.goBack();
    } catch (error: any) {
      console.error("Profile update error:", error);
      Alert.alert(t('error'), error.message || 'Failed to update profile.');
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
    <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
      <Text style={styles.title}>{t('editProfileTitle')}</Text>

      <TouchableOpacity onPress={image ? cropExistingImage : pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{t('addPhoto')}</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.photoButtons}>
        <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
          <Text style={styles.photoButtonText}>{t('takeFromCamera')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.photoButton, { backgroundColor: '#ccc' }]}
          onPress={removeImage}
        >
          <Text style={[styles.photoButtonText, { color: '#333' }]}>{t('removePhoto')}</Text>
        </TouchableOpacity>
      </View>

      {uploading && (
        <ActivityIndicator
          size="small"
          color={isDarkTheme ? '#90caf9' : '#1976d2'}
          style={{ marginBottom: 10 }}
        />
      )}

      <Text style={styles.label}>{t('usernameLabel')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('usernamePlaceholderEdit')}
        placeholderTextColor={isDarkTheme ? '#aaa' : '#666'}
        value={username}
        onChangeText={setUsername}
      />

      <Text style={styles.label}>{t('bioLabel')}</Text>
      <TextInput
        style={[styles.input, { height: 100 }]}
        placeholder={t('bioPlaceholder')}
        placeholderTextColor={isDarkTheme ? '#aaa' : '#666'}
        value={bio}
        onChangeText={setBio}
        multiline
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>{t('saveButton')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const getStyles = (isDarkTheme: boolean) =>
  StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: isDarkTheme ? '#121212' : '#fff' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      alignSelf: 'center',
      color: isDarkTheme ? '#fff' : '#000',
    },
    label: { fontSize: 16, fontWeight: '500', marginTop: 10, marginBottom: 5, color: isDarkTheme ? '#ccc' : '#222' },
    input: {
      borderWidth: 1,
      borderColor: isDarkTheme ? '#444' : '#ccc',
      borderRadius: 10,
      padding: 10,
      fontSize: 16,
      backgroundColor: isDarkTheme ? '#1e1e1e' : '#f9f9f9',
      color: isDarkTheme ? '#fff' : '#000',
    },
    avatar: { width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginBottom: 10 },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: isDarkTheme ? '#333' : '#ddd',
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: 10,
    },
    avatarText: { color: isDarkTheme ? '#bbb' : '#666', fontSize: 14 },
    photoButtons: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 },
    photoButton: { backgroundColor: '#1976d2', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
    photoButtonText: { color: '#fff', fontSize: 14 },
    saveButton: { marginTop: 30, backgroundColor: '#4caf50', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  });

export default EditProfileScreen;
