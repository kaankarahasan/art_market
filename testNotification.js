const https = require('https');
https.globalAgent.options.family = 4;
const admin = require('firebase-admin');
const forge = require('node-forge');

const PROJECT_ID = 'app-market-test-35f90';
const FCM_ENDPOINT = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

const SERVICE_ACCOUNT_EMAIL = 'firebase-adminsdk-fbsvc@app-market-test-35f90.iam.gserviceaccount.com';

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
function base64UrlEncode(str) {
  const encoded = forge.util.encodeUtf8(str);
  const b64 = forge.util.encode64(encoded);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeBytes(bytes) {
  const b64 = forge.util.encode64(bytes);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ─── RS256 JWT oluşturma ──────────────────────────────────────────────────────
function createJWT() {
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
  const privateKey = forge.pki.privateKeyFromPem(PRIVATE_KEY_PEM);
  const md = forge.md.sha256.create();
  md.update(signingInput, 'utf8');
  const signature = privateKey.sign(md);

  const signatureB64Url = base64UrlEncodeBytes(signature);
  return `${signingInput}.${signatureB64Url}`;
}

const axios = require('axios');

async function getAccessToken() {
  const jwt = createJWT();
  try {
    const response = await axios.post(TOKEN_ENDPOINT, `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data.access_token;
  } catch (error) {
    const errText = error.response ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`OAuth2 token alınamadı: ${errText}`);
  }
}

// ─── Test Akışı ───────────────────────────────────────────────────────────────
async function runTest() {
  console.log("1. Firebase Admin başlatılıyor...");
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: PROJECT_ID,
        clientEmail: SERVICE_ACCOUNT_EMAIL,
        privateKey: PRIVATE_KEY_PEM,
      }),
    });
  }

  const db = admin.firestore();
  
  console.log("2. Veritabanından fcmToken'ı olan bir kullanıcı aranıyor...");
  const usersSnapshot = await db.collection('users').get();
  const docsWithToken = usersSnapshot.docs.filter(d => d.data().fcmToken);
  
  if (docsWithToken.length === 0) {
    console.warn("UYARI: fcmToken'a sahip hiçbir kullanıcı bulunamadı!");
    console.log("Buna rağmen OAuth2 Access Token alma işlemi test edilecek...");
    
    console.log("3. OAuth2 Access Token alınıyor (uygulama mantığı ile aynı)...");
    const accessToken = await getAccessToken();
    if (accessToken) {
        console.log("✅ Access Token başarıyla alındı. (Kimlik doğrulama ayarları DOĞRU)");
        console.log("⚠️ Gerçek bir bildirim gönderebilmek için uygulamanın bir cihazda açılıp izin verilmesi gerekiyor.");
    }
    process.exit(0);
  }

  const userDoc = docsWithToken[0];
  const userData = userDoc.data();
  const fcmToken = userData.fcmToken;

  if (!fcmToken) {
     console.error("HATA: Kullanıcıda fcmToken eksik!");
     process.exit(1);
  }

  console.log(`Bulunan Kullanıcı: ${userData.displayName || userDoc.id}`);
  console.log(`FCM Token (TAMAMI): ${fcmToken}`);

  console.log("3. OAuth2 Access Token alınıyor (uygulama mantığı ile aynı)...");
  const accessToken = await getAccessToken();
  console.log("Access Token alındı.");

  console.log("4. FCM API'sine test bildirimi gönderiliyor...");
  
  const fcmPayloadAdmin = {
    token: fcmToken,
    notification: {
      title: 'Test Bildirimi 🚀',
      body: 'Bu, bildirim sisteminin çalıştığını doğrulayan bir test mesajıdır.',
    },
    data: {
      type: 'test_message',
      timestamp: Date.now().toString(),
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'chat_messages',
        sound: 'default',
        defaultVibrateTimings: true,
        defaultLightSettings: true,
      },
    },
  };

  try {
    const response = await admin.messaging().send(fcmPayloadAdmin);
    console.log('BAŞARILI: Bildirim admin SDK üzerinden gönderildi! Yanıt:', response);
  } catch (error) {
    console.error('HATA: FCM API bildirim gönderemedi:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

runTest().catch(err => {
  console.error("Test sırasında bir hata oluştu:", err);
  process.exit(1);
});
