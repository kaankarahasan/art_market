/**
 * firebaseConfig.ts
 * Tüm Firebase servisleri güvenli şekilde başlatılır.
 */

import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getStorage } from '@react-native-firebase/storage';
import { getFunctions } from '@react-native-firebase/functions';

// React Native Firebase'de varsayılan app native tarafında otomatik başlatılır.
const app = getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

export { auth, db, storage, functions };

// ─── Remote Config ───────────────────────────────────────────────────────────
export const fetchRemoteConfig = async (): Promise<void> => {
  try {
    const {
      getRemoteConfig,
      setConfigSettings,
      setDefaults,
      fetchAndActivate,
    } = require('@react-native-firebase/remote-config');

    const config = getRemoteConfig();

    await setConfigSettings(config, { minimumFetchIntervalMillis: 0 });

    await setDefaults(config, {
      GEMINI_API_KEY: 'DEFAULT_IF_NONE',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_51TTJqzBgPkYoEHZGAlqj7C0rLy1tHISChUmnxrfOCPjncg8TWpsi8UisdwlNxfXtYB34gb8mmWhRGyyRknVRkcHo00SeR1v7Sm',
    });

    await fetchAndActivate(config);
  } catch (err: any) {
    console.error('❌ [FIREBASE] Remote Config Hatası:', err);
  }
};

export const getRemoteValue = (key: string): string => {
  try {
    const { getRemoteConfig, getValue } = require('@react-native-firebase/remote-config');
    const config = getRemoteConfig();
    const val = getValue(config, key);
    return val.asString();
  } catch (e) {
    console.warn(`❌ [FIREBASE] Okuma Hatası "${key}":`, e);
  }
  return 'DEFAULT_IF_NONE';
};

export default db;