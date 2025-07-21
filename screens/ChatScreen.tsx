import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  Button,
  FlatList,
  Text,
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

  const chatId = [currentUserId, otherUserId].sort().join('_');

  useEffect(() => {
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

    // Yeni mesajı gönder
    await addDoc(messagesRef, {
      text,
      senderId: currentUserId,
      createdAt: serverTimestamp(),
    });

    // Her iki kullanıcının adını al
    const currentUserSnap = await getDoc(doc(db, 'users', currentUserId));
    const otherUserSnap = await getDoc(doc(db, 'users', otherUserId));

    const currentUserData = currentUserSnap.exists() ? currentUserSnap.data() : {};
    const otherUserData = otherUserSnap.exists() ? otherUserSnap.data() : {};

    // Sohbet meta verisini güncelle
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
      <FlatList
        inverted
        data={[...messages].reverse()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text
            style={[
              styles.message,
              item.senderId === currentUserId
                ? styles.myMessage
                : styles.otherMessage,
            ]}
          >
            {item.text}
          </Text>
        )}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          value={text}
          onChangeText={setText}
          style={styles.input}
          placeholder="Mesaj..."
          multiline
        />
        <Button title="Gönder" onPress={sendMessage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  inputContainer: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 10,
    marginRight: 10,
    height: 40,
  },
  message: {
    padding: 8,
    borderRadius: 8,
    marginVertical: 4,
    maxWidth: '70%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C5',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
  },
});
