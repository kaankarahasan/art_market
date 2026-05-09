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
import ReactNativeFirebaseAuth from '@react-native-firebase/auth';
import { auth } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const ChangeEmailAndPasswordScreen = () => {
  const user = auth.currentUser;
  const navigation = useNavigation();

  const { isDarkTheme } = useContext(ThemeContext);
  const styles = getStyles(isDarkTheme);
  const { t } = useLanguage();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const reauthenticate = async (password: string) => {
    if (!user || !user.email) throw new Error('Kullanıcı bulunamadı');
    const credential = ReactNativeFirebaseAuth.EmailAuthProvider.credential(user.email, password);
    await user.reauthenticateWithCredential(credential);
  };

  const handleUpdate = async () => {
    if (!user) {
      Alert.alert(t('error'), t('loginRequired'));
      return;
    }

    if (!currentPassword) {
      Alert.alert(t('error'), t('currentPasswordPlaceholder')); // or a more specific message, but context implies we just need a string
      return;
    }

    setLoading(true);

    try {
      await reauthenticate(currentPassword);

      if (newEmail && newEmail !== user.email) {
        await user.updateEmail(newEmail);
      }

      if (newPassword) {
        if (newPassword.length < 6) {
          Alert.alert(t('error'), t('newPasswordPlaceholder'));
          setLoading(false);
          return;
        }
        await user.updatePassword(newPassword);
      }

      Alert.alert(t('success'), t('updateSuccess'));
      navigation.goBack();
    } catch (error: any) {
      console.error("Update credentials error:", error);
      let message = t('error');
      if (error.code === 'auth/wrong-password') message = 'Mevcut şifre yanlış.'; // will add later if needed
      else if (error.code === 'auth/invalid-email') message = 'Geçersiz e-posta adresi.';
      else if (error.code === 'auth/email-already-in-use') message = 'Bu e-posta zaten kullanılıyor.';
      Alert.alert(t('error'), message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('changeCredentialsTitle')}</Text>

      <Text style={styles.label}>{t('currentPassword')}</Text>
      <TextInput
        secureTextEntry
        style={styles.input}
        placeholder={t('currentPasswordPlaceholder')}
        placeholderTextColor={isDarkTheme ? '#999' : '#666'}
        value={currentPassword}
        onChangeText={setCurrentPassword}
      />

      <Text style={styles.label}>{t('newEmail')}</Text>
      <TextInput
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        placeholder={t('newEmailPlaceholder')}
        placeholderTextColor={isDarkTheme ? '#999' : '#666'}
        value={newEmail}
        onChangeText={setNewEmail}
      />

      <Text style={styles.label}>{t('newPassword')}</Text>
      <TextInput
        secureTextEntry
        style={styles.input}
        placeholder={t('newPasswordPlaceholder')}
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
          <Text style={styles.buttonText}>{t('update')}</Text>
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
