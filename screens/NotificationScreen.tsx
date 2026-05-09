import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useThemeContext } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { db, auth } from '../firebaseConfig';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const NotificationScreen = () => {
  const { colors, isDarkTheme } = useThemeContext();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot || !snapshot.docs) {
          setLoading(false);
          return;
        }
        const notifs = snapshot.docs.map((notifDoc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
          id: notifDoc.id,
          ...notifDoc.data()
        }));
        setNotifications(notifs);
        setLoading(false);
      },
      (error) => {
        console.error('[NotificationScreen] Firestore error:', error.message);
        // Firestore composite index eksikse link konsola basılır
        // https://console.firebase.google.com/... adresinden index oluşturulabilir
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const markAsRead = async (id: string, read: boolean) => {
    if (read) return;
    try {
      await updateDoc(doc(db, 'notifications', id), {
        read: true
      });
    } catch (e) {
      console.error('Error updating notification', e);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity 
        style={[styles.notificationCard, { backgroundColor: item.read ? colors.background : (isDarkTheme ? '#333' : '#f9f9f9'), borderBottomColor: colors.border || '#eee' }]}
        onPress={() => markAsRead(item.id, item.read)}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="notifications" size={24} color={colors.primary || '#FF3040'} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.message, { color: colors.text, fontWeight: item.read ? 'normal' : 'bold' }]}>{item.message}</Text>
          <Text style={[styles.time, { color: colors.secondaryText }]}>
            {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString() : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border || '#eee' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Bildirimler</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={64} color={colors.secondaryText} />
          <Text style={[styles.emptyText, { color: colors.secondaryText }]}>Henüz bildiriminiz yok.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom }}
        />
      )}
    </View>
  );
};

export default NotificationScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 16, fontSize: 16 },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
  },
  iconContainer: {
    marginRight: 16,
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    fontSize: 15,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
  }
});
