import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../routes/types';
import { useThemeContext } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { offerService } from '../services/offerService';
import { auth } from '../firebaseConfig';

type OfferRouteProp = RouteProp<RootStackParamList, 'Offer'>;

const OfferScreen = () => {
  const { colors, isDarkTheme } = useThemeContext();
  const { t } = useLanguage();
  const route = useRoute<OfferRouteProp>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { product } = route.params;

  const [offerAmount, setOfferAmount] = useState('');
  const [offerNote, setOfferNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const productPrice = Number(product.price) || 0;
  const firstImage = Array.isArray(product.imageUrls) ? product.imageUrls[0] : product.imageUrls;

  // Cost calculations
  const currentAmount = Number(offerAmount) || 0;
  const serviceFee = Math.round(currentAmount * 0.05);
  const totalAmount = currentAmount + serviceFee;

  useEffect(() => {
    if (feedback) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        hideFeedback();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const hideFeedback = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      const isSuccess = feedback?.type === 'success';
      setFeedback(null);
      if (isSuccess) {
        navigation.goBack();
      }
    });
  };

  const handleQuickOffer = (percent: number) => {
    const discounted = productPrice * (1 - percent / 100);
    setOfferAmount(Math.round(discounted).toString());
  };

  const handleSendOffer = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setFeedback({ type: 'warning', message: 'Giriş yapmalısınız.' });
      return;
    }

    if (!offerAmount || isNaN(Number(offerAmount))) {
      setFeedback({ type: 'warning', message: t('fillAllFields') });
      return;
    }

    try {
      setIsSending(true);
      await offerService.sendOffer({
        productId: product.id,
        productTitle: product.title,
        productImage: firstImage || '',
        buyerId: currentUser.uid,
        buyerName: currentUser.displayName || currentUser.email || t('unknown'),
        sellerId: product.ownerId,
        sellerName: product.username || t('unknown'),
        amount: currentAmount,
        serviceFee: serviceFee,
        totalAmount: totalAmount,
        originalPrice: productPrice,
        note: offerNote,
      });

      setFeedback({ type: 'success', message: t('offerSentSuccess') });
    } catch (error: any) {
      if (error.message === 'alreadyOffered') {
        setFeedback({ type: 'warning', message: t('alreadyOffered') });
      } else {
        setFeedback({ type: 'error', message: t('offerAddError') });
      }
    } finally {
      setIsSending(false);
    }
  };

  const formatCategory = (cat: string) => {
    if (!cat) return '';
    const translationKey = `cat_${cat.toLowerCase().replace(/ /g, '_')}` as any;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('makeOffer')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.artCard, { backgroundColor: colors.card }]}>
              <Image source={{ uri: firstImage }} style={styles.productImage} />
              <View style={styles.productInfo}>
                <Text style={[styles.productTitle, { color: colors.text }]} numberOfLines={1}>{product.title}</Text>
                <Text style={[styles.productCategory, { color: colors.secondaryText }]}>{formatCategory(product.category || '')}</Text>
                <Text style={[styles.productPrice, { color: colors.secondaryText }]}>₺{productPrice.toLocaleString('tr-TR')}</Text>
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={[styles.label, { color: colors.text }]}>{t('offerAmount')}</Text>
              <View style={styles.quickOffers}>
                {[10, 20, 30].map((percent) => (
                  <TouchableOpacity
                    key={percent}
                    style={[styles.chip, { backgroundColor: isDarkTheme ? '#222' : '#F5F5F5', borderColor: colors.border }]}
                    onPress={() => handleQuickOffer(percent)}
                  >
                    <Text style={[styles.chipText, { color: colors.text }]}>-%{percent}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.amountInputContainer, { borderBottomColor: colors.text }]}>
                <Text style={[styles.currency, { color: colors.text }]}>₺</Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.text }]}
                  placeholder="0"
                  placeholderTextColor={colors.secondaryText}
                  keyboardType="numeric"
                  value={offerAmount}
                  onChangeText={setOfferAmount}
                />
              </View>
            </View>

            {currentAmount > 0 && (
              <View style={[styles.breakdownCard, { backgroundColor: colors.card }]}>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: colors.secondaryText }]}>Teklif Tutarı</Text>
                  <Text style={[styles.breakdownValue, { color: colors.text }]}>₺{currentAmount.toLocaleString('tr-TR')}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={[styles.breakdownLabel, { color: colors.secondaryText }]}>Hizmet Bedeli (%5)</Text>
                  <Text style={[styles.breakdownValue, { color: colors.text }]}>₺{serviceFee.toLocaleString('tr-TR')}</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.breakdownRow}>
                  <Text style={[styles.totalLabel, { color: colors.text }]}>Ödenecek Toplam</Text>
                  <Text style={[styles.totalValue, { color: colors.text }]}>₺{totalAmount.toLocaleString('tr-TR')}</Text>
                </View>
              </View>
            )}

            <View style={styles.inputSection}>
              <Text style={[styles.label, { color: colors.text }]}>{t('offerNote')}</Text>
              <TextInput
                style={[styles.noteInput, { 
                  backgroundColor: colors.card, 
                  color: colors.text, 
                  borderColor: colors.border 
                }]}
                placeholder={t('offerNotePlaceholder')}
                placeholderTextColor={colors.secondaryText}
                multiline
                numberOfLines={4}
                value={offerNote}
                onChangeText={setOfferNote}
              />
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
            <TouchableOpacity
              style={[styles.mainButton, { backgroundColor: colors.text }, isSending && { opacity: 0.7 }]}
              onPress={handleSendOffer}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={[styles.mainButtonText, { color: colors.background }]}>{t('sendOffer')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        {feedback && (
          <Animated.View style={[styles.feedbackOverlay, { opacity: fadeAnim, backgroundColor: 'rgba(0,0,0,0.8)' }]}>
            <View style={[styles.feedbackContent, { backgroundColor: colors.card }]}>
              <Ionicons 
                name={feedback.type === 'success' ? 'checkmark-circle' : (feedback.type === 'warning' ? 'warning' : 'alert-circle')} 
                size={50} 
                color={feedback.type === 'success' ? '#4CD964' : (feedback.type === 'warning' ? '#FF9500' : '#FF3B30')} 
              />
              <Text style={[styles.feedbackMessage, { color: colors.text }]}>{feedback.message}</Text>
              <TouchableOpacity style={[styles.closeFeedback, { backgroundColor: colors.text }]} onPress={hideFeedback}>
                <Text style={{ color: colors.background, fontWeight: 'bold' }}>{t('close')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

export default OfferScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: '700', letterSpacing: 0.5 },
  scrollContent: { padding: 24 },
  artCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  productImage: { width: 70, height: 70, borderRadius: 16 },
  productInfo: { marginLeft: 16, flex: 1 },
  productTitle: { fontSize: 18, fontWeight: '600' },
  productCategory: { fontSize: 13, marginTop: 2, opacity: 0.7 },
  productPrice: { fontSize: 15, marginTop: 4, letterSpacing: 0.5 },
  inputSection: { marginBottom: 32 },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7 },
  quickOffers: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontWeight: '600' },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    paddingVertical: 10,
  },
  currency: { fontSize: 28, fontWeight: '700', marginRight: 10 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: '700' },
  breakdownCard: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  breakdownLabel: { fontSize: 14 },
  breakdownValue: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginVertical: 15, opacity: 0.1 },
  totalLabel: { fontSize: 16, fontWeight: 'bold' },
  totalValue: { fontSize: 20, fontWeight: 'bold' },
  noteInput: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    height: 140,
    textAlignVertical: 'top',
    fontSize: 16,
    lineHeight: 24,
  },
  footer: { paddingHorizontal: 24 },
  mainButton: {
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  mainButtonText: { fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 30,
  },
  feedbackContent: {
    width: '100%',
    padding: 30,
    borderRadius: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
  feedbackMessage: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginTop: 20, marginBottom: 30, lineHeight: 26 },
  closeFeedback: { paddingHorizontal: 40, paddingVertical: 15, borderRadius: 16 },
});
