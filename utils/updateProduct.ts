import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../routes/types';

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
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      ...updatedFields,
      updatedAt: serverTimestamp(),
    });
    console.log('✅ Ürün güncellendi');
  } catch (error) {
    console.error('❌ Ürün güncellenirken hata:', error);
  }
};
