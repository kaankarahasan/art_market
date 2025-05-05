import { db, auth } from './firebase';
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

const storage = getStorage(); // storage'ı burada başlat

// 📌 Takip etme
export const followUser = async (userId: string) => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const currentUserId = currentUser.uid;

    await updateDoc(doc(db, 'users', userId), {
      followers: arrayUnion(currentUserId),
    });

    await updateDoc(doc(db, 'users', currentUserId), {
      following: arrayUnion(userId),
    });
  }
};

// 📌 Takipten çıkma
export const unfollowUser = async (userId: string) => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const currentUserId = currentUser.uid;

    await updateDoc(doc(db, 'users', userId), {
      followers: arrayRemove(currentUserId),
    });

    await updateDoc(doc(db, 'users', currentUserId), {
      following: arrayRemove(userId),
    });
  }
};

// 📌 Görsel yükleme ve URL alma
export const uploadImageAndGetUrl = async (uri: string): Promise<string> => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const imageRef = ref(storage, `artworks/${Date.now()}.jpg`);
  await uploadBytes(imageRef, blob);
  return await getDownloadURL(imageRef);
};

// 📌 Yeni artwork kaydetme (Firestore'a)
export const saveArtwork = async ({
  ownerId,
  title,
  description,
  imageUrl,
}: {
  ownerId: string;
  title: string;
  description: string;
  imageUrl: string;
}) => {
  await addDoc(collection(db, 'products'), {
    ownerId,
    title,
    description,
    imageUrl,
    isSold: false,
    createdAt: serverTimestamp(),
  });
};
