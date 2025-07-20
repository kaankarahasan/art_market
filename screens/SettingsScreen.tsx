import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Switch } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase'; 
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes/types';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const SettingsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const userId = auth.currentUser?.uid;

  const [isPrivate, setIsPrivate] = useState(false);
  const [loadingPrivacy, setLoadingPrivacy] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchPrivacy = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setIsPrivate(userDoc.data().isPrivate || false);
        }
      } catch {
        Alert.alert('Hata', 'Gizlilik durumu alınamadı');
      } finally {
        setLoadingPrivacy(false);
      }
    };
    fetchPrivacy();
  }, [userId]);

  const togglePrivacy = async () => {
    if (!userId) return;
    try {
      const newPrivacy = !isPrivate;
      await updateDoc(doc(db, 'users', userId), { isPrivate: newPrivacy });
      setIsPrivate(newPrivacy);
      Alert.alert('Başarılı', `Profiliniz ${newPrivacy ? 'gizli' : 'açık'} olarak ayarlandı.`);
    } catch {
      Alert.alert('Hata', 'Gizlilik ayarı güncellenemedi');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          onPress: () => {
            signOut(auth)
              .then(() => {
                navigation.replace('Login');
              })
              .catch(error => {
                Alert.alert('Error', error.message);
              });
          },
        },
      ],
      { cancelable: false }
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>

      {/* Hesap Bölümü */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hesap</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
          <Text style={styles.item}>Profil Bilgilerini Düzenle</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ChangeEmailAndPassword')}>
          <Text style={styles.item}>E-posta / Şifre Değiştir</Text>
        </TouchableOpacity>
      </View>

      {/* Gizlilik Bölümü */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gizlilik</Text>

        <View style={styles.privacyRow}>
          <Text style={styles.item}>Hesabı Gizli Yap</Text>
          {loadingPrivacy ? (
            <Text>Yükleniyor...</Text>
          ) : (
            <Switch
              value={isPrivate}
              onValueChange={togglePrivacy}
              trackColor={{ false: '#ccc', true: '#1976d2' }}
              thumbColor={isPrivate ? '#fff' : '#fff'}
            />
          )}
        </View>

        <TouchableOpacity onPress={() => Alert.alert('Takipçi / Yorum Ayarları', 'Bu özellik üzerinde çalışılıyor.')}>
          <Text style={styles.item}>Takipçi / Yorum Ayarları</Text>
        </TouchableOpacity>
      </View>

      {/* Görünüm */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Görünüm</Text>
        <Text style={styles.item}>Tema: Açık / Karanlık</Text>
      </View>

      {/* Bildirimler */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bildirimler</Text>
        <Text style={styles.item}>Push Bildirimleri</Text>
        <Text style={styles.item}>Ürün Bildirimleri</Text>
      </View>

      {/* Hakkında */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hakkında</Text>
        <Text style={styles.item}>Hakkımızda</Text>
        <Text style={styles.item}>Gizlilik Politikası</Text>
        <Text style={styles.item}>Kullanım Şartları</Text>
      </View>

      {/* Çıkış */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    padding: 20,
    paddingBottom: 40,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 30,
    alignSelf: 'center',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#444',
  },
  item: {
    fontSize: 16,
    paddingVertical: 6,
    paddingLeft: 10,
    color: '#666',
  },
  privacyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signOutButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    backgroundColor: '#ff5252',
    alignSelf: 'center',
    marginTop: 30,
  },
  signOutButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});

export default SettingsScreen;
