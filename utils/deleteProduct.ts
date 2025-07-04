// utils/deleteProduct.ts
import { Alert } from 'react-native';
import { deleteDoc, doc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

export const deleteProduct = async (
  productId: string,
  imageUrl: string | null,
  isSold: boolean,
  onSuccess: () => void
) => {
  if (isSold) {
    Alert.alert('Silinemez', 'Satılmış ürünleri silemezsiniz.');
    return;
  }

  Alert.alert(
    'Emin misiniz?',
    'Bu ürünü silmek istediğinize emin misiniz?',
    [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'products', productId));

            if (imageUrl) {
              const imagePath = decodeURIComponent(imageUrl.split('/o/')[1].split('?')[0]);
              const imageRef = ref(storage, imagePath);
              await deleteObject(imageRef);
            }

            Alert.alert('Başarılı', 'Ürün silindi.');
            onSuccess(); // Listeyi güncelle
          } catch (error) {
            console.error('Silme hatası:', error);
            Alert.alert('Hata', 'Ürün silinirken bir hata oluştu.');
          }
        },
      },
    ]
  );
};
