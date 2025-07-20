import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { getAuth, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';

const ChangeEmailAndPasswordScreen = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  const navigation = useNavigation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const reauthenticate = async (currentPassword: string) => {
    if (!user || !user.email) throw new Error('Kullanıcı bulunamadı');
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
  };

  const handleUpdate = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Kullanıcıyı doğrula
      await reauthenticate(currentPassword);

      // E-posta değişikliği varsa güncelle
      if (newEmail && newEmail !== user.email) {
        await updateEmail(user, newEmail);
      }

      // Şifre değişikliği varsa güncelle
      if (newPassword) {
        if (newPassword.length < 6) {
          Alert.alert('Hata', 'Yeni şifre en az 6 karakter olmalıdır.');
          setLoading(false);
          return;
        }
        await updatePassword(user, newPassword);
      }

      Alert.alert('Başarılı', 'Bilgileriniz güncellendi.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Güncelleme başarısız.');
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
        value={currentPassword}
        onChangeText={setCurrentPassword}
      />

      <Text style={styles.label}>Yeni E-posta</Text>
      <TextInput
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
        placeholder="Yeni e-posta adresiniz"
        value={newEmail}
        onChangeText={setNewEmail}
      />

      <Text style={styles.label}>Yeni Şifre</Text>
      <TextInput
        secureTextEntry
        style={styles.input}
        placeholder="Yeni şifre (en az 6 karakter)"
        value={newPassword}
        onChangeText={setNewPassword}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#1976d2" style={{ marginTop: 20 }} />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleUpdate}>
          <Text style={styles.buttonText}>Güncelle</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ChangeEmailAndPasswordScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, alignSelf: 'center' },
  label: { fontSize: 16, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#1976d2',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 30,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
