import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity, 
  Image, 
  Alert 
} from 'react-native';
import { useThemeContext } from '../contexts/ThemeContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  FirebaseFirestoreTypes 
} from '@react-native-firebase/firestore';
import { db, auth } from '../firebaseConfig';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import { offerService, Offer } from '../services/offerService';

const NotificationScreen = () => {
  const { colors, isDarkTheme } = useThemeContext();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  const [activeTab, setActiveTab] = useState<'general' | 'offers'>('general');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rawReceivedOffers, setRawReceivedOffers] = useState<Offer[]>([]);
  const [rawSentOffers, setRawSentOffers] = useState<Offer[]>([]);

  const currentUser = auth.currentUser;

  // Listen to Notifications
  useEffect(() => {
    if (!currentUser) {
      setLoadingNotifs(false);
      return;
    }

    let unsubscribe: () => void;
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot) {
          setLoadingNotifs(false);
          return;
        }
        const notifs = snapshot.docs.map((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        setNotifications(notifs);
        setError(null);
        setLoadingNotifs(false);
      }, (err) => {
        console.error('[Notifications] Listener error:', err);
        if (err.message.includes('failed-precondition')) {
          setError('İndeksler yapılandırılıyor, lütfen biraz bekleyin...');
        } else {
          setError('Bildirimler yüklenirken bir hata oluştu.');
        }
        setLoadingNotifs(false);
      });
    } catch (err) {
      console.error('[Notifications] Initial query error:', err);
      setLoadingNotifs(false);
    }

    return () => unsubscribe && unsubscribe();
  }, [currentUser]);

  // Listen to Offers (both sent and received)
  useEffect(() => {
    if (!currentUser) {
      setLoadingOffers(false);
      return;
    }

    let unsubReceived: () => void;
    let unsubSent: () => void;

    try {
      // Received Offers (Seller)
      const qReceived = query(
        collection(db, 'offers'),
        where('sellerId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      unsubReceived = onSnapshot(qReceived, (snapshot) => {
        if (snapshot) {
          const received = snapshot.docs.map((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({ 
            id: doc.id, 
            ...doc.data() 
          } as Offer));
          setRawReceivedOffers(received);
          setError(null);
        }
        setLoadingOffers(false);
      }, (err) => {
        console.error('[Offers] Received listener error:', err);
        if (err.message.includes('failed-precondition')) {
          setError('Teklif indeksleri oluşturuluyor...');
        }
        setLoadingOffers(false);
      });

      // Sent Offers (Buyer)
      const qSent = query(
        collection(db, 'offers'),
        where('buyerId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );

      unsubSent = onSnapshot(qSent, (snapshot) => {
        if (snapshot) {
          const sent = snapshot.docs.map((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({ 
            id: doc.id, 
            ...doc.data() 
          } as Offer));
          setRawSentOffers(sent);
          setError(null);
        }
        setLoadingOffers(false);
      }, (err) => {
        console.error('[Offers] Sent listener error:', err);
        if (err.message.includes('failed-precondition')) {
          setError('Teklif indeksleri oluşturuluyor, lütfen bekleyin...');
        }
        setLoadingOffers(false);
      });
    } catch (err) {
      console.error('[Offers] Initial query error:', err);
      setLoadingOffers(false);
    }

    return () => {
      unsubReceived && unsubReceived();
      unsubSent && unsubSent();
    };
  }, [currentUser]);

  const allOffers = useMemo(() => {
    try {
      const combined = [...rawReceivedOffers, ...rawSentOffers];
      if (combined.length === 0) return [];
      
      const uniqueMap = new Map();
      combined.forEach(o => {
        if (o && o.id) uniqueMap.set(o.id, o);
      });
      
      const unique = Array.from(uniqueMap.values());
      return unique.sort((a, b) => {
        const dateA = a?.createdAt?.toDate?.() || new Date(0);
        const dateB = b?.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
    } catch (err) {
      console.error('[Offers] Memo sort error:', err);
      return [];
    }
  }, [rawReceivedOffers, rawSentOffers]);

  const markAsRead = async (id: string, read: boolean) => {
    if (!id || read) return;
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (e) {
      console.error('Error updating notification', e);
    }
  };

  const handleAcceptOffer = async (offer: Offer) => {
    if (!offer?.id) return;
    Alert.alert(
      t('acceptOffer'),
      `${offer.productTitle || 'Ürün'} için ₺${offer.amount?.toLocaleString('tr-TR')} tutarındaki teklifi kabul etmek istediğinize emin misiniz?`,
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('acceptOffer'), 
          onPress: async () => {
            try {
              await offerService.respondToOffer(offer.id!, offer.productId, 'accepted');
              Alert.alert(t('success'), t('offerAccepted'));
            } catch (error) {
              Alert.alert(t('error'), 'İşlem başarısız oldu.');
            }
          }
        }
      ]
    );
  };

  const handleRejectOffer = async (offer: Offer) => {
    if (!offer?.id) return;
    Alert.alert(
      t('rejectOffer'),
      'Teklifi reddetmek istediğinize emin misiniz?',
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('rejectOffer'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await offerService.respondToOffer(offer.id!, offer.productId, 'rejected');
            } catch (error) {
              Alert.alert(t('error'), 'İşlem başarısız oldu.');
            }
          }
        }
      ]
    );
  };

  const handleCancelOffer = async (offer: Offer) => {
    if (!offer?.id) return;
    Alert.alert(
      t('cancelOffer'),
      'Teklifinizi geri çekmek istediğinize emin misiniz?',
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('cancelOffer'), 
          style: 'destructive',
          onPress: async () => {
            try {
              await offerService.cancelOffer(offer.id!);
            } catch (error) {
              Alert.alert(t('error'), 'İşlem başarısız oldu.');
            }
          }
        }
      ]
    );
  };

  const renderNotification = useCallback(({ item }: { item: any }) => {
    if (!item) return null;
    return (
      <TouchableOpacity 
        style={[
          styles.notificationCard, 
          { 
            backgroundColor: item?.read ? colors.background : (isDarkTheme ? '#2A2A2A' : '#F9F9F9'), 
            borderBottomColor: colors.border || '#EEE' 
          }
        ]}
        onPress={() => item?.id && markAsRead(item.id, item.read)}
      >
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: item?.read ? colors.card : (isDarkTheme ? '#333' : '#FFF1F1') }]}>
            <Ionicons 
              name={item?.type === 'offer' ? 'pricetag' : 'notifications'} 
              size={22} 
              color={item?.read ? colors.secondaryText : (colors.primary || '#FF3040')} 
            />
          </View>
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.message, { color: colors.text, fontWeight: item?.read ? '400' : '600' }]}>
            {item?.message || 'Yeni bir bildiriminiz var.'}
          </Text>
          <Text style={[styles.time, { color: colors.secondaryText }]}>
            {item?.createdAt?.toDate ? item.createdAt.toDate().toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : ''}
          </Text>
        </View>
        {!item?.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  }, [colors, isDarkTheme]);

  const renderOffer = useCallback(({ item }: { item: Offer }) => {
    if (!item) return null;
    const isBuyer = item.buyerId === currentUser?.uid;
    const isPending = item.status === 'pending';

    return (
      <View style={[styles.offerCard, { backgroundColor: colors.card, borderColor: colors.border || '#EEE' }]}>
        <View style={styles.offerMainInfo}>
          {item.productImage ? (
            <Image source={{ uri: item.productImage }} style={styles.offerProductImage} />
          ) : (
            <View style={[styles.offerProductImage, { backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="image-outline" size={24} color="#999" />
            </View>
          )}
          <View style={styles.offerTextInfo}>
            <Text style={[styles.offerProductTitle, { color: colors.text }]} numberOfLines={1}>
              {item.productTitle || 'İsimsiz Ürün'}
            </Text>
            <Text style={[styles.offerUser, { color: colors.secondaryText }]}>
              {isBuyer ? `${t('seller')}: ${item.sellerName || 'Bilinmiyor'}` : `${t('buyer')}: ${item.buyerName || 'Bilinmiyor'}`}
            </Text>
            <View style={styles.priceRow}>
              <Text style={[styles.offerAmount, { color: colors.text }]}>
                ₺{item.amount?.toLocaleString('tr-TR') || '0'}
              </Text>
              {item.originalPrice && (
                <Text style={[styles.originalPrice, { color: colors.secondaryText }]}>
                  ₺{item.originalPrice.toLocaleString('tr-TR')}
                </Text>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item?.status || 'pending') }]}>
            <Text style={styles.statusText}>
              {t(`offer${(item?.status || 'pending').charAt(0).toUpperCase() + (item?.status || 'pending').slice(1)}` as any)}
            </Text>
          </View>
        </View>

        {item.note ? (
          <View style={styles.noteContainer}>
            <Ionicons name="chatbubble-outline" size={14} color={colors.secondaryText} />
            <Text style={[styles.noteText, { color: colors.secondaryText }]}>{item.note}</Text>
          </View>
        ) : null}

        {isPending && (
          <View style={styles.offerActions}>
            {!isBuyer ? (
              <>
                <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => handleRejectOffer(item)}>
                  <Text style={styles.actionButtonText}>{t('rejectOffer')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={() => handleAcceptOffer(item)}>
                  <Text style={styles.actionButtonText}>{t('acceptOffer')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={() => handleCancelOffer(item)}>
                <Text style={styles.actionButtonText}>{t('cancelOffer')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }, [colors, currentUser?.uid, t]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return '#4CD964';
      case 'rejected': return '#FF3B30';
      case 'cancelled': return '#8E8E93';
      default: return '#FF9500';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ backgroundColor: colors.background }}>
        <View style={[styles.header, { borderBottomColor: isDarkTheme ? '#333' : '#eee' }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('notifications')}</Text>
        </View>
      </SafeAreaView>

      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'general' && { borderBottomColor: colors.text }]}
          onPress={() => setActiveTab('general')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'general' ? colors.text : colors.secondaryText }]}>Genel</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'offers' && { borderBottomColor: colors.text }]}
          onPress={() => setActiveTab('offers')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'offers' ? colors.text : colors.secondaryText }]}>{t('offers')}</Text>
          {allOffers.some(o => o.status === 'pending') && (
            <View style={styles.badge} />
          )}
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.center}><Text style={{ color: '#FF3B30' }}>{error}</Text></View>
      ) : activeTab === 'general' ? (
        loadingNotifs ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 15, fontSize: 16, fontWeight: '500', color: colors.text }}>{t('loadingNotifications') || 'Bildirimler yükleniyor...'}</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.secondaryText} style={{ marginBottom: 10 }} />
            <Text style={{ color: colors.secondaryText }}>{t('noNotifications')}</Text>
          </View>
        ) : (
          <FlatList 
            data={notifications} 
            renderItem={renderNotification} 
            keyExtractor={item => item?.id || Math.random().toString()} 
          />
        )
      ) : (
        loadingOffers ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 15, fontSize: 16, fontWeight: '500', color: colors.text }}>{t('loadingOffers') || 'Teklifler yükleniyor...'}</Text>
          </View>
        ) : allOffers.length === 0 ? (
          <View style={styles.center}>
             <Ionicons name="pricetags-outline" size={48} color={colors.secondaryText} style={{ marginBottom: 10 }} />
             <Text style={{ color: colors.secondaryText }}>Henüz bir teklif yok.</Text>
          </View>
        ) : (
          <FlatList 
            data={allOffers} 
            renderItem={renderOffer} 
            keyExtractor={item => item?.id || Math.random().toString()} 
            contentContainerStyle={{ padding: 16 }} 
          />
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  backButton: { paddingRight: 10 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 15, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  notificationCard: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, alignItems: 'center' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3040', marginLeft: 8 },
  iconContainer: { marginRight: 16 },
  textContainer: { flex: 1 },
  message: { fontSize: 14, marginBottom: 4, lineHeight: 20 },
  time: { fontSize: 11 },
  badge: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3040', position: 'absolute', top: 12, right: '30%' },
  
  offerCard: { borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  offerMainInfo: { flexDirection: 'row', alignItems: 'center' },
  offerProductImage: { width: 70, height: 70, borderRadius: 12, marginRight: 16 },
  offerTextInfo: { flex: 1 },
  offerProductTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  offerUser: { fontSize: 13, marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  offerAmount: { fontSize: 16, fontWeight: 'bold' },
  originalPrice: { fontSize: 13, textDecorationLine: 'line-through', opacity: 0.6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  noteContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: 'rgba(0,0,0,0.03)', padding: 12, borderRadius: 12, gap: 8 },
  noteText: { fontSize: 13, fontStyle: 'italic', flex: 1, lineHeight: 18 },
  offerActions: { flexDirection: 'row', marginTop: 18, gap: 12 },
  actionButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  actionButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  acceptButton: { backgroundColor: '#4CD964' },
  rejectButton: { backgroundColor: '#FF3B30' },
  cancelButton: { backgroundColor: '#8E8E93' },
});

export default NotificationScreen;
