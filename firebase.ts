import { initializeApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyBxqQGr9HYsDNdiv8BNjUwy8NDoD1ZQjEM',
  authDomain: 'loginscreenfirebase-55198.firebaseapp.com',
  projectId: 'loginscreenfirebase-55198',
  storageBucket: 'loginscreenfirebase-55198.appspot.com',
  messagingSenderId: '63361277261',
  appId: '1:63361277261:web:1478cb146aaa5147966b04',
};

const app = initializeApp(firebaseConfig);

// React Native ortamında persistence default AsyncStorage kullanır, opsiyonel.
// Eğer hata alırsan persistence parametresini kaldırabilirsin.
export const auth = initializeAuth(app, {
  persistence: undefined, // veya bu satırı komple kaldır
});

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const storage = getStorage(app);

export default {};
