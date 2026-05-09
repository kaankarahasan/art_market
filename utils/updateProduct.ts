import { serverTimestamp, doc, updateDoc } from '@react-native-firebase/firestore';
import { db } from '../firebaseConfig';

type UpdateProductFields = {
  title?: string;
  description?: string;
  price?: number;
  category?: string;
  imageUrls?: string[];      // Birden fazla görsel
  mainImageUrl?: string;     // Ana görsel (liste görünümünde)
};

export const updateProduct = async (
  productId: string,
  updatedFields: UpdateProductFields
) => {
  try {
    await updateDoc(doc(db, 'products', productId), {
      ...updatedFields,
      updatedAt: serverTimestamp(),
    });
    console.log('✅ Ürün güncellendi');
  } catch (error) {
    console.error('❌ Ürün güncellenirken hata:', error);
  }
};
