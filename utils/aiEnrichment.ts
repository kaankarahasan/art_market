import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDocs, collection, doc, updateDoc } from '@react-native-firebase/firestore';
import { db, getRemoteValue } from '../firebaseConfig';

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

/**
 * Görseli Gemini'a gönderir ve analiz sonucunu döner
 * @param base64Image - Görselin base64 formatındaki hali (örn: resim seçiciden veya FileSystem'den alınmış)
 * @param mimeType - Görselin tipi (genellikle 'image/jpeg' veya 'image/png')
 */
export const analyzeArtworkImage = async (base64Image: string, mimeType: string = 'image/jpeg') => {
    try {
        console.log("🎨 [AI] Görsel analizi başlıyor...");

        const model = modelWrapper();

        const prompt = "Sen bir sanat eleştirmenisin. Bu sanat eserini incele ve aşağıdaki formatta, virgülle ayrılmış kısa etiketler üret: Ana renkler, sanat akımı, teknik (yağlıboya, dijital vb.), hissettirdiği duygu ve resimdeki ana objeler. Başka hiçbir açıklama ekleme.";

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: mimeType
            }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;

        const visualKeywords = response.text().trim().toLowerCase();
        console.log("✨ [AI] Görsel Analiz Sonucu:", visualKeywords);

        // Dönem metni virgüllerden ayırıp temiz bir diziye dönüştürüyoruz
        const tagsArray = visualKeywords.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        return tagsArray;

    } catch (error) {
        console.error("❌ [AI] Görsel analiz hatası:", error);
        throw error;
    }
};
