import { db, auth } from '../firebaseConfig';
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  onSnapshot
} from '@react-native-firebase/firestore';

export const artworkFollowerService = {
  /**
   * Toggles follow status for an artwork
   */
  async toggleFollowArtwork(artworkId: string, artworkTitle: string, artworkImage: string) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const followRef = doc(db, 'artworkFollowers', `${artworkId}_${userId}`);
    const followSnap = await getDoc(followRef);

    if (followSnap.exists()) {
      await deleteDoc(followRef);
      return false; // Unfollowed
    } else {
      await setDoc(followRef, {
        artworkId,
        artworkTitle,
        artworkImage,
        userId,
        createdAt: serverTimestamp(),
      });
      return true; // Followed
    }
  },

  /**
   * Checks if user is following an artwork
   */
  async isFollowingArtwork(artworkId: string): Promise<boolean> {
    const userId = auth.currentUser?.uid;
    if (!userId) return false;

    const followRef = doc(db, 'artworkFollowers', `${artworkId}_${userId}`);
    const followSnap = await getDoc(followRef);
    return followSnap.exists();
  },

  /**
   * Subscribes to follow status
   */
  onFollowStatusChange(artworkId: string, callback: (isFollowing: boolean) => void) {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      callback(false);
      return () => {};
    }

    const followRef = doc(db, 'artworkFollowers', `${artworkId}_${userId}`);
    return onSnapshot(followRef, (snap) => {
      callback(snap.exists());
    });
  }
};
