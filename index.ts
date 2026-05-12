import './firebaseConfig';
import 'react-native-url-polyfill/auto';
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import messaging from '@react-native-firebase/messaging';

// ─── FCM Arka Plan Mesaj Handler (uygulama kapalı/arka planda) ───────────────
// Bu fonksiyon AppRegistry'den ÖNCE kayıt edilmelidir.
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  // Arka planda mesaj alındığında loglama (sistem bildirimi otomatik gösterilir)
  console.log('[FCM] Arka plan mesajı alındı:', remoteMessage.notification?.title);
});

AppRegistry.registerComponent('main', () => App);
AppRegistry.registerComponent('FireBase', () => App);
