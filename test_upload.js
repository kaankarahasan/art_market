require('dotenv').config();
const admin = require('firebase-admin');
const axios = require('axios');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "app-market-test-35f90.firebasestorage.app"
});
const bucket = admin.storage().bucket();

async function test() {
    console.log("Testing upload...");
    const url = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1024px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg";
    const res = await axios.get(url, { responseType: 'arraybuffer', headers: {'User-Agent': 'Mozilla/5.0'} });
    const buffer = Buffer.from(res.data, 'binary');
    
    const file = bucket.file(`product_images/test_seed_image.jpg`);
    await file.save(buffer, { metadata: { contentType: 'image/jpeg' } });
    
    // Generate signed url
    const urlData = await file.getSignedUrl({ action: 'read', expires: '01-01-2099' });
    console.log("Uploaded URL:", urlData[0]);
    process.exit(0);
}
test().catch(console.error);
