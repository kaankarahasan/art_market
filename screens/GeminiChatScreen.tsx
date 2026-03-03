import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    FlatList,
    Text,
    Image,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useThemeContext } from '../contexts/ThemeContext';
import { GoogleGenerativeAI } from '@google/generative-ai'; // Import SDK
import { firebaseConfig, db } from '../firebase'; // Import firebase config
import { collection, getDocs, query, limit, updateDoc, doc } from 'firebase/firestore';

// --- CONFIGURATION ---
// IMPORTANT: Replace with your actual Gemini API Key.
// Using the key from firebase.ts labeled as active project.
const API_KEY = 'AIzaSyC8xcoYDghxwHDALeSI9pBvf7csqcmr_2o';

type Message = {
    id: string;
    text: string;
    sender: 'user' | 'gemini';
    createdAt: Date;
};

export default function GeminiChatScreen() {
    const navigation = useNavigation<any>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [productsContext, setProductsContext] = useState('');
    const [isFetchingProducts, setIsFetchingProducts] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const q = query(collection(db, 'products'), limit(15));
                const querySnapshot = await getDocs(q);

                let contextText = '\n\n### MEVCUT ÜRÜNLER (ID|Başlık|Fiyat|AI-Analiz|Etiketler):\n';
                querySnapshot.forEach((pDoc) => {
                    const data = pDoc.data();
                    const title = data.title || '';
                    const price = data.price ? `${data.price} TL` : '';

                    // ÖNCELİK: Eğer varsa AI tarafından daha önce üretilmiş kısa özeti (aiVibe) kullanıyoruz.
                    // Yoksa açıklamayı kırpıp kullanıyoruz.
                    const vibe = data.aiVibe || (data.description ? data.description.substring(0, 50) : '');
                    const tags = Array.isArray(data.tags) ? data.tags.join(',') : '';

                    contextText += `${pDoc.id}|${title}|${price}|${vibe}|${tags}\n`;
                });

                if (querySnapshot.size > 0) {
                    setProductsContext(contextText);

                    // ARKA PLAN ZENGİNLEŞTİRME: Sırayla ve bekleme süresi ekleyerek yapıyoruz
                    const productsToEnrich = querySnapshot.docs.filter(d => !d.data().aiVibe && d.data().description);

                    if (productsToEnrich.length > 0) {
                        (async () => {
                            console.log(`${productsToEnrich.length} ürün için AI zenginleştirme başlatılıyor...`);
                            for (const pDoc of productsToEnrich) {
                                try {
                                    const data = pDoc.data();
                                    const prompt = `Şu tabloyu 3-4 kelimeyle betimleyen kısa duygu/tarz etiketleri ver (Örn: "sakin, pastel, modern"): ${data.title} - ${data.description.substring(0, 50)}`;
                                    const result = await model.generateContent(prompt);
                                    const response = await result.response;
                                    const generatedVibe = response.text().trim().toLowerCase();

                                    await updateDoc(doc(db, 'products', pDoc.id), {
                                        aiVibe: generatedVibe
                                    });
                                    console.log(`Zenginleştirme başarılı: ${data.title}`);

                                    // Kota aşımını önlemek için 2 saniye bekle
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                } catch (e: any) {
                                    console.warn("Otomatik zenginleştirme sırasında hata:", e);
                                    if (e.toString().includes('429') || e.toString().includes('quota')) {
                                        console.warn("Kota aşıldı, otomatik zenginleştirme durduruluyor.");
                                        break; // Kotayı daha fazla zorlamamak için döngüden çık
                                    }
                                }
                            }
                        })();
                    }
                } else {
                    setProductsContext('\n\n### MEVCUT ÜRÜNLER:\nVeritabanında henüz ürün bulunmuyor.');
                }
            } catch (error) {
                console.error("Ürünler çekilirken hata oluştu:", error);
                setProductsContext('\n\n### MEVCUT ÜRÜNLER:\nŞu an veritabanındaki ürünlere erişilemiyor.');
            } finally {
                setIsFetchingProducts(false);
            }
        };

        fetchProducts();
    }, []);

    // Initialize Gemini AI
    // Use the provided API Key directly with explicit v1 API version
    const activeApiKey = API_KEY;
    const genAI = useRef(new GoogleGenerativeAI(activeApiKey)).current;

    // Define system instructions
    const systemInstruction = `Sen "Sanatçı Pazarı" uygulamasının resmi akıllı asistanısın. Görevin, kullanıcılara sanatçıları keşfetmelerinde ve eser satın almalarında yardımcı olmaktır.

### VERİ ERİŞİMİ VE SINIRLAR:
1. Sadece sana sağlanan [Sanatçılar, Eserler, Kategoriler] koleksiyonlarındaki verilere dayanarak cevap ver.
2. Eğer bir eserin fiyatı veya stok durumu hakkında bilgin yoksa, uydurma; "Bu bilgiyi şu an kontrol edemiyorum" de.
3. Uygulama dışı (siyaset, genel dünya haberleri vb.) sorulara "Ben sadece sanat ve pazar yeri konularında yardımcı olabilirim" şeklinde yanıt ver.

### DAVRANIŞ MODU:
- Bir sanatçıdan bahsederken mutlaka onun [Artist_ID] bilgisini kullanarak "Profilini incelemek için tıklayın" yönlendirmesi yap.
- Kullanıcı "mavi", "modern" veya "uygun fiyatlı" gibi terimler kullandığında, veritabanındaki [tags] ve [price] alanlarını önceliklendir.
- Sanatçılar için bir "curator" (küratör) gibi davran; eserleri teknik detayları (yağlı boya, dijital, tuval boyutu) ile açıkla.

### ÇIKTI FORMATI:
Yanıtlarını Markdown formatında ver. Önemli eser isimlerini **kalın**, fiyatları ise her zaman yanına para birimi ekleyerek yaz.`;

    // GÜNCELLEME: 'gemini-2.5-flash' modelini kullanıyoruz.
    // Mevcut API anahtarının yetkileri nedeniyle 'systemInstruction' parametresi desteklenmiyor,
    // bu nedenle sistem talimatlarını doğrudan bağlam (context) metnine ekleyeceğiz.
    const model = React.useMemo(() => genAI.getGenerativeModel({
        model: "gemini-2.5-flash"
    }, { apiVersion: 'v1' }), [genAI]);

    // Theme Integration
    const { colors, isDarkTheme } = useThemeContext();
    const styles = React.useMemo(() => createStyles(colors, isDarkTheme), [colors, isDarkTheme]);
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

    const sendMessage = async () => {
        if (!text.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: text,
            sender: 'user',
            createdAt: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setText('');
        setLoading(true);

        try {
            // Create chat history for context (optional, but good for chat experience)
            // For simplicity, we can send just the prompt or build history.
            // Let's use simple generateContent for now, or startChat if we want history.

            // Construct history from previous messages for better context
            // Filter out the current message we just added (the last one) because sendMessage handles it.
            // Also filter out any system/debug messages if needed.
            const historyMessages = messages.filter(msg => msg.id !== userMessage.id);

            const history = historyMessages.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }],
            }));

            // Gemini history must start with a user message.
            // If the first message is from model (e.g. welcome message or debug log), remove it.
            while (history.length > 0 && history[0].role === 'model') {
                history.shift();
            }

            // Inject the system instruction and products context into the first message
            // since 'gemini-1.5-flash' via v1beta doesn't support the systemInstruction parameter.
            const isFirstMessage = history.length === 0;
            const finalPrompt = isFirstMessage
                ? `${systemInstruction}\n\n${productsContext}\n\nKullanıcı sorusu: ${userMessage.text}`
                : userMessage.text;

            const chat = model.startChat({
                history: history,
            });

            const result = await chat.sendMessage(finalPrompt);
            const response = await result.response;
            const responseText = response.text();

            const geminiMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: responseText,
                sender: 'gemini',
                createdAt: new Date(),
            };

            setMessages((prev) => [...prev, geminiMessage]);
        } catch (error: any) {
            console.warn("Gemini Error:", error);

            let errorText = "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.";
            const errorString = error.toString();

            if (errorString.includes('API_KEY_INVALID') || errorString.includes('400')) {
                errorText = "API Anahtarı geçersiz veya eksik. Lütfen geçerli bir Gemini API anahtarı sağlayın.";
            } else if (errorString.includes('SERVICE_DISABLED') || errorString.includes('403')) {
                errorText = "Google Generative Language API bu proje için etkinleştirilmemiş. Lütfen Google Cloud Console'dan bu API'yi etkinleştirin.";
            } else if (errorString.includes('503')) {
                errorText = "Google Gemini servisi şu anda yoğunluk yaşıyor. Lütfen biraz bekleyip tekrar deneyin.";
            } else if (errorString.includes('Network request failed') || errorString.includes('fetch failed')) {
                errorText = "Ağ hatası oluştu. Lütfen internet bağlantınızı kontrol edin.";
            } else if (errorString.includes('429') || errorString.includes('quota') || errorString.includes('Too Many Requests')) {
                errorText = "Google Gemini API Ücretsiz Kullanım Kotası aşıldı! (429 Hatası). \n\nÇözüm: Google AI Studio üzerinden 'Pay-as-you-go' planına geçebilir veya yeni bir API Key oluşturabilirsiniz. Şimdilik lütfen 1-2 dakika bekleyip tekrar deneyin.";
            } else {
                // For other errors, show the raw error message to help debugging
                errorText = `Beklenmeyen bir hata oluştu: ${errorString}`;
            }

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: errorText,
                sender: 'gemini',
                createdAt: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    // Dynamic dimensions
    const avatarSize = Math.min(Math.max(screenHeight * 0.05, 36), 50);
    const inputFont = Math.min(Math.max(screenHeight * 0.018, 12), 16);

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={90}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Text style={[styles.backText, { fontSize: 24 }]}>‹</Text>
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Gemini AI</Text>
                        <Text style={styles.headerSubtitle}>Powered by Google</Text>
                    </View>
                </View>

                {/* Messages List */}
                <View style={{ flex: 1, backgroundColor: colors.background }}>
                    {messages.length === 0 && (
                        <View style={styles.emptyStateContainer}>
                            <Text style={styles.emptyStateText}>Gemini'ya bir soru sor...</Text>
                        </View>
                    )}
                    <FlatList
                        data={messages}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => {
                            const isUser = item.sender === 'user';
                            return (
                                <View
                                    style={[
                                        styles.messageBubble,
                                        isUser ? styles.myMessage : styles.otherMessage,
                                        { maxWidth: screenWidth * 0.8 },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.messageText,
                                            !isUser && { color: colors.text },
                                        ]}
                                    >
                                        {item.text}
                                    </Text>
                                </View>
                            );
                        }}
                        contentContainerStyle={{ paddingBottom: 20, paddingTop: 10 }}
                    />
                    {loading && (
                        <View style={{ padding: 10, alignItems: 'flex-start', marginLeft: 20 }}>
                            <ActivityIndicator size="small" color={colors.text} />
                        </View>
                    )}
                </View>

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    <TextInput
                        value={text}
                        onChangeText={setText}
                        placeholder="Mesaj yazın..."
                        placeholderTextColor={colors.secondaryText}
                        style={[styles.input, { fontSize: inputFont }]}
                        multiline
                    />
                    <TouchableOpacity
                        style={styles.sendButton}
                        onPress={sendMessage}
                        disabled={loading || !text.trim()}
                    >
                        <Text style={styles.sendButtonText}>Gönder</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const createStyles = (colors: any, isDarkTheme: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border || '#e0e0e0',
        backgroundColor: colors.background,
    },
    backButton: {
        paddingRight: 16,
    },
    backText: {
        color: colors.text,
        fontWeight: '300',
    },
    headerTitleContainer: {
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    headerSubtitle: {
        fontSize: 12,
        color: colors.secondaryText,
    },
    messageBubble: {
        padding: 12,
        marginVertical: 4,
        marginHorizontal: 12,
        borderRadius: 16,
    },
    myMessage: {
        backgroundColor: isDarkTheme ? '#4A90E2' : '#007AFF', // Blue for user
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    otherMessage: {
        backgroundColor: colors.card,
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: colors.border || '#e0e0e0',
    },
    messageText: {
        fontSize: 15,
        color: '#FFFFFF', // White for user message
        lineHeight: 22,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border || '#e0e0e0',
        backgroundColor: colors.background,
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: 10,
        maxHeight: 100,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border || '#e0e0e0',
    },
    sendButton: {
        backgroundColor: isDarkTheme ? '#4A90E2' : '#007AFF',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.7,
    },
    emptyStateText: {
        fontSize: 18,
        color: colors.secondaryText,
        fontStyle: 'italic',
    }
});
