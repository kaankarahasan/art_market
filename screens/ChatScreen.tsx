import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, getDoc, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, setDoc } from '@react-native-firebase/firestore';
import { db } from '../firebase';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useThemeContext } from '../contexts/ThemeContext';

type Message = {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
};

type RootStackParamList = {
  Chat: { currentUserId: string; otherUserId: string };
  OtherProfile: { userId: string };
};

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

export default function ChatScreen() {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<any>();
  const { currentUserId, otherUserId } = route.params;
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [otherUser, setOtherUser] = useState<{ displayName: string; photoURL?: string }>({
    displayName: '',
    photoURL: undefined,
  });

  const chatId = [currentUserId, otherUserId].sort().join('_');
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Tema Entegrasyonu
  const { colors, isDarkTheme } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDarkTheme), [colors, isDarkTheme]);

  // Tab bar gizleme
  useFocusEffect(
    React.useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => navigation.getParent()?.setOptions({ tabBarStyle: undefined });
    }, [navigation])
  );

  useEffect(() => {
    const fetchOtherUser = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', otherUserId));
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data) {
            const name = data.displayName || data.fullName || data.username || 'Bilinmeyen';
            setOtherUser({ displayName: name, photoURL: data.photoURL });
          }
        } else {
          setOtherUser({ displayName: 'Bilinmeyen' });
        }
      } catch (error) {
        console.error('Kullanıcı bilgisi alınamadı:', error);
        setOtherUser({ displayName: 'Bilinmeyen' });
      }
    };
    fetchOtherUser();

    // Messages snapshot listener
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot) {
        const msgs = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...(doc.data() as Omit<Message, 'id'>),
        }));
        setMessages(msgs);
      }
    });

    return () => unsubscribe();
  }, [chatId, otherUserId]);

  const sendMessage = async () => {
    const textToSend = text.trim();
    if (!textToSend) return;

    // Hemen UI'yi temizle
    setText('');

    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        text: textToSend,
        senderId: currentUserId,
        createdAt: serverTimestamp(),
      });

      const chatDocRef = doc(db, 'chats', chatId);
      await setDoc(
        chatDocRef,
        {
          lastMessage: textToSend,
          lastTimestamp: serverTimestamp(),
          participants: [currentUserId, otherUserId],
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Mesaj gönderilirken hata oluştu:', error);
      // Gerekirse hata durumunda mesajı geri yükle
      // setText(textToSend);
    }
  };

  // Dinamik boyutlar (makul sınırlar ile)
  const avatarSize = Math.min(Math.max(screenHeight * 0.06, 40), 60);
  const usernameFont = Math.min(Math.max(screenHeight * 0.022, 14), 18);
  const messageFont = Math.min(Math.max(screenHeight * 0.018, 12), 16);
  const inputFont = Math.min(Math.max(screenHeight * 0.018, 12), 16);
  const buttonFont = Math.min(Math.max(screenHeight * 0.018, 12), 16);
  const inputPaddingVertical = Math.min(Math.max(screenHeight * 0.012, 8), 12);
  const sendButtonPaddingVertical = Math.min(Math.max(screenHeight * 0.012, 8), 12);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0 }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Üst Bar */}
        <View style={[styles.header, { paddingVertical: avatarSize / 4 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={[styles.backText, { fontSize: avatarSize * 0.7 }]}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() => navigation.navigate('OtherProfile', { userId: otherUserId })}
          >
            <Image
              source={
                otherUser.photoURL
                  ? { uri: otherUser.photoURL }
                  : require('../assets/default-avatar.png')
              }
              style={[
                styles.avatar,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarSize / 2,
                },
              ]}
            />
            <Text style={[styles.username, { fontSize: usernameFont }]}>{otherUser.displayName}</Text>
          </TouchableOpacity>
        </View>


        {/* Mesajlar */}
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <FlatList
            inverted
            data={[...messages].reverse()}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const bubbleWidth = Math.min(screenWidth * 0.75, Math.max(100, item.text.length * 7));
              return (
                <View
                  style={[
                    styles.messageBubble,
                    item.senderId === currentUserId ? styles.myMessage : styles.otherMessage,
                    { maxWidth: bubbleWidth },
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      item.senderId !== currentUserId && { color: colors.text },
                      { fontSize: messageFont },
                    ]}
                  >
                    {item.text}
                  </Text>
                </View>
              );
            }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingBottom: 10 }}
          />
        </View>

        {/* Mesaj Input */}
        <View style={[styles.inputContainer, { paddingVertical: inputPaddingVertical }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Mesaj..."
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
          >
            <Text style={[styles.sendButtonText, { fontSize: buttonFont }]}>Gönder</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: any, isDarkTheme: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.card,
    backgroundColor: colors.background,
  },
  backButton: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backText: { color: colors.text },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { marginRight: 12 },
  username: { fontWeight: '600', color: colors.text },
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
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.card,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: isDarkTheme ? '#404040' : '#CCCCCC',
    borderRadius: 22,
    marginRight: 10,
    backgroundColor: isDarkTheme ? '#1F1F1F' : '#FAFAFA',
    color: colors.text,
  },
  sendButton: {
    backgroundColor: isDarkTheme ? '#FFFFFF' : '#333333',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: { color: isDarkTheme ? '#000000' : '#FFFFFF', fontWeight: '600' },
});
