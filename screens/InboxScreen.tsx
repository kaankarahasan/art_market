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
import { query, collection, where, orderBy, onSnapshot, getDoc, doc, deleteDoc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { useNavigation, useFocusEffect, NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../routes/types';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useThemeContext } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

type ChatScreenNavigationProp = NavigationProp<RootStackParamList>;

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
  const { colors, isDarkTheme } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors, isDarkTheme), [colors, isDarkTheme]);
  const { t } = useLanguage();
  
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Tab bar'ı InboxScreen'e girildiğinde geri göster (diğer stack ekranları gizliyor olabilir)
  useFocusEffect(
    React.useCallback(() => {
      const tabBarStyle = {
        display: 'flex' as const,
        position: 'absolute' as const,
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: isDarkTheme ? '#333' : '#F0F0F0',
        height: 60 + insets.bottom,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
        paddingTop: 8,
      };
      navigation.getParent()?.setOptions({ tabBarStyle });
    }, [navigation, colors, isDarkTheme, insets.bottom])
  );

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
      if (!currentUser) return;
      await setDoc(doc(db, 'chats', chatId), {
        clearedAt: {
          [currentUser.uid]: serverTimestamp()
        }
      }, { merge: true });
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
          otherUserName: info.displayName || info.fullName || info.username || info.name || 'Bilinmeyen',
          otherUserPhoto: info.photoURL || info.profilePicture || info.profileImage || undefined,
          unreadCount,
          _data: data,
        };
      }).filter((chat: any) => {
        const clearedAt = chat._data.clearedAt?.[currentUser.uid];
        if (!clearedAt) return true;
        const lastTimestamp = chat._data.lastTimestamp;
        if (!lastTimestamp) return false;
        return lastTimestamp.toMillis() > clearedAt.toMillis();
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
                photoURL: userData.photoURL || userData.profilePicture || userData.profileImage,
                displayName: userData.displayName || userData.fullName || userData.username || userData.name || t('unknown')
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

  if (!currentUser) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.text }}>{t('loginRequired')}</Text>
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
      <View style={[styles.header, { justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('messages')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('NotificationScreen')}
          style={{ padding: 8 }}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedChats}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={{ color: colors.text }}>{t('noChats')}</Text>
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
                    {pinnedChats.includes(selectedChat.id) ? t('unpinChat') : t('pinChat')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.modalOption} 
                  onPress={() => {
                    setModalVisible(false);
                    setDeleteModalVisible(true);
                  }}
                >
                  <MaterialIcons name="delete" size={24} color="#FF3B30" />
                  <Text style={[styles.modalOptionText, { color: '#FF3B30' }]}>{t('deleteChat')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Chat Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDeleteModalVisible(false)}
        >
          <View style={[styles.confirmModalBox, { backgroundColor: colors.card }]}>
            <MaterialIcons name="delete" size={36} color="#FF3B30" style={{ marginBottom: 12 }} />
            <Text style={[styles.confirmModalTitle, { color: colors.text }]}>{t('deleteChat')}</Text>
            <Text style={[styles.confirmModalSubtitle, { color: colors.text + 'aa' }]}>
              {t('areYouSureDeleteChat') || 'Sohbeti silmek istediğinize emin misiniz?'}
            </Text>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={[styles.confirmModalCancelBtn, { borderColor: isDarkTheme ? '#444' : '#E0E0E0' }]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={[styles.confirmModalCancelText, { color: colors.text }]}>{t('cancel') || 'İptal'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmModalConfirmBtn, { backgroundColor: '#FF3B30' }]}
                onPress={() => {
                  if (selectedChat) deleteChat(selectedChat.id);
                  setDeleteModalVisible(false);
                }}
              >
                <Text style={[styles.confirmModalConfirmText, { color: '#fff' }]}>{t('delete') || 'Sil'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDarkTheme: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDarkTheme ? '#333' : '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  backButton: {
    paddingRight: 10,
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
    shadowOpacity: isDarkTheme ? 0.3 : 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: isDarkTheme ? 2 : 2,
    borderWidth: isDarkTheme ? 1 : 0,
    borderColor: isDarkTheme ? '#2a2a2a' : 'transparent',
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
    elevation: isDarkTheme ? 2 : 5,
    shadowColor: '#000',
    shadowOpacity: isDarkTheme ? 0.3 : 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    borderWidth: isDarkTheme ? 1 : 0,
    borderColor: isDarkTheme ? '#2a2a2a' : 'transparent',
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
  confirmModalBox: {
    width: '82%',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDarkTheme ? 0.4 : 0.18,
    shadowRadius: 16,
    elevation: isDarkTheme ? 4 : 8,
    borderWidth: isDarkTheme ? 1 : 0,
    borderColor: isDarkTheme ? '#2a2a2a' : 'transparent',
  },
  confirmModalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  confirmModalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmModalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmModalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModalCancelText: { fontWeight: '600', fontSize: 15 },
  confirmModalConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModalConfirmText: { fontWeight: '700', fontSize: 15 },
});
