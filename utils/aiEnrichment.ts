import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * AI ENRICHMENT UTILITY
 * 
 * Bu betik veritabanındaki tüm ürünleri tarar ve henüz AI analizi (aiVibe) 
 * yapılmamış olanlar için Gemini AI kullanarak kısa bir duygu/stil özeti çıkarır.
 * Bu sayede her sohbette tüm açıklamayı yollamak yerine sadece bu kısa özeti
 * yollayarak token tasarrufu sağlarız.
 */

const API_KEY = 'AIzaSyC8xcoYDghxwHDALeSI9pBvf7csqcmr_2o';
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { apiVersion: 'v1' });

export const enrichExistingProducts = async () => {
    console.log("Ürün analizi başlatılıyor...");

    try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        let enrichedCount = 0;

        for (const productDoc of querySnapshot.docs) {
            const data = productDoc.data();

            // Eğer zaten analiz edilmişse atla
            if (data.aiVibe) continue;

            console.log(`Analiz ediliyor: ${data.title}`);

            const prompt = `Aşağıdaki ürünün açıklamasını oku ve bu ürünün uyandırdığı 2-3 ana duyguyu/stili (örneğin: "huzurlu, minimalist, pastel") sadece 3-4 kelimeyle, aralarına virgül koyarak yaz. Sadece etiketleri ver, başka cümle kurma.
            
            Başlık: ${data.title}
            Açıklama: ${data.description || ''}
            Etiketler: ${Array.isArray(data.tags) ? data.tags.join(', ') : ''}`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const aiVibe = response.text().trim().toLowerCase();

            // Firestore'a kaydet
            await updateDoc(doc(db, 'products', productDoc.id), {
                aiVibe: aiVibe
            });

            enrichedCount++;
            console.log(`Başarılı: ${data.title} -> ${aiVibe}`);

            // Kota aşımını önlemek için bekleme süresini artırdık (Free Tier için 2 saniye)
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log(`Tamamlandı! Toplam ${enrichedCount} ürün zenginleştirildi.`);
        return enrichedCount;
    } catch (error: any) {
        if (error.toString().includes('429') || error.toString().includes('quota')) {
            console.warn("Gemini API Kotası aşıldı! İşlem durduruluyor.");
        } else {
            console.error("Zenginleştirme sırasında hata oluştu:", error);
        }
        throw error;
    }
};
