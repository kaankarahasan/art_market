import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  DocumentData,
  doc as docRef,
  getDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes/types';

type ChatScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ChatScreen'
>;

type ChatItem = {
  id: string;
  lastMessage: string;
  otherUserId: string;
  otherUserName: string;
};

export default function InboxScreen() {
  const currentUser = auth.currentUser;
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const [chats, setChats] = useState<ChatItem[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, 'chats'), orderBy('lastTimestamp', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const userChatsRaw = snapshot.docs.filter((doc) =>
        doc.id.includes(currentUser.uid)
      );

      const chatsWithName = await Promise.all(
        userChatsRaw.map(async (doc) => {
          const data = doc.data();
          const users = doc.id.split('_');
          const otherUserId = users.find((u) => u !== currentUser.uid) ?? '';

          const userDocRef = docRef(db, 'users', otherUserId);
          const userDocSnap = await getDoc(userDocRef);

          let otherUserName = 'Bilinmeyen';
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as { fullName?: string };
            if (userData.fullName) otherUserName = userData.fullName;
          }

          return {
            id: doc.id,
            lastMessage: data.lastMessage || '',
            otherUserId,
            otherUserName,
          };
        })
      );

      setChats(chatsWithName);
    });

    return () => unsubscribe();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Kullanıcı bilgisi alınamadı, lütfen giriş yapınız.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('ChatScreen', {
                currentUserId: currentUser.uid,
                otherUserId: item.otherUserId,
              })
            }
            style={{ padding: 15, borderBottomWidth: 1, borderColor: '#ddd' }}
          >
            <Text style={{ fontWeight: 'bold' }}>{item.otherUserName}</Text>
            <Text style={{ color: '#555', marginTop: 5 }}>{item.lastMessage}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text>Hiç sohbet yok.</Text>}
      />
    </View>
  );
}
