import { initializeApp, FirebaseApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence, Auth, getAuth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Firebase yapılandırması - HANGİ PROJEYİ KULLANIYORSANIZ O CONFIG'İ AÇIN
const firebaseConfig = {
  // AKTIF PROJE: app-market-test
  apiKey: "AIzaSyA0gtd502S2VxGr6EU3r-pYxoRNyBoz_PM",
  authDomain: "app-market-test-35f90.firebaseapp.com",
  projectId: "app-market-test-35f90",
  storageBucket: "app-market-test-35f90.firebasestorage.app",
  messagingSenderId: "955753428630",
  appId: "1:955753428630:web:8e6d79add0c44b7cae34b7",
  measurementId: "G-LFH1Z7XF7F"
};

// DİĞER PROJE CONFIG'İ (Gerekirse yukarıdakiyle değiştirin)
// const firebaseConfig = {
//   apiKey: 'AIzaSyBxqQGr9HYsDNdiv8BNjUwy8NDoD1ZQjEM',
//   authDomain: 'loginscreenfirebase-55198.firebaseapp.com',
//   projectId: 'loginscreenfirebase-55198',
//   storageBucket: 'loginscreenfirebase-55198.appspot.com',
//   messagingSenderId: '63361277261',
//   appId: '1:63361277261:web:1478cb146aaa5147966b04',
// };

// Firebase uygulamasını başlat
const app: FirebaseApp = initializeApp(firebaseConfig);

// Authentication - Initialize with AsyncStorage for persistence
export const auth: Auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Firestore - React Native için BASİT yapılandırma
// persistentLocalCache ve persistentMultipleTabManager KULLANMAYIN!
// Bunlar React Native'de "client is offline" hatasına neden oluyor
export const db: Firestore = getFirestore(app);

// Firebase Storage
export const storage: FirebaseStorage = getStorage(app);

// Varsayılan export
export default app;

// Named export - gerekirse kullanılabilir
export function initializeFirebase(): FirebaseApp {
  return app;
}

// Config'i export et (ihtiyaç duyulursa)
export { firebaseConfig };