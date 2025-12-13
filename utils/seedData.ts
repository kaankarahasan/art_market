
import { faker } from '@faker-js/faker';
import { db, auth } from '../firebase';
import { collection, doc, setDoc, addDoc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Product } from '../routes/types';

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
            followers: [], // Initialize as empty array as per some logic seen, handling subcollection separately if needed
            following: []
        });
    }

    // Write users in batches
    // Note: We can only do 500 ops per batch. 
    // We have 50 users. Each user will have 10-15 products.
    // Total products approx 50 * 12 = 600.
    // Total ops = 50 + 600 = 650. Need multiple batches.
    
    let batch = writeBatch(db);
    let opCount = 0;

    for (const user of users) {
        const userRef = doc(db, 'users', user.uid);
        batch.set(userRef, user);
        opCount++;
        totalOperations++; // Global count logic if needed for creating new batches
        
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
            // Edge case: Long title
            const finalTitle = Math.random() < 0.1 
                ? `${title} - ${faker.lorem.sentence()}` 
                : title;
                
            const width = faker.number.int({ min: 300, max: 800 });
            const height = faker.number.int({ min: 300, max: 800 });
            
            const productData: Product = {
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
                category: faker.commerce.department(),
                dimensions: {
                    width: faker.number.int({ min: 10, max: 200 }),
                    height: faker.number.int({ min: 10, max: 200 }),
                    depth: faker.number.int({ min: 1, max: 10 })
                },
                year: faker.date.past({ years: 50 }).getFullYear(),
                isSold: Math.random() < 0.1, // 10% sold
                createdAt: Timestamp.fromDate(faker.date.past()),
                updatedAt: serverTimestamp(),
                viewCount: faker.number.int({ min: 0, max: 1000 })
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
