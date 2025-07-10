// firebase.tsx
// Firebase konfigürasyonu ve modüler Web SDK kullanımı

import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase Console’dan aldığım ayarlar
export const firebaseConfig = {
  apiKey: 'AIzaSyBxqQGr9HYsDNdiv8BNjUwy8NDoD1ZQjEM',
  authDomain: 'loginscreenfirebase-55198.firebaseapp.com',
  projectId: 'loginscreenfirebase-55198',
  storageBucket: 'loginscreenfirebase-55198.appspot.com',
  messagingSenderId: '63361277261',
  appId: '1:63361277261:web:1478cb146aaa5147966b04',
};

// Uygulama örneğini hemen oluştur ve initialize et
const app = initializeApp(firebaseConfig);

// Authentication ve Firestore örneklerini oluştur
export const auth: Auth = getAuth(app);
export const db: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// Varsayılan export: initialize edilmiş Firebase app
export default app;

export const storage = getStorage(app);

// named export: initializeFirebase fonksiyonu (mevcut app örneğini döner)
export function initializeFirebase(): typeof app {
  return app;
}
