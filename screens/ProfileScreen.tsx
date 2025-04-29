import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const ProfileScreen = () => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isImageModalVisible, setImageModalVisible] = useState(false);
  const navigation = useNavigation();
  const auth = getAuth();
  const firestore = getFirestore();
  const user = auth.currentUser;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const docRef = doc(firestore, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      } catch (error) {
        console.error('Kullanıcı verisi alınamadı:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const goToSettings = () => {
    navigation.navigate('Settings' as never);
  };

  const toggleImageModal = () => {
    setImageModalVisible(!isImageModalVisible);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#666" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container]}>
      <TouchableOpacity
        style={[styles.settingsIcon, { top: insets.top + 10 }]}
        onPress={goToSettings}
      >
        <Icon name="settings-outline" size={28} color="#000" />
      </TouchableOpacity>

      <View style={styles.headerSection}>
        <TouchableOpacity onPress={toggleImageModal}>
          <Image
            source={
              userData?.profilePicture
                ? { uri: userData.profilePicture }
                : require('../assets/default-avatar.png')
            }
            style={styles.avatar}
          />
        </TouchableOpacity>
        <Text style={styles.username}>@{userData?.username || 'kullaniciadi'}</Text>
        <Text style={styles.fullName}>
          {userData?.fullName || 'Ad Soyad'}
        </Text>
      </View>

      <Modal
        visible={isImageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={toggleImageModal}
      >
        <TouchableWithoutFeedback onPress={toggleImageModal}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <TouchableWithoutFeedback>
                <View style={styles.modalImageWrapper}>
                  <Image
                    source={
                      userData?.profilePicture
                        ? { uri: userData.profilePicture }
                        : require('../assets/default-avatar.png')
                    }
                    style={styles.modalImage}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  settingsIcon: {
    position: 'absolute',
    right: 20,
    zIndex: 1,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 60,
    marginBottom: 12,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  fullName: {
    fontSize: 16,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageWrapper: {
    borderRadius: 100,
    overflow: 'hidden',
  },
  modalImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
});
