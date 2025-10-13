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
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  getDoc,
} from 'firebase/firestore';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';

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

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [otherUser, setOtherUser] = useState<{ displayName: string; photoURL?: string }>({
    displayName: '',
    photoURL: undefined,
  });

  const chatId = [currentUserId, otherUserId].sort().join('_');
  const screenHeight = Dimensions.get('window').height;

  // Tab bar gizleme
  useFocusEffect(
    React.useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => {
        navigation.getParent()?.setOptions({ tabBarStyle: undefined });
      };
    }, [navigation])
  );

  useEffect(() => {
    // Diğer kullanıcı bilgilerini çek
    const fetchOtherUser = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', otherUserId));
        if (snap.exists()) {
          const data = snap.data() as any;
          const name = data.displayName || data.fullName || data.username || 'Bilinmeyen';
          setOtherUser({ displayName: name, photoURL: data.photoURL });
        } else {
          setOtherUser({ displayName: 'Bilinmeyen' });
        }
      } catch (error) {
        console.error('Kullanıcı bilgisi alınamadı:', error);
        setOtherUser({ displayName: 'Bilinmeyen' });
      }
    };
    fetchOtherUser();

    // Mesajları dinle
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Message, 'id'>),
      }));
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [chatId, otherUserId]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      text,
      senderId: currentUserId,
      createdAt: serverTimestamp(),
    });

    // Chat özetini güncelle
    const currentUserSnap = await getDoc(doc(db, 'users', currentUserId));
    const otherUserSnap = await getDoc(doc(db, 'users', otherUserId));
    const currentUserData = currentUserSnap.exists() ? currentUserSnap.data() : {};
    const otherUserData = otherUserSnap.exists() ? otherUserSnap.data() : {};

    const chatDocRef = doc(db, 'chats', chatId);
    await setDoc(
      chatDocRef,
      {
        lastMessage: text,
        lastTimestamp: serverTimestamp(),
        userInfos: {
          [currentUserId]: {
            displayName: currentUserData.displayName || '',
            username: currentUserData.username || '',
          },
          [otherUserId]: {
            displayName: otherUserData.displayName || '',
            username: otherUserData.username || '',
          },
        },
      },
      { merge: true }
    );

    setText('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Üst Bar */}
        <View style={[styles.header, { paddingVertical: screenHeight * 0.015 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
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
              style={styles.avatar}
            />
            <Text style={styles.username}>{otherUser.displayName}</Text>
          </TouchableOpacity>
        </View>

        {/* Mesajlar */}
        <FlatList
          inverted
          data={[...messages].reverse()}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View
              style={[
                styles.messageBubble,
                item.senderId === currentUserId ? styles.myMessage : styles.otherMessage,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  item.senderId !== currentUserId && { color: '#333333' },
                ]}
              >
                {item.text}
              </Text>
            </View>
          )}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingBottom: 10 }}
        />

        {/* Mesaj Input */}
        <View style={styles.inputContainer}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Mesaj..."
            style={styles.input}
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Gönder</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backText: { fontSize: 24, color: '#333333' },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  username: { fontSize: 16, fontWeight: '600', color: '#333333' },
  messageBubble: {
    padding: 14,
    marginVertical: 6,
    marginHorizontal: 12,
    borderRadius: 20,
    maxWidth: '75%',
  },
  myMessage: {
    backgroundColor: '#333333',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  otherMessage: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#333333',
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 4,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  messageText: { fontSize: 14, color: '#FFFFFF' },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
    fontSize: 14,
    backgroundColor: '#FAFAFA',
    color: '#6E6E6E',
  },
  sendButton: {
    backgroundColor: '#333333',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
