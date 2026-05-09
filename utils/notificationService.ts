/**
 * notificationService.ts
 * FCM HTTP v1 API ile native push notification gönderme servisi.
 *
 * Akış:
 *  1. Kullanıcı giriş yaptığında FCM token'ı Firestore'a kaydedilir.
 *  2. Mesaj gönderildiğinde alıcının FCM token'ı okunur.
 *  3. Service Account JWT (RS256) ile OAuth2 access token alınır.
 *  4. FCM v1 API'ye POST isteği atılır → alıcının cihazına bildirim düşer.
 */

import { getMessaging, requestPermission, getToken, AuthorizationStatus } from '@react-native-firebase/messaging';
import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc } from '@react-native-firebase/firestore';
import forge from 'node-forge';

const PROJECT_ID = 'app-market-test-35f90';
const FCM_ENDPOINT = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

const SERVICE_ACCOUNT_EMAIL =
  'firebase-adminsdk-fbsvc@app-market-test-35f90.iam.gserviceaccount.com';

// PEM private key (service account)
const PRIVATE_KEY_PEM = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCa5g0O+0T8RucL
Rp4s/Jjq8c0UtVV8SdVP85bOATh+jVU6mhICqxfkK5RZ/CobUE2EkVaE9M7P7wgh
MNqJHOTZDIAlKmzyiv6exjOd5HP6RObxTwZlnOfOteRhKYmpMfFUIowf4Xs9vOFd
uIzLQv5uMqtJkzli7LShNdJco79Aka/3SnuOURpBTPCyo26vioIQgqTNC0a28Dkl
tOAeW74bCCB5cVXVYWzBd7NoaGY2CUoh6qzkUsjHfYXJL6nTPyeUy4lUCbYDBXFI
fcHhcnmMaG59Pf9lbLd43aSxIk7V4jSpjkR+PNoRND2PcAcSQd7259HA6bg2p18T
EUdndaZDAgMBAAECggEALBKezo9x3nHyFUQ/hz9L5zVri6PYsed0GS6OzwiL4X4n
LOhfjYDO6G355OyZsnHTzI9p1aSuH328i20SEQc2mgczgt+iZhRkRBrS3u78jM4E
A87fXBQb5LXeSEMAVzLNnonB4uROI4/Vc8wpyz/Bkus5z1JjdqEw99mPhCpXJXCd
FVCYwXkITzp1V9iJLN+/WQKQfPD+Wze6pO/wOzgy7fDMlZAtx6yn3aAwuV6t73H/
QluQ2MXLE+AMKfVPQCkQuugN7sRUL23i9yr+Lnt53zPnjcjAqnNaC6TXYzr/szPY
rMg14KPI1y0h3nn0hG44kzK+AApcrlvWMcz99dyE0QKBgQDIjqwn6o45pgUpd19B
aHC4YGE3tFuj/JR+E+wZwE5+/ljRM2Pys4ixelWRWnknhHF7i4rqHqmJCLubnCNt
XmsjRVBoHmgSYIrgfy02d70ajHNtKM2xRRYODl4aVcNpwWoBflAtZ5l9UcUgpnne
XSu5+R8/jj5TOqGGtSEAZWLKOQKBgQDFuCPIbeD5SYrna9cdifl7Ji9vtjB9V3gO
F4BMaakNVGZZDqj4bzO+6YCjDkk0iGFV2hYvhtDbxuWb5QGtBpF5n36+GqacEs5x
XEuR6fCQiZ5ItbrqLaCxscsMU3UmbRE/6g9cuQNAQtwXU+ky/CLpgzx+cftFrEr5
vxutXyXkWwKBgC5jAWKCF78xrQP4PinstBWRBStTJdb59oZqqTMTjZRF09kfH8Dk
0XrrJptl55vCQFUo40pfKSsuv+Wv6WnEatdPktdiIQQPHE/sWlK8wxo+3fujcl/L
8NvzasSAjaAKQjByPK0jxxZ7MTLqDknmFtT+z8FtbvDlILL9ddKXoI/RAoGBAICs
nQUElWRHO1HuudmsgKNnr3l5TUdVVHl/S+zu2qklI1KUGt1LqZZ2alQzqOq6UvZH
bybRCz3szGNPf262lphbd2WK/KEYEChwU3ILmJbIKS3Sr2lV9n2OYsGL0vMGCjLZ
RdQnR/lbSdcYseyPcL0dvpHf5hJq1YSBniaPhJ5/AoGAPKiLVwHEtuookFLLZ1Yr
Cs06ifk0itLPNkD+ZILpWuqn8c4tcQs02devvbR9bGMJ5AG8l1UN06ciAJOnFpDX
3MxqVL3V6h+ky4N3EMAMy718XNY1lmv3bzTEKlOSWckjYZcn58RPKzBNqVpdMA8/
R7qXN1px1379yu7O8lfJLGI=
-----END PRIVATE KEY-----`;

// ─── Base64URL yardımcıları ───────────────────────────────────────────────────
function base64UrlEncode(str: string): string {
  const encoded = forge.util.encodeUtf8(str);
  const b64 = forge.util.encode64(encoded);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeBytes(bytes: string): string {
  const b64 = forge.util.encode64(bytes);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ─── RS256 JWT oluşturma (node-forge ile) ────────────────────────────────────
function createJWT(): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: SERVICE_ACCOUNT_EMAIL,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: TOKEN_ENDPOINT,
      exp,
      iat: now,
    })
  );

  const signingInput = `${header}.${payload}`;

  // Private key'i parse et
  const privateKey = forge.pki.privateKeyFromPem(PRIVATE_KEY_PEM);

  // SHA-256 ile imzala
  const md = forge.md.sha256.create();
  md.update(signingInput, 'utf8');
  const signature = privateKey.sign(md);

  const signatureB64Url = base64UrlEncodeBytes(signature);
  return `${signingInput}.${signatureB64Url}`;
}

// ─── OAuth2 Access Token (cache'li) ──────────────────────────────────────────
let cachedAccessToken: string | null = null;
let cachedTokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  const now = Date.now() / 1000;
  if (cachedAccessToken && now < cachedTokenExpiry - 60) {
    return cachedAccessToken;
  }

  const jwt = createJWT();

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OAuth2 token alınamadı: ${errText}`);
  }

  const data = await response.json();
  cachedAccessToken = data.access_token;
  cachedTokenExpiry = now + data.expires_in;
  return data.access_token;
}

