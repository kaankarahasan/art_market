import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc as docRef,
  getDoc,
  where,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useThemeContext } from '../contexts/ThemeContext';

type ChatScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'InboxScreen'
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
  const [profileCache, setProfileCache] = useState<{ [key: string]: { photoURL?: string, displayName?: string } }>({});

  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastTimestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsWithDetails = snapshot.docs.map((doc) => {
        const data = doc.data();
        const users = doc.id.split('_');
        const otherUserId = users.find((u) => u !== currentUser.uid) ?? '';

        const info = data.userInfos?.[otherUserId] || {};
        const unreadCount = data.unreadCounts?.[currentUser.uid] || 0;

        return {
          id: doc.id,
          lastMessage: data.lastMessage || '',
          otherUserId,
          otherUserName: info.displayName || info.fullName || info.username || 'Bilinmeyen',
          otherUserPhoto: info.photoURL || undefined,
          unreadCount,
        };
      });

      setChats(chatsWithDetails);
    }, (error) => {
      console.warn("Snapshot error in Inbox, falling back to legacy filtering:", error);
      const fallbackQuery = query(collection(db, 'chats'), orderBy('lastTimestamp', 'desc'));
      onSnapshot(fallbackQuery, (snap) => {
        const legacyChats = snap.docs
          .filter(d => d.id.includes(currentUser!.uid))
          .map(d => {
            const data = d.data();
            const users = d.id.split('_');
            const otherUid = users.find(u => u !== currentUser!.uid) || '';
            const info = data.userInfos?.[otherUid] || {};
            return {
              id: d.id,
              lastMessage: data.lastMessage || '',
              otherUserId: otherUid,
              otherUserName: info.displayName || info.fullName || info.username || 'Bilinmeyen',
              otherUserPhoto: info.photoURL || undefined,
              unreadCount: data.unreadCounts?.[currentUser!.uid] || 0,
            };
          });
        setChats(legacyChats);
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 2. Fetch User Profiles (Performance Optimized)
  useEffect(() => {
    const fetchMissingProfiles = async () => {
      const missingIds = chats
        .map(c => c.otherUserId)
        .filter(id => id && !profileCache[id]);

      if (missingIds.length === 0) return;

      // Unique IDs to fetch
      const uniqueMissing = Array.from(new Set(missingIds));
      const newProfiles: { [key: string]: any } = {};

      await Promise.all(uniqueMissing.map(async (uid) => {
        try {
          const userSnap = await getDoc(docRef(db, 'users', uid));
          if (userSnap.exists()) {
            const userData = userSnap.data();
            newProfiles[uid] = {
              photoURL: userData.photoURL || userData.profileImage,
              displayName: userData.displayName || userData.fullName || userData.username || 'Kullanıcı'
            };
          }
        } catch (e) {
          console.error("Error fetching user profile:", e);
        }
      }));

      if (Object.keys(newProfiles).length > 0) {
        setProfileCache(prev => ({ ...prev, ...newProfiles }));
      }
    };

    fetchMissingProfiles();
  }, [chats]);

  const { colors } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  if (!currentUser) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.text }}>Kullanıcı bilgisi alınamadı, lütfen giriş yapınız.</Text>
      </View>
    );
  }

  const renderChatItem = ({ item }: { item: ChatItem }) => {
    const cachedUser = profileCache[item.otherUserId];
    const photoURL = cachedUser?.photoURL || item.otherUserPhoto;
    const displayName = cachedUser?.displayName || item.otherUserName;

    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('Chat', {
            currentUserId: currentUser.uid,
            otherUserId: item.otherUserId,
          })
        }
        style={styles.chatCard}
      >
        <Image
          source={
            photoURL
              ? { uri: photoURL }
              : require('../assets/default-avatar.png')
          }
          style={styles.avatar}
        />
        <View style={styles.textContainer}>
          <Text style={styles.name}>{displayName}</Text>
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
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back-ios" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mesajlar</Text>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={{ color: colors.text }}>Hiç sohbet yok.</Text>
          </View>
        }
        contentContainerStyle={chats.length === 0 ? { flex: 1 } : undefined}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
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
  name: { fontWeight: '700', fontSize: 16, color: colors.text, marginBottom: 4 },
  messageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  message: { color: colors.secondaryText, fontSize: 14, flex: 1 },
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
