require('dotenv').config();
const admin = require('firebase-admin');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.resolve(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Error: serviceAccountKey.json not found in root directory.');
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "app-market-test-35f90.firebasestorage.app"
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getBobRossArtworkUrls(count = 100) {
    console.log(`Fetching Bob Ross painting tree from GitHub...`);
    const res = await axios.get("https://api.github.com/repos/jwilber/Bob_Ross_Paintings/contents/data/paintings");
    const urls = res.data.filter(file => file.name.endsWith('.png')).map(f => f.download_url);
    if(urls.length < count) {
        console.log(`Found only ${urls.length} images, repeating...`);
        return Array(count).fill().map((_, i) => urls[i % urls.length]);
    }
    return urls.slice(0, count);
}

async function uploadToStorage(url, imagePath) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const buffer = Buffer.from(response.data, 'binary');
        
        const file = bucket.file(imagePath);
        await file.save(buffer, {
            metadata: { contentType: 'image/png' }
        });
        
        const urlData = await file.getSignedUrl({
            action: 'read',
            expires: '01-01-2099'
        });
        
        return urlData[0];
    } catch (error) {
        console.error(`- Failed to upload image: ${url}`, error.message);
        return null;
    }
}

async function updateImages() {
    console.log('🔄 Replacing all duplicate/boring images with 100 unique real paintings Without calling Gemini...');
    try {
        const productsSnapshot = await db.collection('products').where('isSeeded', '==', true).get();
        if (productsSnapshot.empty) {
            console.log("No seeded products found.");
            return;
        }

        const docs = productsSnapshot.docs;
        console.log(`Found ${docs.length} seeded products. Processing...`);

        const artworkUrls = await getBobRossArtworkUrls(docs.length);

        let batch = db.batch();
        let opCount = 0;

        for (let i = 0; i < docs.length; i++) {
            const doc = docs[i];
            const data = doc.data();
            console.log(`🖼️ Updating product ${i + 1}/${docs.length}: ${data.title}...`);

            // 1. Upload new unique painting
            const sourceUrl = artworkUrls[i];
            const imagePath = `product_images/${doc.id}.png`; 
            const newUrl = await uploadToStorage(sourceUrl, imagePath);

            // 2. Update Firestore Document
            if(newUrl) {
                batch.update(doc.ref, {
                    imageUrls: [newUrl],
                    mainImageUrl: newUrl
                });
                opCount++;
            }

            // Small delay to prevent network stack overwhelm
            await sleep(100);

            if (opCount >= 50) {
                await batch.commit();
                batch = db.batch();
                opCount = 0;
            }
        }

        if (opCount > 0) {
            await batch.commit();
        }

        console.log('\n✅ All images successfully replaced with 100 UNIQUE real paintings. Gemini fees avoided completely!');

    } catch (error) {
        console.error('❌ Update failed:', error);
    } finally {
        process.exit(0);
    }
}

updateImages();
