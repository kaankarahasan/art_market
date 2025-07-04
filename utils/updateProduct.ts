import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const updateProduct = async (
  productId: string,
  updatedFields: { title?: string; description?: string }
) => {
  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, updatedFields);
    console.log('Ürün güncellendi');
  } catch (error) {
    console.error('Ürün güncellenirken hata:', error);
  }
};
