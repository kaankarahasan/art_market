import { deleteDoc, doc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

export const deleteProduct = async (
  productId: string,
  imageUrl: string | null,
  isSold: boolean
) => {
  try {
    const productRef = doc(db, 'products', productId);

    // Eğer ürünün bir görseli varsa sil
    if (imageUrl) {
      let imagePath: string | null = imageUrl;

      // URL ise storage path'e çevir
      if (imageUrl.startsWith('https://')) {
        const decodedUrl = decodeURIComponent(imageUrl);
        const match = decodedUrl.match(/o\/(product_images%2F.+)\?/);
        if (match && match[1]) {
          imagePath = match[1].replace(/%2F/g, '/');
        } else {
          imagePath = null;
        }
      }

      if (imagePath !== null) {
        const imageRef = ref(storage, imagePath);
        await deleteObject(imageRef).catch((error) => {
          if (error.code === 'storage/object-not-found') {
            console.warn(
              'Silinecek dosya bulunamadı, zaten silinmiş olabilir.'
            );
          } else {
            throw error;
          }
        });
      }
    }

    // Ürünü Firestore'dan sil
    await deleteDoc(productRef);
    console.log('✅ Ürün silindi');
  } catch (error) {
    console.error('❌ Ürün silinirken hata:', error);
  }
};
