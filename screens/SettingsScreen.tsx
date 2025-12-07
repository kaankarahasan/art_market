import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase'; // relative path
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes/types'; // relative path
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useThemeContext } from '../contexts/ThemeContext'; // relative path

const SettingsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const userId = auth.currentUser?.uid;

  const { isDarkTheme, toggleTheme, colors } = useThemeContext();



  const onToggleTheme = () => {
    toggleTheme();
    Alert.alert('Tema Değişti', `Tema ${!isDarkTheme ? 'Karanlık' : 'Açık'} olarak ayarlandı.`);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          onPress: () => {
            signOut(auth)
              .then(() => navigation.replace('Login'))
              .catch(error => Alert.alert('Hata', error.message));
          },
        },
      ],
      { cancelable: false }
    );
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Ayarlar</Text>

      {/* Hesap Bölümü */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Hesap</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
          <Text style={[styles.item, { color: colors.text }]}>Profil Bilgilerini Düzenle</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('ChangeEmailAndPassword')}>
          <Text style={[styles.item, { color: colors.text }]}>E-posta / Şifre Değiştir</Text>
        </TouchableOpacity>
      </View>



      {/* Görünüm */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Görünüm</Text>
        <View style={styles.privacyRow}>
          <Text style={[styles.item, { color: colors.text }]}>
            Tema: {isDarkTheme ? 'Karanlık' : 'Açık'}
          </Text>
          <Switch
            value={isDarkTheme}
            onValueChange={onToggleTheme}
            trackColor={{ false: '#ccc', true: '#1976d2' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Bildirimler */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Bildirimler</Text>
        <Text style={[styles.item, { color: colors.text }]}>Push Bildirimleri</Text>
        <Text style={[styles.item, { color: colors.text }]}>Ürün Bildirimleri</Text>
      </View>

      {/* Hakkında */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Hakkında</Text>
        <TouchableOpacity onPress={() => navigation.navigate('About')}>
          <Text style={[styles.item, { color: colors.text }]}>Hakkımızda</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
          <Text style={[styles.item, { color: colors.text }]}>Gizlilik Politikası</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')}>
          <Text style={[styles.item, { color: colors.text }]}>Kullanım Şartları</Text>
        </TouchableOpacity>
      </View>

      {/* Çıkış Yap */}
      <TouchableOpacity
        style={[styles.signOutButton, { backgroundColor: '#ff5252' }]}
        onPress={handleSignOut}
      >
        <Text style={styles.signOutButtonText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, alignSelf: 'center' },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  item: { fontSize: 16, paddingVertical: 6, paddingLeft: 10 },
  privacyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  signOutButton: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10, alignSelf: 'center', marginTop: 30 },
  signOutButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default SettingsScreen;
