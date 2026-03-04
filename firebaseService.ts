import { doc, updateDoc, arrayUnion, arrayRemove } from '@react-native-firebase/firestore';
import { db, auth } from './firebase';

/**
 * Kullanıcıyı takip et
 * @param userId - Takip edilecek kullanıcı ID'si
 */
export const followUser = async (userId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const currentUserId = currentUser.uid;

  try {
    // Takip edilen kullanıcının followers listesine ekle
    await updateDoc(doc(db, 'users', userId), {
      followers: arrayUnion(currentUserId),
    });

    // Takip eden kullanıcının following listesine ekle
    await updateDoc(doc(db, 'users', currentUserId), {
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

  try {
    // Takip edilen kullanıcının followers listesinden çıkar
    await updateDoc(doc(db, 'users', userId), {
      followers: arrayRemove(currentUserId),
    });

    // Takip eden kullanıcının following listesinden çıkar
    await updateDoc(doc(db, 'users', currentUserId), {
      following: arrayRemove(userId),
    });
  } catch (error) {
    console.error('Kullanıcı takipten çıkarma işlemi sırasında hata:', error);
  }
};
