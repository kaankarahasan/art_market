import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
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
  otherUserPhoto?: string;
  unreadCount?: number;
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

      const chatsWithDetails = await Promise.all(
        userChatsRaw.map(async (doc) => {
          const data = doc.data();
          const users = doc.id.split('_');
          const otherUserId = users.find((u) => u !== currentUser.uid) ?? '';

          const userDocRef = docRef(db, 'users', otherUserId);
          const userDocSnap = await getDoc(userDocRef);

          let otherUserName = 'Bilinmeyen';
          let otherUserPhoto = undefined;
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data() as { fullName?: string; photoURL?: string };
            if (userData.fullName) otherUserName = userData.fullName;
            if (userData.photoURL) otherUserPhoto = userData.photoURL;
          }

          const unreadCount = data.unreadCounts?.[currentUser.uid] || 0;

          return {
            id: doc.id,
            lastMessage: data.lastMessage || '',
            otherUserId,
            otherUserName,
            otherUserPhoto,
            unreadCount,
          };
        })
      );

      setChats(chatsWithDetails);
    });

    return () => unsubscribe();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <View style={styles.centered}>
        <Text>Kullanıcı bilgisi alınamadı, lütfen giriş yapınız.</Text>
      </View>
    );
  }

  const renderChatItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate('ChatScreen', {
          currentUserId: currentUser.uid,
          otherUserId: item.otherUserId,
        })
      }
      style={styles.chatCard}
    >
      <Image
        source={
          item.otherUserPhoto
            ? { uri: item.otherUserPhoto }
            : require('../assets/default-avatar.png')
        }
        style={styles.avatar}
      />
      <View style={styles.textContainer}>
        <Text style={styles.name}>{item.otherUserName}</Text>
        <View style={styles.messageRow}>
          <Text style={styles.message} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unreadCount && item.unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text>Hiç sohbet yok.</Text>
          </View>
        }
        contentContainerStyle={chats.length === 0 ? { flex: 1 } : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', padding: 10 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    marginRight: 12,
  },
  textContainer: { flex: 1 },
  name: { fontWeight: '700', fontSize: 16, color: '#111', marginBottom: 4 },
  messageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  message: { color: '#777', fontSize: 14, flex: 1 },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  unreadText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
});
