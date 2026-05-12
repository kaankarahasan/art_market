import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  Timestamp 
} from '@react-native-firebase/firestore';
import { db } from '../firebaseConfig';

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface Offer {
  id?: string;
  productId: string;
  productTitle: string;
  productImage: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  serviceFee?: number;
  totalAmount?: number;
  originalPrice: number;
  note?: string;
  status: OfferStatus;
  createdAt: Timestamp | any;
  updatedAt: Timestamp | any;
}

export const offerService = {
  /**
   * Yeni bir teklif gönderir
   */
  async sendOffer(offerData: Omit<Offer, 'id' | 'createdAt' | 'updatedAt' | 'status'>) {
    // Aynı ürün için aktif bir teklif var mı kontrol et
    const q = query(
      collection(db, 'offers'),
      where('productId', '==', offerData.productId),
      where('buyerId', '==', offerData.buyerId),
      where('status', '==', 'pending')
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      throw new Error('alreadyOffered');
    }

    return await addDoc(collection(db, 'offers'), {
      ...offerData,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Teklifi iptal eder (Alıcı tarafından)
   */
  async cancelOffer(offerId: string) {
    const offerRef = doc(db, 'offers', offerId);
    return await updateDoc(offerRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Teklife yanıt verir (Satıcı tarafından)
   */
  async respondToOffer(offerId: string, productId: string, status: 'accepted' | 'rejected') {
    const offerRef = doc(db, 'offers', offerId);
    
    // Teklif durumunu güncelle
    await updateDoc(offerRef, {
      status,
      updatedAt: serverTimestamp(),
    });

    // Eğer kabul edildiyse ürünü satıldı olarak işaretle
    if (status === 'accepted') {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        isSold: true,
        status: 'sold',
        updatedAt: serverTimestamp(),
      });
    }
  }
};
