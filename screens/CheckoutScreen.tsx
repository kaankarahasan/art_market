import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
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
import { auth, db, functions } from '../firebaseConfig';
import { httpsCallable } from '@react-native-firebase/functions';
import { useStripe } from '@stripe/stripe-react-native';
import { doc, updateDoc } from '@react-native-firebase/firestore';

type CheckoutRouteProp = RouteProp<RootStackParamList, 'Checkout'>;

const CheckoutScreen = () => {
  const { colors, isDarkTheme } = useThemeContext();
  const { t } = useLanguage();
  const route = useRoute<CheckoutRouteProp>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { product } = route.params;

  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const productPrice = Number(product.price) || 0;
  const serviceFee = Math.round(productPrice * 0.05);
  const totalAmount = productPrice + serviceFee;

  const firstImage = Array.isArray(product.imageUrls) ? product.imageUrls[0] : product.imageUrls;

  useEffect(() => {
    if (feedback) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        if (feedback.type === 'success') hideFeedback();
      }, 5000);
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

  const handlePayment = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setFeedback({ type: 'warning', message: 'Giriş yapmalısınız.' });
      return;
    }

    try {
      setIsProcessing(true);
      
      if (!functions) {
        setFeedback({ type: 'error', message: 'Ödeme servisi hazır değil.' });
        setIsProcessing(false);
        return;
      }

      const createPaymentIntentFn = httpsCallable(functions, 'createPaymentIntent');
      const response = await createPaymentIntentFn({
        amount: Math.round(totalAmount * 100),
        currency: 'try',
        productId: product.id,
        sellerId: product.ownerId,
      });

      const responseData = response.data as any;
      const clientSecret = responseData?.clientSecret;

      if (!clientSecret) {
        setFeedback({ type: 'error', message: 'Ödeme oturumu başlatılamadı.' });
        setIsProcessing(false);
        return;
      }

      const initResponse = await initPaymentSheet({
        merchantDisplayName: 'Umay Art Market',
        paymentIntentClientSecret: clientSecret,
        returnURL: 'umay://stripe-redirect',
        allowsDelayedPaymentMethods: false,
      });
      
      if (initResponse.error) {
        setFeedback({ type: 'error', message: initResponse.error.message });
        setIsProcessing(false);
        return;
      }

      const paymentResponse = await presentPaymentSheet();

      if (paymentResponse.error) {
        if (paymentResponse.error.code !== 'Canceled') {
          setFeedback({ type: 'error', message: paymentResponse.error.message });
        }
      } else {
        await updateDoc(doc(db, 'products', product.id), {
          isSold: true,
          status: 'sold'
        });
        setFeedback({ type: 'success', message: 'Satın alma işlemi başarıyla gerçekleşti! 🎉' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Bir sorun oluştu: ${e?.message || 'Bilinmeyen hata'}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCategory = (cat: string) => {
    if (!cat) return '';
    const translationKey = `cat_${cat.toLowerCase().replace(/ /g, '_')}` as any;
    const translated = t(translationKey);
    return translated !== translationKey ? translated : cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Satın Al</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.artSummary, { backgroundColor: colors.card }]}>
          <Image source={{ uri: firstImage }} style={styles.productImage} />
          <View style={styles.productDetails}>
            <Text style={[styles.productTitle, { color: colors.text }]}>{product.title}</Text>
            <Text style={[styles.productCategory, { color: colors.secondaryText }]}>{formatCategory(product.category || '')}</Text>
          </View>
        </View>

        <View style={styles.costSection}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Ödeme Detayları</Text>
          <View style={[styles.costCard, { backgroundColor: colors.card }]}>
            <View style={styles.costRow}>
              <Text style={[styles.costLabel, { color: colors.secondaryText }]}>Eser Bedeli</Text>
              <Text style={[styles.costValue, { color: colors.text }]}>₺{productPrice.toLocaleString('tr-TR')}</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={[styles.costLabel, { color: colors.secondaryText }]}>Hizmet Bedeli (%5)</Text>
              <Text style={[styles.costValue, { color: colors.text }]}>₺{serviceFee.toLocaleString('tr-TR')}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.costRow}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Toplam</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>₺{totalAmount.toLocaleString('tr-TR')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.secureBadge}>
          <Ionicons name="shield-checkmark" size={24} color="#4CD964" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.secureTitle, { color: colors.text }]}>Güvenli Ödeme</Text>
            <Text style={[styles.secureText, { color: colors.secondaryText }]}>
              Ödemeniz Stripe altyapısı ile 256-bit SSL şifreleme altında korunmaktadır.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.payButton, { backgroundColor: colors.text }, isProcessing && { opacity: 0.7 }]}
          onPress={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.payButtonText, { color: colors.background }]}>Güvenli Ödeme Yap</Text>
          )}
        </TouchableOpacity>
      </View>

      {feedback && (
        <Animated.View style={[styles.feedbackOverlay, { opacity: fadeAnim, backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[styles.feedbackContent, { backgroundColor: colors.card }]}>
            <Ionicons 
              name={feedback.type === 'success' ? 'checkmark-circle' : (feedback.type === 'warning' ? 'warning' : 'alert-circle')} 
              size={54} 
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
  );
};

export default CheckoutScreen;

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
  artSummary: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  productImage: { width: 80, height: 80, borderRadius: 16 },
  productDetails: { marginLeft: 20, flex: 1 },
  productTitle: { fontSize: 18, fontWeight: '700' },
  productCategory: { fontSize: 14, marginTop: 4, opacity: 0.7 },
  costSection: { marginBottom: 32 },
  sectionLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7 },
  costCard: {
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  costLabel: { fontSize: 15 },
  costValue: { fontSize: 15, fontWeight: '600' },
  divider: { height: 1, marginVertical: 20, opacity: 0.1 },
  totalLabel: { fontSize: 17, fontWeight: 'bold' },
  totalValue: { fontSize: 22, fontWeight: '700' },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    gap: 16,
    backgroundColor: 'rgba(76, 217, 100, 0.05)',
    borderRadius: 20,
  },
  secureTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  secureText: { fontSize: 13, lineHeight: 18 },
  footer: { paddingHorizontal: 24 },
  payButton: {
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
  payButtonText: { fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
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
