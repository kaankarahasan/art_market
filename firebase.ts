import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyA0gtd502S2VxGr6EU3r-pYxoRNyBoz_PM",
  authDomain: "app-market-test-35f90.firebaseapp.com",
  projectId: "app-market-test-35f90",
  storageBucket: "app-market-test-35f90.appspot.com", // ✅ düzeltildi
  messagingSenderId: "955753428630",
  appId: "1:955753428630:web:8e6d79add0c44b7cae34b7",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const storage = getStorage(app);

export default {};
