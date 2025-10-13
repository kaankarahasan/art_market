import { db, auth } from './firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

/**
 * Kullanıcıyı takip et
 * @param userId - Takip edilecek kullanıcı ID'si
 */
export const followUser = async (userId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const currentUserId = currentUser.uid;

  const userRef = doc(db, 'users', userId);
  const currentUserRef = doc(db, 'users', currentUserId);

  try {
    // Takip edilen kullanıcının followers listesine ekle
    await updateDoc(userRef, {
      followers: arrayUnion(currentUserId),
    });

    // Takip eden kullanıcının following listesine ekle
    await updateDoc(currentUserRef, {
      following: arrayUnion(userId),
    });
  } catch (error) {
    console.error('Kullanıcı takip işlemi sırasında hata:', error);
  }
};

/**
 * Kullanıcıyı takipten çıkar
 * @param userId - Takipten çıkarılacak kullanıcı ID'si
 */
export const unfollowUser = async (userId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const currentUserId = currentUser.uid;

  const userRef = doc(db, 'users', userId);
  const currentUserRef = doc(db, 'users', currentUserId);

  try {
    // Takip edilen kullanıcının followers listesinden çıkar
    await updateDoc(userRef, {
      followers: arrayRemove(currentUserId),
    });

    // Takip eden kullanıcının following listesinden çıkar
    await updateDoc(currentUserRef, {
      following: arrayRemove(userId),
    });
  } catch (error) {
    console.error('Kullanıcı takipten çıkarma işlemi sırasında hata:', error);
  }
};
