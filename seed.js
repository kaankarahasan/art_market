require('dotenv').config();
const admin = require('firebase-admin');
const { faker } = require('@faker-js/faker');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// --- SAFETY CHECK ---
const serviceAccountPath = path.resolve(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Error: serviceAccountKey.json not found in root directory.');
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
// NOTE: Use gemini-2.5-flash as requested
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- CONFIG ---
const USER_COUNT = 5; // Reduced default for AI stability
const PRODUCTS_PER_USER_MIN = 3;
const PRODUCTS_PER_USER_MAX = 5;
const BATCH_SIZE = 500;
const AI_THROTTLE_MS = 3000; // 3 seconds between AI calls to respect free tier quotas

const CATEGORIES = [
    'yagli_boya', 'suluboya', 'akrilik', 'heykel', 'fotograf',
    'dijital', 'cizim', 'grafik', 'seramik', 'kolaj', 'diger'
];

/**
 * Utility to download image and convert to base64
 */
async function fetchImageAsBase64(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (error) {
        console.error(`- Failed to download image: ${url}`);
        return null;
    }
}

/**
 * AI Analysis Function
 */
async function analyzeSeedImage(base64Image) {
    if (!process.env.GEMINI_API_KEY) return [];

    try {
        const prompt = "Sen bir sanat eleştirmenisin. Bu sanat eserini incele ve aşağıdaki formatta, virgülle ayrılmış kısa etiketler üret: Ana renkler, sanat akımı, teknik, hissettirdiği duygu ve resimdeki ana objeler. Başka hiçbir açıklama ekleme.";

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/jpeg"
                }
            }
        ]);

        const response = await result.response;
        const text = response.text().trim().toLowerCase();

        return text.split(',').map(t => t.trim()).filter(t => t.length > 0);
    } catch (error) {
        console.error("  - AI Analysis failed:", error.message);
        return [];
    }
}

/**
 * Sleep utility for throttling
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function seed() {
    console.log('🚀 Starting Automated Seeding with AI Analysis...');

    if (!process.env.GEMINI_API_KEY) {
        console.warn('⚠️  Warning: GEMINI_API_KEY not found in .env. Seeding will continue WITHOUT AI analysis.');
    }

    if (!process.env.CONFIRM_SEED) {
        console.log('\n⚠️  WARNING: You are about to seed data into Firestore.');
        console.log('To proceed, run: CONFIRM_SEED=true npm run seed\n');
        process.exit(0);
    }

    try {
        let batch = db.batch();
        let opCount = 0;
        let totalUsers = 0;
        let totalProducts = 0;

        for (let i = 0; i < USER_COUNT; i++) {
            const userId = `user_${faker.string.uuid()}`;
            const firstName = faker.person.firstName();
            const lastName = faker.person.lastName();
            const username = faker.internet.username({ firstName, lastName });
            const photoURL = faker.image.avatar();

            const userData = {
                uid: userId,
                username: username,
                fullName: `${firstName} ${lastName}`,
                email: faker.internet.email({ firstName, lastName }),
                bio: faker.person.bio(),
                photoURL: photoURL,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                followers: [],
                following: [],
                isSeeded: true
            };

            const userRef = db.collection('users').doc(userId);
            batch.set(userRef, userData);
            opCount++;
            totalUsers++;

            console.log(`👤 Created user: ${username}`);

            const productCount = faker.number.int({ min: PRODUCTS_PER_USER_MIN, max: PRODUCTS_PER_USER_MAX });
            for (let j = 0; j < productCount; j++) {
                const productId = `prod_${faker.string.uuid()}`;
                const imageUrl = `https://picsum.photos/seed/${productId}/800/800`;

                let aiVisualTags = [];
                if (process.env.GEMINI_API_KEY) {
                    console.log(`  🖼️ Analyzing product ${j + 1}/${productCount} for ${username}...`);
                    const base64 = await fetchImageAsBase64(imageUrl);
                    if (base64) {
                        aiVisualTags = await analyzeSeedImage(base64);
                        if (aiVisualTags.length > 0) {
                            console.log(`    ✨ Tags: ${aiVisualTags.join(', ')}`);
                        }
                    }
                    // Throttle to respect API limits
                    await sleep(AI_THROTTLE_MS);
                }

                const productData = {
                    id: productId,
                    title: faker.commerce.productName(),
                    description: faker.commerce.productDescription(),
                    imageUrls: [imageUrl],
                    mainImageUrl: imageUrl,
                    ownerId: userId,
                    username: username,
                    userProfileImage: photoURL,
                    seller: userData.fullName,
                    price: parseFloat(faker.commerce.price({ min: 100, max: 10000 })),
                    category: faker.helpers.arrayElement(CATEGORIES),
                    dimensions: {
                        width: faker.number.int({ min: 10, max: 200 }),
                        height: faker.number.int({ min: 10, max: 200 }),
                        depth: faker.number.int({ min: 1, max: 10 })
                    },
                    year: faker.date.past({ years: 20 }).getFullYear(),
                    isSold: Math.random() < 0.1,
                    createdAt: admin.firestore.Timestamp.fromDate(faker.date.past()),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    viewCount: faker.number.int({ min: 0, max: 500 }),
                    isSeeded: true,
                    aiVisualTags: aiVisualTags
                };

                const productRef = db.collection('products').doc(productId);
                batch.set(productRef, productData);
                opCount++;
                totalProducts++;

                if (opCount >= BATCH_SIZE) {
                    await batch.commit();
                    batch = db.batch();
                    opCount = 0;
                }
            }
        }

        if (opCount > 0) {
            await batch.commit();
        }

        console.log('\n✅ Seeding Success!');
        console.log(`- Users: ${totalUsers}, Products: ${totalProducts}`);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        process.exit(0);
    }
}

async function clean() {
    console.log('🧹 Starting Cleanup of Seeded Data...');
    try {
        let totalDeleted = 0;
        const collections = ['users', 'products'];
        for (const colName of collections) {
            const snapshot = await db.collection(colName).where('isSeeded', '==', true).get();
            if (snapshot.empty) continue;
            let batch = db.batch();
            let opCount = 0;
            for (const doc of snapshot.docs) {
                batch.delete(doc.ref);
                opCount++;
                totalDeleted++;
                if (opCount >= BATCH_SIZE) {
                    await batch.commit();
                    batch = db.batch();
                    opCount = 0;
                }
            }
            if (opCount > 0) await batch.commit();
        }
        console.log(`\n✅ Cleanup Success! Total ${totalDeleted} documents removed.`);
    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    } finally {
        process.exit(0);
    }
}

if (process.argv.includes('--clean')) {
    clean();
} else {
    seed();
}
