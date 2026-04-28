import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    TextInput,
    TouchableOpacity,
    FlatList,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    ActivityIndicator,
    Keyboard,
    Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useThemeContext } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { onSnapshot, collection, query, orderBy, limit, doc, getDocs, setDoc, addDoc, getDoc, Timestamp, deleteDoc } from '@react-native-firebase/firestore';
import { db, auth, getRemoteValue } from '../firebase';
import { serverTimestamp } from '@react-native-firebase/firestore';

type Message = {
    id: string;
    text: string;
    sender: 'user' | 'gemini';
    createdAt: any;
};



export default function GeminiChatScreen() {
    const navigation = useNavigation<any>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentSessionId] = useState<string>("main_session");
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [productsContext, setProductsContext] = useState('');

    const flatListRef = useRef<FlatList>(null);
    const isMounted = useRef(true);
    const scrollTimeout = useRef<any>(null);
    const currentUser = auth.currentUser;
    const [resetModalVisible, setResetModalVisible] = useState(false);

    const { colors, isDarkTheme } = useThemeContext();
    const styles = React.useMemo(() => createStyles(colors, isDarkTheme), [colors, isDarkTheme]);
    const insets = useSafeAreaInsets();
    const { t } = useLanguage();
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

    // Tab bar gizleme (ChatScreen ile aynı)
    useFocusEffect(
        React.useCallback(() => {
            navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
            return () => navigation.getParent()?.setOptions({ tabBarStyle: undefined });
        }, [navigation])
    );

    // Dynamic dimensions from ChatScreen
    const avatarSize = Math.min(Math.max(screenHeight * 0.06, 40), 60);
    const usernameFont = Math.min(Math.max(screenHeight * 0.022, 14), 18);
    const messageFont = Math.min(Math.max(screenHeight * 0.018, 12), 16);
    const inputFont = Math.min(Math.max(screenHeight * 0.018, 12), 16);
    const buttonFont = Math.min(Math.max(screenHeight * 0.018, 12), 16);
    const inputPaddingVertical = Math.min(Math.max(screenHeight * 0.012, 8), 12);
    const sendButtonPaddingVertical = Math.min(Math.max(screenHeight * 0.012, 8), 12);



    // 2. Listen to Messages (Modular)
    useEffect(() => {
        if (!currentUser || !currentSessionId) {
            setMessages([]);
            return;
        }

        const q = query(
            collection(db, 'users', currentUser.uid, 'gemini_sessions', currentSessionId, 'messages'),
            orderBy('createdAt', 'asc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, snapshot => {
            if (!isMounted.current) return;
            const fetched = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as Message));
            setMessages(fetched);

            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
            scrollTimeout.current = setTimeout(() => {
                if (isMounted.current) flatListRef.current?.scrollToEnd({ animated: true });
            }, 200);
        });

        return () => unsubscribe();
    }, [currentUser, currentSessionId]);

    // 3. Context Loading (Modular)
    useEffect(() => {
        const fetchContext = async () => {
            try {
                const snap = await getDocs(query(collection(db, 'products'), limit(10)));
                if (!isMounted.current) return;
                let ctx = "\n### ÜRÜNLER:\n";
                snap.forEach((d: any) => ctx += `${d.data().title}|${d.data().price} TL\n`);
                setProductsContext(ctx);
            } catch (e) { }
        };
        fetchContext();
    }, []);

    const resetChat = async () => {
        if (!currentUser) return;
        setResetModalVisible(false);
        try {
            setLoading(true);
            const messagesRef = collection(db, 'users', currentUser.uid, 'gemini_sessions', currentSessionId, 'messages');
            const snapshot = await getDocs(messagesRef);
            
            const deletePromises = snapshot.docs.map((d: any) => deleteDoc(d.ref));
            await Promise.all(deletePromises);
            
            // Also delete the session doc itself to be clean
            await deleteDoc(doc(db, 'users', currentUser.uid, 'gemini_sessions', currentSessionId));
            
            setMessages([]);
        } catch (e) {
            console.warn("Reset error:", e);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!text.trim() || !currentUser) return;
        const userText = text.trim();
        setText('');
        setLoading(true);
        Keyboard.dismiss();

        try {
            let sessionID = currentSessionId;
            const sessionRef = doc(db, 'users', currentUser.uid, 'gemini_sessions', sessionID);

            // Ensure session exists
            const sessionSnap = await getDoc(sessionRef);
            if (!sessionSnap.exists()) {
                await setDoc(sessionRef, {
                    title: 'Ana Sohbet',
                    createdAt: serverTimestamp()
                });
            }

            const messagesRef = collection(db, 'users', currentUser.uid, 'gemini_sessions', sessionID!, 'messages');

            await addDoc(messagesRef, {
                text: userText,
                sender: 'user',
                createdAt: Timestamp.now()
            });

            // Remote Config API Key
            let apiKey = getRemoteValue('GEMINI_API_KEY')?.trim();

            if (!apiKey || apiKey === 'DEFAULT_IF_NONE' || !apiKey.startsWith('AIza')) {
                throw new Error("Geçerli bir API Anahtarı bulunamadı (Firebase Remote Config üzerinden kontrol edin).");
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { apiVersion: 'v1beta' });

            const history = messages
                .slice(-10)
                .map(m => ({
                    role: m.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: m.text }]
                }));

            while (history.length > 0 && history[0].role !== 'user') {
                history.shift();
            }

            const systemContext = `Sen Sanatçı Pazarı asistanısın. Profesyonel ve yardımsever ol. Mevcut ürünler: ${productsContext}`;

            let geminiText = "";
            if (history.length === 0) {
                const result = await model.generateContent(`${systemContext}\n\nKullanıcı: ${userText}`);
                geminiText = (await result.response).text();
            } else {
                const chat = model.startChat({ history });
                const result = await chat.sendMessage(`${systemContext}\n\nKullanıcı: ${userText}`);
                geminiText = (await result.response).text();
            }

            await addDoc(messagesRef, {
                text: geminiText || "Üzgünüm, şu an yanıt veremiyorum.",
                sender: 'gemini',
                createdAt: Timestamp.now()
            });

        } catch (e: any) {
            console.error("Gemini Error:", e);
        } finally {
            setLoading(false);
        }
    };

    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        if (Platform.OS === 'android') {
            const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
                setKeyboardHeight(e.endCoordinates.height);
            });
            const hideSub = Keyboard.addListener('keyboardDidHide', () => {
                setKeyboardHeight(0);
            });
            return () => {
                showSub.remove();
                hideSub.remove();
            };
        }
    }, []);

  const renderContent = () => (
    <>
        {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Sanat Asistanı</Text>
                    <TouchableOpacity onPress={() => setResetModalVisible(true)} style={styles.resetBtnAction}>
                        <MaterialIcons name="refresh" size={26} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Reset Confirm Modal */}
                <Modal
                    visible={resetModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setResetModalVisible(false)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setResetModalVisible(false)}
                    >
                        <View style={styles.modalBox}>
                            <MaterialIcons name="refresh" size={36} color={colors.text} style={{ marginBottom: 12 }} />
                            <Text style={styles.modalTitle}>{t('geminiReset')}</Text>
                            <Text style={styles.modalSubtitle}>{t('geminiResetMsg')}</Text>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setResetModalVisible(false)}>
                                    <Text style={styles.modalCancelText}>{t('geminiCancel')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalConfirmBtn} onPress={resetChat}>
                                    <Text style={styles.modalConfirmText}>{t('geminiConfirm')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Messages */}
                <View style={{ flex: 1, backgroundColor: colors.background }}>
                    <FlatList
                        ref={flatListRef}
                        inverted
                        data={[...messages].reverse()}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingBottom: 10 }}
                        renderItem={({ item }) => {
                            const isUser = item.sender === 'user';
                            const bubbleWidth = Math.min(screenWidth * 0.75, Math.max(100, item.text.length * 7));
                            
                            return (
                                <View
                                    style={[
                                        styles.messageBubble,
                                        isUser ? styles.myMessage : styles.otherMessage,
                                        { maxWidth: bubbleWidth },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.messageText,
                                            !isUser && { color: colors.text },
                                            { fontSize: messageFont },
                                        ]}
                                    >
                                        {item.text}
                                    </Text>
                                </View>
                            );
                        }}
                    />
                </View>

                {loading && (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="small" color="#4285F4" />
                        <Text style={styles.loadingText}>{t('geminiLoading')}</Text>
                    </View>
                )}

                {/* Input Area */}
                <View style={[styles.inputContainer, { paddingVertical: inputPaddingVertical }]}>
                    <TextInput
                        value={text}
                        onChangeText={setText}
                        placeholder="Asistana mesaj yazın..."
                        placeholderTextColor={colors.secondaryText}
                        style={[
                            styles.input,
                            {
                                fontSize: inputFont,
                                paddingHorizontal: 14,
                                paddingVertical: inputPaddingVertical,
                            },
                        ]}
                        multiline
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            { paddingHorizontal: 18, paddingVertical: sendButtonPaddingVertical },
                        ]}
                        onPress={sendMessage}
                        disabled={!text.trim() || loading}
                    >
                        <Text style={[styles.sendButtonText, { fontSize: buttonFont }]}>{t('geminiSend')}</Text>
                    </TouchableOpacity>
                </View>
            </>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Platform.OS === 'ios' ? insets.bottom : (keyboardHeight > 0 ? keyboardHeight + 12 : 0) }]}>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={12}>
          {renderContent()}
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1 }}>
          {renderContent()}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any, isDarkTheme: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: isDarkTheme ? '#333' : '#E0E0E0',
    },
    backButton: {
        paddingRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginLeft: 5,
        flex: 1,
    },
    username: { fontWeight: '600', color: colors.text },
    resetBtnAction: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBox: {
        width: '80%',
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 28,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        color: colors.secondaryText,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalCancelBtn: {
        flex: 1,
        height: 46,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isDarkTheme ? '#444' : '#E0E0E0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCancelText: {
        color: colors.text,
        fontWeight: '600',
        fontSize: 15,
    },
    modalConfirmBtn: {
        flex: 1,
        height: 46,
        borderRadius: 12,
        backgroundColor: isDarkTheme ? '#FF453A' : '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalConfirmText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 15,
    },
    
    messageBubble: {
        padding: 14,
        marginVertical: 6,
        marginHorizontal: 12,
        borderRadius: 12,
    },
    myMessage: {
        backgroundColor: isDarkTheme ? '#262626' : '#333333',
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
        borderBottomLeftRadius: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    otherMessage: {
        backgroundColor: colors.card,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: isDarkTheme ? '#404040' : '#E5E5E5',
        borderBottomRightRadius: 20,
        borderBottomLeftRadius: 4,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    messageText: { color: '#FFFFFF' },
    
    loadingBox: { flexDirection: 'row', alignItems: 'center', marginLeft: 20, marginVertical: 10 },
    loadingText: { marginLeft: 10, fontSize: 13, color: colors.secondaryText },
    
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        marginHorizontal: 12,
        marginBottom: Platform.OS === 'ios' ? 8 : 16,
        marginTop: 8,
        backgroundColor: colors.card,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: isDarkTheme ? '#404040' : '#E5E5E5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    input: {
        flex: 1,
        color: colors.text,
        backgroundColor: 'transparent',
        borderWidth: 0,
        marginRight: 10,
        paddingHorizontal: 14,
    },
    sendButton: {
        backgroundColor: isDarkTheme ? '#FFFFFF' : '#333333',
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonText: { color: isDarkTheme ? '#000000' : '#FFFFFF', fontWeight: '600' },
});
