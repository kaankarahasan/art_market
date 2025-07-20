import React, { useEffect, useState } from 'react';
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
import { auth, db, storage } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const EditProfileScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const userId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsername(data.username || '');
          setBio(data.bio || '');
          setImage(data.photoURL || null);
        }
      } catch {
        Alert.alert('Error', 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission denied', 'Camera access is required.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    if (!userId) return null;
    setUploading(true);

    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const storageRef = ref(storage, `profilePictures/${userId}.jpg`);
      await uploadBytes(storageRef, blob);

      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error: any) {
      Alert.alert('Upload Error', error.message || 'Failed to upload image');
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
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    try {
      let photoURL = image;

      if (image && !image.startsWith('https://')) {
        const uploadedURL = await uploadImage(image);
        if (uploadedURL) {
            photoURL = uploadedURL;
            setImage(uploadedURL); // Burada local state'i güncelliyoruz
        }
        }


      await updateDoc(doc(db, 'users', userId), {
        username,
        bio,
        photoURL: photoURL || '',
      });

      Alert.alert('Success', 'Profile updated!');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile.');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Profile</Text>

      <TouchableOpacity onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.photoButtons}>
        <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
          <Text style={styles.photoButtonText}>Kameradan Çek</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.photoButton, { backgroundColor: '#ccc' }]} onPress={removeImage}>
          <Text style={[styles.photoButtonText, { color: '#333' }]}>Fotoğrafı Kaldır</Text>
        </TouchableOpacity>
      </View>

      {uploading && <ActivityIndicator size="small" color="#1976d2" style={{ marginBottom: 10 }} />}

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your username"
        value={username}
        onChangeText={setUsername}
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, { height: 100 }]}
        placeholder="Tell us about yourself"
        value={bio}
        onChangeText={setBio}
        multiline
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, alignSelf: 'center' },
  label: { fontSize: 16, fontWeight: '500', marginTop: 10, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 10,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#666',
    fontSize: 14,
  },
  photoButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  photoButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  photoButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  saveButton: {
    marginTop: 30,
    backgroundColor: '#4caf50',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default EditProfileScreen;
