import { faker } from '@faker-js/faker';
import { serverTimestamp, Timestamp, documentId, doc, writeBatch, getDocs, collection, query, where } from '@react-native-firebase/firestore';
import { db } from '../firebase';
import { Product } from '../routes/types';

// Categories matching AddProductScreen.tsx
const CATEGORIES = [
    'yagli_boya',
    'suluboya',
    'akrilik',
    'heykel',
    'fotograf',
    'dijital',
    'cizim',
    'grafik',
    'seramik',
    'kolaj',
    'diger'
];

// Helper to generate deterministic or random images
const getRandomImage = (width: number, height: number, seed: string) => {
    return `https://picsum.photos/seed/${seed}/${width}/${height}`;
};

export const seedDatabase = async () => {
    const BATCH_SIZE = 500; // Firestore batch limit is 500
    let totalOperations = 0;

    console.log('Starting database seeding...');

    try {
        // 1. Create 50 Users
        const users = [];
        for (let i = 0; i < 50; i++) {
            const userId = `user_${faker.string.uuid()}`;
            const username = faker.internet.username();
            const firstName = faker.person.firstName();
            const lastName = faker.person.lastName();
            const fullName = `${firstName} ${lastName}`;

            users.push({
                uid: userId,
                username: username,
                fullName: fullName,
                email: faker.internet.email({ firstName, lastName }),
                bio: faker.person.bio(),
                photoURL: faker.image.avatar(),
                createdAt: serverTimestamp(),
                followers: [],
                following: [],
                isSeeded: true
            });
        }

        // Write users in batches
        let batch = writeBatch(db);
        let opCount = 0;

        for (const user of users) {
            const userRef = doc(db, 'users', user.uid);
            batch.set(userRef, user);
            opCount++;
            totalOperations++;

            // Check batch size
            if (opCount >= BATCH_SIZE) {
                await batch.commit();
                batch = writeBatch(db);
                opCount = 0;
            }

            // 2. Create Products for each user
            const productCount = faker.number.int({ min: 10, max: 15 });

            for (let j = 0; j < productCount; j++) {
                const productId = `prod_${faker.string.uuid()}`;
                const title = faker.commerce.productName();
                const finalTitle = Math.random() < 0.1
                    ? `${title} - ${faker.lorem.sentence()}`
                    : title;

                const width = faker.number.int({ min: 300, max: 800 });
                const height = faker.number.int({ min: 300, max: 800 });

                const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

                const productData: any = {
                    id: productId,
                    title: finalTitle,
                    description: faker.commerce.productDescription(),
                    imageUrls: [
                        getRandomImage(width, height, `img_${productId}_1`),
                        getRandomImage(width, height, `img_${productId}_2`)
                    ],
                    mainImageUrl: getRandomImage(width, height, `img_${productId}_1`),
                    ownerId: user.uid,
                    username: user.username,
                    userProfileImage: user.photoURL,
                    seller: user.fullName,
                    price: parseFloat(faker.commerce.price({ min: 100, max: 50000 })),
                    category: category,
                    dimensions: {
                        width: faker.number.int({ min: 10, max: 200 }),
                        height: faker.number.int({ min: 10, max: 200 }),
                        depth: faker.number.int({ min: 1, max: 10 })
                    },
                    year: faker.date.past({ years: 50 }).getFullYear(),
                    isSold: Math.random() < 0.1, // 10% sold
                    createdAt: Timestamp.fromDate(faker.date.past()),
                    updatedAt: serverTimestamp(),
                    viewCount: faker.number.int({ min: 0, max: 1000 }),
                    isSeeded: true
                };

                const productRef = doc(db, 'products', productId);
                batch.set(productRef, productData);
                opCount++;

                if (opCount >= BATCH_SIZE) {
                    await batch.commit();
                    batch = writeBatch(db);
                    opCount = 0;
                }
            }
        }

        // Commit remaining operations
        if (opCount > 0) {
            await batch.commit();
        }

        console.log('Seeding completed successfully!');
        return { success: true, message: `Seeding completed. Created ${users.length} users and associated products.` };

    } catch (error) {
        console.error('Error seeding database:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
};

export const deleteSeedData = async () => {
    const BATCH_SIZE = 500;
    try {
        console.log('Starting deletion of seeded data...');
        let deletedCount = 0;
        let batch = writeBatch(db);
        let opCount = 0;

        const productsRef = collection(db, 'products');

        const productsByFlag = await getDocs(query(productsRef, where('isSeeded', '==', true)));

        const productsByPrefix = await getDocs(query(productsRef,
            where(documentId(), '>=', 'prod_'),
            where(documentId(), '<=', 'prod_\uf8ff')));

        const allProductDocs = new Map();
        productsByFlag.docs.forEach((d: any) => allProductDocs.set(d.id, d));
        productsByPrefix.docs.forEach((d: any) => allProductDocs.set(d.id, d));

        for (const docSnapshot of allProductDocs.values()) {
            batch.delete(docSnapshot.ref);
            opCount++;
            deletedCount++;

            if (opCount >= BATCH_SIZE) {
                await batch.commit();
                batch = writeBatch(db);
                opCount = 0;
            }
        }

        const usersRef = collection(db, 'users');

        const usersByFlag = await getDocs(query(usersRef, where('isSeeded', '==', true)));

        const usersByPrefix = await getDocs(query(usersRef,
            where(documentId(), '>=', 'user_'),
            where(documentId(), '<=', 'user_\uf8ff')));

        const allUserDocs = new Map();
        usersByFlag.docs.forEach((d: any) => allUserDocs.set(d.id, d));
        usersByPrefix.docs.forEach((d: any) => allUserDocs.set(d.id, d));

        for (const docSnapshot of allUserDocs.values()) {
            batch.delete(docSnapshot.ref);
            opCount++;
            deletedCount++;

            if (opCount >= BATCH_SIZE) {
                await batch.commit();
                batch = writeBatch(db);
                opCount = 0;
            }
        }

        if (opCount > 0) {
            await batch.commit();
        }

        return { success: true, message: `Deleted ${deletedCount} seeded items (including legacy data).` };

    } catch (error) {
        console.error('Error deleting seeded data:', error);
        return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
};
