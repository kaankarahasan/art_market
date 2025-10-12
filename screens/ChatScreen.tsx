import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Text,
  Image,
  StyleSheet,
} from 'react-native';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes/types';

type Message = {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
};

type Props = {
  route: {
    params: {
      currentUserId: string;
      otherUserId: string;
    };
  };
};

export default function ChatScreen({ route }: Props) {
  const { currentUserId, otherUserId } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [otherUser, setOtherUser] = useState<{ displayName: string; photoURL?: string }>({ displayName: '', photoURL: undefined });

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const chatId = [currentUserId, otherUserId].sort().join('_');

  useEffect(() => {
    // Kullanıcı bilgilerini al
    const fetchOtherUser = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', otherUserId));
        if (snap.exists()) {
          const data = snap.data() as any;
          // displayName veya fullName varsa al, yoksa "Bilinmeyen"
          const name =
            data.displayName ||
            data.fullName ||
            data.username ||
            'Bilinmeyen';
          setOtherUser({
            displayName: name,
            photoURL: data.photoURL,
          });
        } else {
          setOtherUser({ displayName: 'Bilinmeyen', photoURL: undefined });
        }
      } catch (error) {
        console.error('Kullanıcı bilgisi alınamadı:', error);
        setOtherUser({ displayName: 'Bilinmeyen', photoURL: undefined });
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
  }, [chatId]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    const messagesRef = collection(db, 'chats', chatId, 'messages');

    await addDoc(messagesRef, {
      text,
      senderId: currentUserId,
      createdAt: serverTimestamp(),
    });

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
    <View style={styles.container}>
      {/* Üst Bar */}
      <TouchableOpacity
        style={styles.header}
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
            <Text style={styles.messageText}>{item.text}</Text>
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
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  username: { fontSize: 16, fontWeight: '600', color: '#111' },
  messageBubble: {
    padding: 12,
    marginVertical: 4,
    marginHorizontal: 10,
    borderRadius: 16,
    maxWidth: '70%',
  },
  myMessage: {
    backgroundColor: '#DCF8C5',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  messageText: { fontSize: 14, color: '#111' },
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
    borderColor: '#E5E5E5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
    fontSize: 14,
    backgroundColor: '#FAFAFA',
  },
  sendButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  sendButtonText: {
    color: '#333333',
    fontWeight: '600',
    fontSize: 14,
  },
});
