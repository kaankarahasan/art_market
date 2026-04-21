const admin = require('firebase-admin');
const path = require('path');
const axios = require('axios');
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "app-market-test-35f90.firebasestorage.app"
});
const bucket = admin.storage().bucket();

async function check() {
    const [files] = await bucket.getFiles({ prefix: 'product_images/' });
    console.log("Found files:", files.length);
    if(files.length > 0) {
        const file = files[0];
        const [url] = await file.getSignedUrl({ action: 'read', expires: '01-01-2099' });
        console.log("Signed URL:", url);
    }
}
check().catch(console.error);
