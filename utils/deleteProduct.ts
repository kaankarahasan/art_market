import { doc, deleteDoc } from '@react-native-firebase/firestore';
import { ref } from '@react-native-firebase/storage';
import { db, storage } from '../firebaseConfig';

export const deleteProduct = async (
  productId: string,
  imageUrl: string | null,
  isSold: boolean
) => {
  try {
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
        await imageRef.delete().catch((error: any) => {
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
    await deleteDoc(doc(db, 'products', productId));
    console.log('✅ Ürün silindi');
  } catch (error) {
    console.error('❌ Ürün silinirken hata:', error);
  }
};
