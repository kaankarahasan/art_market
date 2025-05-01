import { db, auth } from './firebase'; // firebase.tsx dosyanızdaki yapı ile uygun import yapmalısınız
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

// Kullanıcıyı takip etme fonksiyonu
export const followUser = async (userId: string) => {
  const currentUser = auth.currentUser; // Şu an giriş yapan kullanıcı
  if (currentUser) {
    const currentUserId = currentUser.uid;

    // Takip edilen kullanıcının 'followers' listesine ekleyin
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      followers: arrayUnion(currentUserId), // Takipçi ekleniyor
    });

    // Takip eden kullanıcının 'following' listesine ekleyin
    const currentUserRef = doc(db, 'users', currentUserId);
    await updateDoc(currentUserRef, {
      following: arrayUnion(userId), // Takip edilen kişi ekleniyor
    });
  }
};

// Kullanıcıyı takipten çıkarma fonksiyonu
export const unfollowUser = async (userId: string) => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const currentUserId = currentUser.uid;

    // Takip edilen kullanıcının 'followers' listesinden çıkarın
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      followers: arrayRemove(currentUserId), // Takipçi çıkarılıyor
    });

    // Takip eden kullanıcının 'following' listesinden çıkarın
    const currentUserRef = doc(db, 'users', currentUserId);
    await updateDoc(currentUserRef, {
      following: arrayRemove(userId), // Takip edilen kişi çıkarılıyor
    });
  }
};
