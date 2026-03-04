import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getStorage } from '@react-native-firebase/storage';
import {
  getRemoteConfig,
  setConfigSettings,
  setDefaults,
  fetchAndActivate,
  getValue,
  getAll
} from '@react-native-firebase/remote-config';

// Modular Firebase Service Instances
export const auth = getAuth();
export const db = getFirestore();
export const storage = getStorage();

// Remote Config (Modular Native SDK)
export const fetchRemoteConfig = async () => {
  console.log("------------------------------------------");
  console.log("🚀 [FIREBASE] Remote Config Başlatılıyor (Modular Native)...");
  try {
    const config = getRemoteConfig();

    await setConfigSettings(config, {
      minimumFetchIntervalMillis: 0,
    });

    await setDefaults(config, {
      GEMINI_API_KEY: 'DEFAULT_IF_NONE'
    });

    console.log("📡 [FIREBASE] Sunucudan veri çekiliyor...");
    await fetchAndActivate(config);

    const allValues = getAll(config);
    const keys = Object.keys(allValues);
    console.log("✅ [FIREBASE] Mevcut Anahtarlar:", keys);

    const geminiVal = getValue(config, 'GEMINI_API_KEY');
    console.log(`🔑 [FIREBASE] GEMINI_API_KEY: ${geminiVal.asString().substring(0, 5)}...`);
    console.log(`📊 [FIREBASE] Kaynak: ${geminiVal.getSource()}`);

    if (geminiVal.getSource() === 'default') {
      console.warn("⚠️ [FIREBASE] DİKKAT: Anahtar sunucudan DEĞİL, varsayılan geliyor!");
    } else {
      console.log("✨ [FIREBASE] Anahtar başarıyla sunucudan alındı.");
    }
  } catch (err: any) {
    console.error("❌ [FIREBASE] Kritik Hata:", err);
  }
  console.log("------------------------------------------");
};

export const getRemoteValue = (key: string) => {
  try {
    const config = getRemoteConfig();
    const val = getValue(config, key);
    return val.asString();
  } catch (e) {
    console.warn(`❌ [FIREBASE] Okuma Hatası "${key}":`, e);
  }
  return 'DEFAULT_IF_NONE';
};

export default db;