import { PermissionsAndroid, Platform, Alert } from 'react-native';

// ─── FCM Token'ı Firestore'a kaydet ──────────────────────────────────────────
export async function saveFCMToken(userId: string): Promise<void> {
  try {
    let enabled = false;

    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      enabled = granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      const authStatus = await requestPermission(getMessaging());
      enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;
    }

    if (!enabled) {
      console.log('[FCM] Bildirim izni verilmedi.');
      Alert.alert(
        'Bildirim İzni Gerekli',
        'Uygulamanın düzgün çalışması ve mesajları alabilmeniz için ayarlardan bildirim izni vermeniz gerekmektedir.'
      );
      return;
    }

    const token = await getToken(getMessaging());
    if (!token) {
      console.log('[FCM] Token alınamadı.');
      Alert.alert('Hata', 'Bildirim tokenı alınamadı. Lütfen cihazınızda Google Play Hizmetlerinin çalıştığından emin olun.');
      return;
    }

    await setDoc(doc(db, 'users', userId),
      { fcmToken: token, fcmTokenUpdatedAt: new Date().toISOString() },
      { merge: true }
    );
    console.log('[FCM] ✅ Token kaydedildi:', token.substring(0, 25) + '...');
  } catch (error: any) {
    console.error('[FCM] Token kaydetme hatası:', error);
    Alert.alert('Bildirim Hatası', 'Bildirim ayarlanırken bir hata oluştu: ' + error.message);
  }
}

// ─── Push Notification Gönder ────────────────────────────────────────────────
export async function sendPushNotification(params: {
  recipientUserId: string;
  senderName: string;
  messageText: string;
  chatId: string;
  senderUserId: string;
}): Promise<void> {
  const { recipientUserId, senderName, messageText, chatId, senderUserId } = params;

  try {
    // Alıcının FCM token'ını Firestore'dan al
    const userSnap = await getDoc(doc(db, 'users', recipientUserId));
    if (!userSnap.exists) {
      console.log('[FCM] Alıcı bulunamadı, bildirim atlandı.');
      return;
    }

    const userData = userSnap.data() as any;
    const fcmToken: string | undefined = userData?.fcmToken;

    if (!fcmToken) {
      console.log('[FCM] Alıcının FCM token\'ı yok, bildirim atlandı.');
      return;
    }

    // OAuth2 access token al
    const accessToken = await getAccessToken();

    // Bildirimin gövde metnini kısalt
    const bodyText =
      messageText.length > 100 ? messageText.substring(0, 97) + '...' : messageText;

    // FCM v1 API mesaj payload'u
    const fcmPayload = {
      message: {
        token: fcmToken,
        notification: {
          title: senderName,
          body: bodyText,
        },
        // Data payload → bildirime tıklanınca deep link için
        data: {
          type: 'chat_message',
          chatId,
          senderUserId,
          recipientUserId,
          senderName,
        },
        android: {
          priority: 'HIGH',
          notification: {
            channel_id: 'chat_messages',
            sound: 'default',
            default_vibrate_timings: true,
            default_light_settings: true,
          },
        },
      },
    };

    const response = await fetch(FCM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(fcmPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[FCM] Bildirim gönderilemedi:', errText);
    } else {
      console.log('[FCM] ✅ Bildirim başarıyla gönderildi.');
    }
  } catch (error) {
    // Bildirim hatası mesaj göndermeyi engellemez
    console.error('[FCM] Bildirim gönderme hatası (non-critical):', error);
  }
}
