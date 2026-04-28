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
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { doc, getDoc, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, setDoc } from '@react-native-firebase/firestore';
import { db } from '../firebase';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useThemeContext } from '../contexts/ThemeContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useLanguage } from '../contexts/LanguageContext';

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
  // Ref olarak da sakla — async sendMessage içinde güncel değeri okumak için
  const otherUserRef = React.useRef<{ displayName: string; photoURL?: string }>({ displayName: '', photoURL: undefined });

  const chatId = [currentUserId, otherUserId].sort().join('_');
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // Tema Entegrasyonu
  const { colors, isDarkTheme } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDarkTheme), [colors, isDarkTheme]);
  const { t } = useLanguage();

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
            const name = data.displayName || data.fullName || data.username || data.name || 'Bilinmeyen';
            const photo = data.photoURL || data.profilePicture || data.profileImage || undefined;
            setOtherUser({ displayName: name, photoURL: photo });
            otherUserRef.current = { displayName: name, photoURL: photo };

            // Chat açılır açılmaz userInfos'u güncelle (isim görünsün)
            const currentSnap = await getDoc(doc(db, 'users', currentUserId));
            const currentData = currentSnap.data() as any;
            const currentName = currentData?.displayName || currentData?.fullName || currentData?.username || 'Bilinmeyen';
            const currentPhoto = currentData?.photoURL || currentData?.profilePicture || undefined;

            await setDoc(
              doc(db, 'chats', chatId),
              {
                participants: [currentUserId, otherUserId],
                [`userInfos.${otherUserId}`]: { displayName: name, photoURL: photo ?? null },
                [`userInfos.${currentUserId}`]: { displayName: currentName, photoURL: currentPhoto ?? null },
              },
              { merge: true }
            );
          }
        } else {
          setOtherUser({ displayName: 'Bilinmeyen' });
          otherUserRef.current = { displayName: 'Bilinmeyen' };
        }
      } catch (error) {
        console.error('Kullanıcı bilgisi alınamadı:', error);
        setOtherUser({ displayName: 'Bilinmeyen' });
        otherUserRef.current = { displayName: 'Bilinmeyen' };
      }
    };
    fetchOtherUser();

    let clearedAtTimestamp: any = null;
    
    getDoc(doc(db, 'chats', chatId)).then(snap => {
       clearedAtTimestamp = snap.data()?.clearedAt?.[currentUserId];
    });

    // Messages snapshot listener
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot) {
        let msgs: Message[] = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...(doc.data() as Omit<Message, 'id'>),
        }));

        if (clearedAtTimestamp) {
           msgs = msgs.filter((m: Message) => m.createdAt ? m.createdAt.toMillis() > clearedAtTimestamp.toMillis() : true);
        }

        setMessages(msgs);
      }
    });

    return () => unsubscribe();
  }, [chatId, otherUserId]);

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

  const sendMessage = async () => {
    const textToSend = text.trim();
    if (!textToSend) return;
    setText('');

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: textToSend,
        senderId: currentUserId,
        createdAt: serverTimestamp(),
      });

      // userInfos'u merge ile güncelle (isimler her zaman güncel kalsın)
      const other = otherUserRef.current;
      await setDoc(
        doc(db, 'chats', chatId),
        {
          lastMessage: textToSend,
          lastTimestamp: serverTimestamp(),
          participants: [currentUserId, otherUserId],
          [`userInfos.${otherUserId}`]: {
            displayName: other.displayName || 'Bilinmeyen',
            photoURL: other.photoURL ?? null,
          },
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Mesaj gönderilirken hata oluştu:', error);
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

  const renderContent = () => (
    <>
      {/* Üst Bar */}
      <View style={[styles.header, { paddingVertical: avatarSize / 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
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
            placeholder={t('messagePlaceholder')}
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
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.card,
    backgroundColor: colors.background,
  },
  backButton: {
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
