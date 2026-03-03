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
    Animated,
    ScrollView,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useThemeContext } from '../contexts/ThemeContext';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db, auth } from '../firebase';
import {
    collection,
    getDocs,
    query,
    limit,
    updateDoc,
    doc,
    addDoc,
    orderBy,
    onSnapshot,
    Timestamp,
    serverTimestamp,
    setDoc,
    deleteDoc
} from 'firebase/firestore';

// --- CONFIGURATION ---
const API_KEY = 'AIzaSyC8xcoYDghxwHDALeSI9pBvf7csqcmr_2o';

type Message = {
    id: string;
    text: string;
    sender: 'user' | 'gemini';
    createdAt: any;
};

type ChatSession = {
    id: string;
    title: string;
    createdAt: any;
};

export default function GeminiChatScreen() {
    const navigation = useNavigation<any>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [productsContext, setProductsContext] = useState('');

    const flatListRef = useRef<FlatList>(null);
    const sidebarAnim = useRef(new Animated.Value(-300)).current;
    const currentUser = auth.currentUser;

    const { colors, isDarkTheme } = useThemeContext();
    const styles = React.useMemo(() => createStyles(colors, isDarkTheme), [colors, isDarkTheme]);
    const { width: screenWidth } = Dimensions.get('window');

    // Sidebar Animation
    useEffect(() => {
        Animated.timing(sidebarAnim, {
            toValue: isSidebarOpen ? 0 : -300,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isSidebarOpen]);

    // 1. Fetch Chat Sessions
    useEffect(() => {
        if (!currentUser) return;
        const sessionsRef = collection(db, 'users', currentUser.uid, 'gemini_sessions');
        const q = query(sessionsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatSession));
            setSessions(fetched);
            // If no session selected, select the latest one
            if (!currentSessionId && fetched.length > 0) {
                // setCurrentSessionId(fetched[0].id);
            }
        });
        return () => unsubscribe();
    }, [currentUser]);

    // 2. Listen to Messages for current session
    useEffect(() => {
        if (!currentUser || !currentSessionId) {
            setMessages([]);
            return;
        }

        const msgsRef = collection(db, 'users', currentUser.uid, 'gemini_sessions', currentSessionId, 'messages');
        const q = query(msgsRef, orderBy('createdAt', 'asc'), limit(100));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Message));
            setMessages(fetched);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
        });
        return () => unsubscribe();
    }, [currentUser, currentSessionId]);

    // 3. Context Loading
    useEffect(() => {
        const fetchContext = async () => {
            try {
                const q = query(collection(db, 'products'), limit(10));
                const snap = await getDocs(q);
                let ctx = "\n### ÜRÜNLER:\n";
                snap.forEach(d => ctx += `${d.data().title}|${d.data().price} TL\n`);
                setProductsContext(ctx);
            } catch (e) { }
        };
        fetchContext();
    }, []);

    // 4. Gemini Init
    const genAI = useRef(new GoogleGenerativeAI(API_KEY)).current;
    const model = React.useMemo(() => genAI.getGenerativeModel({
        model: "gemini-2.5-flash"
    }, { apiVersion: 'v1' }), [genAI]);

    const startNewChat = () => {
        setCurrentSessionId(null);
        setMessages([]);
        setIsSidebarOpen(false);
    };

    const deleteSession = async (sessionId: string) => {
        if (!currentUser) return;

        Alert.alert(
            "Sohbeti Sil",
            "Bu sohbeti silmek istediğinizden emin misiniz?",
            [
                { text: "Vazgeç", style: "cancel" },
                {
                    text: "Sil",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const sessionRef = doc(db, 'users', currentUser.uid, 'gemini_sessions', sessionId);
                            await deleteDoc(sessionRef);
                            if (currentSessionId === sessionId) {
                                startNewChat();
                            }
                        } catch (e) {
                            console.warn("Delete error:", e);
                        }
                    }
                }
            ]
        );
    };

    const sendMessage = async () => {
        if (!text.trim() || !currentUser) return;
        const userText = text.trim();
        setText('');
        setLoading(true);
        Keyboard.dismiss();

        try {
            let sessionID = currentSessionId;
            const userRef = doc(db, 'users', currentUser.uid);

            // A. Create Session if not exists
            if (!sessionID) {
                const newSessionRef = await addDoc(collection(userRef, 'gemini_sessions'), {
                    title: userText.substring(0, 30) + '...',
                    createdAt: serverTimestamp()
                });
                sessionID = newSessionRef.id;
                setCurrentSessionId(sessionID);
            }

            const messagesRef = collection(userRef, 'gemini_sessions', sessionID, 'messages');

            // B. User Message
            await addDoc(messagesRef, {
                text: userText,
                sender: 'user',
                createdAt: Timestamp.now()
            });

            // C. Gemini Call
            const history = messages.slice(-6).map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            }));
            if (history.length > 0 && history[0].role === 'model') history.shift();

            const prompt = `Sen Sanatçı Pazarı asistanısın. ${productsContext}\n\nKullanıcı: ${userText}`;
            const chat = model.startChat({ history });
            const result = await chat.sendMessage(prompt);
            const geminiText = result.response.text();

            // D. Gemini Message
            await addDoc(messagesRef, {
                text: geminiText,
                sender: 'gemini',
                createdAt: Timestamp.now()
            });

        } catch (e) {
            console.warn(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Text style={styles.backIcon}>‹</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsSidebarOpen(true)}>
                        <Text style={styles.menuIcon}>☰</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.headerTitle}>Gemini</Text>
                <TouchableOpacity onPress={startNewChat}>
                    <Text style={styles.newChatBtn}>+</Text>
                </TouchableOpacity>
            </View>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <TouchableOpacity
                    activeOpacity={1}
                    style={styles.overlay}
                    onPress={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar Drawer */}
            <Animated.View style={[styles.sidebar, { transform: [{ translateX: sidebarAnim }] }]}>
                <View style={styles.sidebarHeader}>
                    <Text style={styles.sidebarTitle}>Konuşmalar</Text>
                    <TouchableOpacity onPress={startNewChat} style={styles.sidebarNewChat}>
                        <Text style={styles.sidebarNewChatText}>+ Yeni Sohbet</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.sidebarList}>
                    {sessions.map((session) => (
                        <View
                            key={session.id}
                            style={[styles.sessionItemContainer, currentSessionId === session.id && styles.activeSession]}
                        >
                            <TouchableOpacity
                                style={styles.sessionItem}
                                onPress={() => {
                                    setCurrentSessionId(session.id);
                                    setIsSidebarOpen(false);
                                }}
                            >
                                <Text style={styles.sessionItemText} numberOfLines={1}>{session.title}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => deleteSession(session.id)}
                                style={styles.deleteBtn}
                            >
                                <Text style={styles.deleteIcon}>×</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                    {sessions.length === 0 && (
                        <Text style={styles.emptySessions}>Henüz geçmiş sohbet yok.</Text>
                    )}
                </ScrollView>
            </Animated.View>

            {/* Chat Area */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {messages.length === 0 && !loading && (
                    <View style={styles.welcomeContainer}>
                        <Text style={styles.welcomeTitle}>Size nasıl yardımcı olabilirim?</Text>
                        <Text style={styles.welcomeSubtitle}>Sanatçı Pazarı koleksiyonlarını keşfedin veya bir soru sorun.</Text>
                    </View>
                )}

                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.chatList}
                    renderItem={({ item }) => {
                        const isUser = item.sender === 'user';
                        return (
                            <View style={[styles.msgWrap, isUser ? styles.userWrap : styles.geminiWrap]}>
                                <View style={[styles.bubble, isUser ? styles.userBubble : styles.geminiBubble]}>
                                    <Text style={[styles.msgText, isUser ? styles.userText : styles.geminiText]}>
                                        {item.text}
                                    </Text>
                                </View>
                            </View>
                        );
                    }}
                />

                {loading && (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="small" color="#4285F4" />
                        <Text style={styles.loadingText}>Gemini yanıtlıyor...</Text>
                    </View>
                )}

                <View style={styles.inputArea}>
                    <View style={styles.inputFieldWrap}>
                        <TextInput
                            value={text}
                            onChangeText={setText}
                            placeholder="Gemini'ye sorun..."
                            placeholderTextColor={colors.secondaryText}
                            style={[styles.input, { maxHeight: 120 }]}
                            multiline
                        />
                        <TouchableOpacity
                            onPress={sendMessage}
                            disabled={!text.trim() || loading}
                            style={[styles.sendBtn, !text.trim() && { opacity: 0.4 }]}
                        >
                            <Text style={styles.sendIcon}>↑</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const createStyles = (colors: any, isDarkTheme: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDarkTheme ? '#131314' : '#FFFFFF' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        height: 56,
        borderBottomWidth: 1,
        borderBottomColor: isDarkTheme ? '#303134' : '#F0F4F9',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: {
        marginRight: 15,
    },
    backIcon: { fontSize: 32, color: colors.text, fontWeight: '300', marginTop: -4 },
    menuIcon: { fontSize: 28, color: colors.text, fontWeight: '300' },
    headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
    newChatBtn: { fontSize: 28, color: colors.text, fontWeight: '300', marginRight: 5 },

    // Sidebar
    overlay: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 10,
    },
    sidebar: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0,
        width: 280,
        backgroundColor: isDarkTheme ? '#1E1F20' : '#F0F4F9',
        zIndex: 11,
        paddingTop: 50,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 5, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    sidebarHeader: { paddingHorizontal: 20, marginBottom: 20 },
    sidebarTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 15 },
    sidebarNewChat: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        backgroundColor: isDarkTheme ? '#2B2C2D' : '#D3E3FD',
        borderRadius: 20,
        alignItems: 'center',
    },
    sidebarNewChatText: { color: isDarkTheme ? '#FFFFFF' : '#041E49', fontWeight: '600' },
    sidebarList: { paddingHorizontal: 10 },
    sessionItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 10,
        marginVertical: 2,
    },
    sessionItem: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 15,
    },
    activeSession: { backgroundColor: isDarkTheme ? '#303134' : '#E0E5EA' },
    sessionItemText: { color: colors.text, fontSize: 14 },
    deleteBtn: {
        padding: 10,
        marginRight: 5,
    },
    deleteIcon: {
        color: colors.secondaryText,
        fontSize: 20,
        fontWeight: 'bold',
    },
    emptySessions: { color: colors.secondaryText, textAlign: 'center', marginTop: 30, fontSize: 12 },

    // Chat
    welcomeContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    welcomeTitle: { fontSize: 24, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 10 },
    welcomeSubtitle: { fontSize: 14, color: colors.secondaryText, textAlign: 'center' },
    chatList: { paddingHorizontal: 15, paddingBottom: 20 },
    msgWrap: { marginVertical: 8, flexDirection: 'row', width: '100%' },
    userWrap: { justifyContent: 'flex-end' },
    geminiWrap: { justifyContent: 'flex-start' },
    bubble: { padding: 12, borderRadius: 20, maxWidth: '85%' },
    userBubble: { backgroundColor: isDarkTheme ? '#2B3D4F' : '#F0F4F9' },
    geminiBubble: { backgroundColor: 'transparent' },
    msgText: { fontSize: 16, lineHeight: 24 },
    userText: { color: colors.text },
    geminiText: { color: colors.text },
    loadingBox: { flexDirection: 'row', alignItems: 'center', marginLeft: 20, marginBottom: 15 },
    loadingText: { marginLeft: 10, fontSize: 13, color: colors.secondaryText },

    inputArea: {
        paddingHorizontal: 15,
        paddingBottom: Platform.OS === 'ios' ? 10 : 20,
    },
    inputFieldWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: isDarkTheme ? '#2B2C2D' : '#F0F4F9',
        borderRadius: 28,
        paddingHorizontal: 15,
        minHeight: 56,
    },
    input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 10 },
    sendBtn: {
        backgroundColor: '#4285F4',
        width: 36, height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    sendIcon: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});
