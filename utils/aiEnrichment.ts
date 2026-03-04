import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDocs, collection, doc, updateDoc } from '@react-native-firebase/firestore';
import { db, getRemoteValue } from '../firebase';

/**
 * AI ENRICHMENT UTILITY (NATIVE)
 * 
 * Bu betik veritabanındaki tüm ürünleri tarar ve henüz AI analizi (aiVibe) 
 * yapılmamış olanlar için Gemini AI kullanarak kısa bir duygu/stil özeti çıkarır.
 */
const getApiKey = () => {
    const remoteKey = getRemoteValue('GEMINI_API_KEY')?.trim();
    if (remoteKey && remoteKey !== 'DEFAULT_IF_NONE' && remoteKey.startsWith('AIza')) {
        return remoteKey;
    }
    return '';
};

const modelWrapper = () => {
    const apiKey = getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { apiVersion: 'v1beta' });
};

export const enrichExistingProducts = async () => {
    console.log("🚀 [AI] Ürün analizi başlatılıyor (Native)...");

    try {
        // Modular Native Firestore ile verileri çek
        const querySnapshot = await getDocs(collection(db, 'products'));
        let enrichedCount = 0;

        for (const productDoc of querySnapshot.docs) {
            const data = productDoc.data();

            // Eğer zaten analiz edilmişse atla
            if (data.aiVibe) continue;

            console.log(`🔍 [AI] Analiz ediliyor: ${data.title}`);

            const prompt = `Aşağıdaki ürünün açıklamasını oku ve bu ürünün uyandırdığı 2-3 ana duyguyu/stili (örneğin: "huzurlu, minimalist, pastel") sadece 3-4 kelimeyle, aralarına virgül koyarak yaz. Sadece etiketleri ver, başka cümle kurma.
            
            Başlık: ${data.title}
            Açıklama: ${data.description || ''}
            Etiketler: ${Array.isArray(data.tags) ? data.tags.join(', ') : ''}`;

            const result = await modelWrapper().generateContent(prompt);
            const response = await result.response;
            const aiVibe = response.text().trim().toLowerCase();

            // Modular Native Firestore ile güncelle
            await updateDoc(doc(db, 'products', productDoc.id), {
                aiVibe: aiVibe
            });

            enrichedCount++;
            console.log(`✨ [AI] Başarılı: ${data.title} -> ${aiVibe}`);

            // Kota aşımını önlemek için bekleme
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log(`✅ [AI] Tamamlandı! Toplam ${enrichedCount} ürün zenginleştirildi.`);
        return enrichedCount;
    } catch (error: any) {
        if (error.toString().includes('429') || error.toString().includes('quota')) {
            console.warn("⚠️ [AI] Gemini API Kotası aşıldı! İşlem durduruluyor.");
        } else {
            console.error("❌ [AI] Zenginleştirme sırasında hata oluştu:", error);
        }
        throw error;
    }
};
