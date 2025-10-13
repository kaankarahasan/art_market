import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  getAuth,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../contexts/ThemeContext';

const ChangeEmailAndPasswordScreen = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  const navigation = useNavigation();

  const { isDarkTheme } = useContext(ThemeContext);
  const styles = getStyles(isDarkTheme);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const reauthenticate = async (password: string) => {
    if (!user || !user.email) throw new Error('Kullanıcı bulunamadı');
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  };

  const handleUpdate = async () => {
    if (!user) {
      Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı.');
      return; // user null ise işlemi durdur
    }

    if (!currentPassword) {
      Alert.alert('Hata', 'Mevcut şifrenizi girmeniz gerekiyor.');
      return;
    }

    setLoading(true);

    try {
      await reauthenticate(currentPassword); // artık user null olamaz

      if (newEmail && newEmail !== user.email) {
        await updateEmail(user, newEmail);
      }

      if (newPassword) {
        if (newPassword.length < 6) {
          Alert.alert('Hata', 'Yeni şifre en az 6 karakter olmalıdır.');
          setLoading(false);
          return;
        }
        await updatePassword(user, newPassword);
      }

      Alert.alert('Başarılı', 'Bilgileriniz başarıyla güncellendi.');
      navigation.goBack();
    } catch (error: any) {
      let message = 'Güncelleme başarısız.';
      if (error.code === 'auth/wrong-password') message = 'Mevcut şifre yanlış.';
      else if (error.code === 'auth/invalid-email') message = 'Geçersiz e-posta adresi.';
      else if (error.code === 'auth/email-already-in-use') message = 'Bu e-posta zaten kullanılıyor.';
      Alert.alert('Hata', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>E-posta ve Şifre Değiştir</Text>

      <Text style={styles.label}>Mevcut Şifre</Text>
      <TextInput
        secureTextEntry
        style={styles.input}
        placeholder="Mevcut şifrenizi girin"
        placeholderTextColor={isDarkTheme ? '#999' : '#666'}
        value={currentPassword}
        onChangeText={setCurrentPassword}
      />

      <Text style={styles.label}>Yeni E-posta</Text>
      <TextInput
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        placeholder="Yeni e-posta adresiniz"
        placeholderTextColor={isDarkTheme ? '#999' : '#666'}
        value={newEmail}
        onChangeText={setNewEmail}
      />

      <Text style={styles.label}>Yeni Şifre</Text>
      <TextInput
        secureTextEntry
        style={styles.input}
        placeholder="Yeni şifre (en az 6 karakter)"
        placeholderTextColor={isDarkTheme ? '#999' : '#666'}
        value={newPassword}
        onChangeText={setNewPassword}
      />

      {loading ? (
        <ActivityIndicator
          size="large"
          color={isDarkTheme ? '#90caf9' : '#1976d2'}
          style={{ marginTop: 20 }}
        />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleUpdate}>
          <Text style={styles.buttonText}>Güncelle</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ChangeEmailAndPasswordScreen;

const getStyles = (isDarkTheme: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: isDarkTheme ? '#121212' : '#fff',
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 24,
      alignSelf: 'center',
      color: isDarkTheme ? '#fff' : '#000',
    },
    label: {
      fontSize: 16,
      marginBottom: 6,
      marginTop: 12,
      color: isDarkTheme ? '#ccc' : '#222',
    },
    input: {
      borderWidth: 1,
      borderColor: isDarkTheme ? '#444' : '#ccc',
      backgroundColor: isDarkTheme ? '#1e1e1e' : '#fff',
      color: isDarkTheme ? '#fff' : '#000',
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
    },
    button: {
      backgroundColor: isDarkTheme ? '#90caf9' : '#1976d2',
      paddingVertical: 14,
      borderRadius: 10,
      marginTop: 30,
      alignItems: 'center',
    },
    buttonText: {
      color: isDarkTheme ? '#000' : '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
  });
