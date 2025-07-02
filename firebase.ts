// firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyBxqQGr9HYsDNdiv8BNjUwy8NDoD1ZQjEM',
  authDomain: 'loginscreenfirebase-55198.firebaseapp.com',
  projectId: 'loginscreenfirebase-55198',
  storageBucket: 'loginscreenfirebase-55198.appspot.com',
  messagingSenderId: '63361277261',
  appId: '1:63361277261:web:1478cb146aaa5147966b04',
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Export initialized services
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
export const storage = getStorage(app);

export default {};