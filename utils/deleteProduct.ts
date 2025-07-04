import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

export const deleteProduct = async (
  productId: string,
  imageUrl: string | null,
  isSold: boolean
) => {
  try {
    const productRef = doc(db, 'products', productId);

    if (imageUrl) {
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
    }

    await deleteDoc(productRef);
    console.log('Ürün silindi');
  } catch (error) {
    console.error('Ürün silinirken hata:', error);
  }
};
