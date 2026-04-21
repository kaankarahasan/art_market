const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.resolve(__dirname, 'serviceAccountKey.json'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "app-market-test-35f90.firebasestorage.app"
});
const bucket = admin.storage().bucket();
async function check() {
    const [files] = await bucket.getFiles({ prefix: 'product_images/' });
    if(files.length > 0) {
        const file = files[0];
        const [metadata] = await file.getMetadata();
        console.log("File size:", metadata.size, "bytes");
        console.log("Content type:", metadata.contentType);
    }
}
check().catch(console.error);
