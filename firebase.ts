import { initializeApp, FirebaseApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { Firestore, initializeFirestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import {
  getRemoteConfig,
  setConfigSettings,
  setDefaults,
  fetchAndActivate,
  getValue
} from '@react-native-firebase/remote-config';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Firebase yapılandırması
const firebaseConfig = {
  apiKey: "AIzaSyAKw4iQlmmgcrwTT_qcWknoVENGd7LVTKQ",
  authDomain: "app-market-test-35f90.firebaseapp.com",
  projectId: "app-market-test-35f90",
  storageBucket: "app-market-test-35f90.firebasestorage.app",
  messagingSenderId: "955753428630",
  appId: "1:955753428630:web:8e6d79add0c44b7cae34b7",
  measurementId: "G-LFH1Z7XF7F"
};

// Firebase (Web SDK - Firestore & Auth için)
const app: FirebaseApp = initializeApp(firebaseConfig);

// Remote Config (Modular Native SDK)
export const fetchRemoteConfig = async () => {
  try {
    const config = getRemoteConfig();

    // Önbellek süresini geliştirme için 0 yapıyoruz
    await setConfigSettings(config, {
      minimumFetchIntervalMillis: 0,
    });

    // Varsayılanları ayarla
    await setDefaults(config, {
      GEMINI_API_KEY: 'DEFAULT_IF_NONE'
    });

    // Tek seferde çek ve aktif et
    await fetchAndActivate(config);
  } catch (err) {
    console.warn("Remote Config SDK Hatası:", err);
  }
};

export const getRemoteValue = (key: string) => {
  try {
    const config = getRemoteConfig();
    return getValue(config, key).asString();
  } catch (e) { }
  return 'DEFAULT_IF_NONE';
};

// Authentication...
export const auth: Auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

// Firestore...
export const db: Firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Firebase Storage
export const storage: FirebaseStorage = getStorage(app);

export default app;