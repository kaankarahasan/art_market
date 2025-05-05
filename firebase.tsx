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
import { getStorage } from 'firebase/storage'; // Sadece getStorage fonksiyonunu import ediyoruz

// Firebase Console’dan aldığınız ayarlar
export const firebaseConfig = {
  apiKey: 'AIzaSyBxqQGr9HYsDNdiv8BNjUwy8NDoD1ZQjEM',
  authDomain: 'loginscreenfirebase-55198.firebaseapp.com',
  projectId: 'loginscreenfirebase-55198',
  storageBucket: 'loginscreenfirebase-55198.appspot.com',
  messagingSenderId: '63361277261',
  appId: '1:63361277261:web:1478cb146aaa5147966b04',
};

// Firebase uygulamasını başlatma
const app = initializeApp(firebaseConfig);

// Firebase servislerini alıyoruz
export const auth: Auth = getAuth(app);
export const db: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
export const storage = getStorage(app); // Storage servisini export ediyoruz, tipi gerekmiyor

export default app;

// named export: initializeFirebase fonksiyonu (mevcut app örneğini döner)
export function initializeFirebase(): typeof app {
  return app;
}
