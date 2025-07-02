// --- AddProductScreen.tsx ---
import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text, Alert } from 'react-native';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';

const AddProductScreen = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const auth = getAuth();
  const db = getFirestore();
  const navigation = useNavigation();

  const handleAddProduct = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const newProduct = {
        title,
        description,
        ownerId: currentUser.uid,
        createdAt: Timestamp.now(),
        isSold: false,
      };

      await addDoc(collection(db, 'products'), newProduct);
      Alert.alert('Başarılı', 'Ürün eklendi');
      navigation.goBack();
    } catch (error) {
      console.error('Ürün eklenemedi:', error);
      Alert.alert('Hata', 'Ürün eklenirken bir hata oluştu');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Ürün Adı</Text>
      <TextInput
        style={styles.input}
        placeholder="Ürün adı girin"
        value={title}
        onChangeText={setTitle}
      />
      <Text style={styles.label}>Açıklama</Text>
      <TextInput
        style={[styles.input, { height: 100 }]}
        placeholder="Açıklama girin"
        multiline
        value={description}
        onChangeText={setDescription}
      />
      <Button title="Kaydet" onPress={handleAddProduct} />
    </View>
  );
};

export default AddProductScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  label: {
    marginBottom: 5,
    fontWeight: 'bold',
  },
});
