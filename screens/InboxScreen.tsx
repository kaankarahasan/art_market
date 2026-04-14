import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { query, collection, where, orderBy, onSnapshot, getDoc, doc, deleteDoc } from '@react-native-firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../routes/types';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const [profileCache, setProfileCache] = useState<{ [key: string]: { photoURL?: string, displayName?: string } }>({});
  
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadPinnedChats();
  }, []);

  const loadPinnedChats = async () => {
    try {
      const storedPins = await AsyncStorage.getItem(`pinnedChats_${currentUser?.uid}`);
      if (storedPins) {
        setPinnedChats(JSON.parse(storedPins));
      }
    } catch (e) {
      console.log('Error loading pinned chats', e);
    }
  };

  const togglePinChat = async (chatId: string) => {
    let newPinned = [...pinnedChats];
    if (newPinned.includes(chatId)) {
      newPinned = newPinned.filter(id => id !== chatId);
    } else {
      newPinned.push(chatId);
    }
    setPinnedChats(newPinned);
    try {
      await AsyncStorage.setItem(`pinnedChats_${currentUser?.uid}`, JSON.stringify(newPinned));
    } catch (e) {
      console.log('Error saving pinned chats', e);
    }
    setModalVisible(false);
  };

  const deleteChat = async (chatId: string) => {
    try {
      await deleteDoc(doc(db, 'chats', chatId));
      // Optional: Delete messages subcollection (requires Cloud Function or manual loop in a real app)
    } catch (e) {
      console.log('Error deleting chat', e);
      Alert.alert('Hata', 'Mesaj silinirken bir hata oluştu.');
    }
    setModalVisible(false);
  };

  const sortedChats = React.useMemo(() => {
    const pinned = chats.filter(chat => pinnedChats.includes(chat.id));
    const unpinned = chats.filter(chat => !pinnedChats.includes(chat.id));
    return [...pinned, ...unpinned];
  }, [chats, pinnedChats]);

  useEffect(() => {
    if (!currentUser) return;

    // Real-time listener using modular Native SDK syntax
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastTimestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsWithDetails = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        const users = doc.id.split('_');
        const otherUserId = users.find((u: string) => u !== currentUser.uid) ?? '';

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
      console.warn("Snapshot error in Inbox:", error);
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

      const uniqueMissing = Array.from(new Set(missingIds));
      const newProfiles: { [key: string]: any } = {};

      await Promise.all(uniqueMissing.map(async (uid: string) => {
        try {
          const userSnap = await getDoc(doc(db, 'users', uid));
          if (userSnap.exists()) {
            const userData = userSnap.data() as any;
            if (userData) {
              newProfiles[uid] = {
                photoURL: userData.photoURL || userData.profileImage,
                displayName: userData.displayName || userData.fullName || userData.username || 'Kullanıcı'
              };
            }
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
    const isPinned = pinnedChats.includes(item.id);
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
          <View style={styles.nameRow}>
            <Text style={styles.name}>{displayName}</Text>
            {isPinned && <MaterialIcons name="push-pin" size={16} color={colors.primary} style={{ marginLeft: 5 }} />}
          </View>
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
        <TouchableOpacity 
          style={styles.optionsButton} 
          onPress={() => {
            setSelectedChat(item);
            setModalVisible(true);
          }}
        >
          <MaterialIcons name="more-vert" size={24} color={colors.text} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
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
        data={sortedChats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={{ color: colors.text }}>Hiç sohbet yok.</Text>
          </View>
        }
        contentContainerStyle={[
          chats.length === 0 ? { flex: 1 } : {},
          { paddingBottom: 80 + insets.bottom }
        ]}
      />

      {/* Options Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {selectedChat && (
              <>
                <TouchableOpacity 
                  style={styles.modalOption} 
                  onPress={() => togglePinChat(selectedChat.id)}
                >
                  <MaterialIcons 
                    name={pinnedChats.includes(selectedChat.id) ? "push-pin" : "push-pin"} 
                    size={24} 
                    color={colors.text} 
                  />
                  <Text style={[styles.modalOptionText, { color: colors.text }]}>
                    {pinnedChats.includes(selectedChat.id) ? "Sabitlemeyi Kaldır" : "Sohbeti Sabitle"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.modalOption} 
                  onPress={() => deleteChat(selectedChat.id)}
                >
                  <MaterialIcons name="delete" size={24} color="#FF3B30" />
                  <Text style={[styles.modalOptionText, { color: '#FF3B30' }]}>Sohbeti Sil</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
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
  optionsButton: {
    padding: 8,
    marginLeft: 4,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    marginRight: 12,
  },
  textContainer: { flex: 1, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  name: { fontWeight: '700', fontSize: 16, color: colors.text },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 15,
  },
});
