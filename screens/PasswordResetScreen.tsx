import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
  Keyboard,
  Easing,
} from 'react-native';
// Sadece 'sendPasswordResetEmail' yeterli
import { sendPasswordResetEmail } from 'firebase/auth'; 
import { auth } from '../firebase'; 
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
// Merkezi tiplerinizi import ettiğinizi varsayıyorum
import type { RootStackParamList } from '../routes/types'; 

const { width, height } = Dimensions.get('window');

// Navigasyon tip tanımı (artık 'oobCode' parametresine gerek yok)
type PasswordResetScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PasswordReset'
>;

const PasswordResetScreen = () => {
  const navigation = useNavigation<PasswordResetScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 🔹 Şifre sıfırlama fonksiyonu (Basitleştirilmiş)
  const handlePasswordReset = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('Lütfen geçerli bir e-posta adresi girin.');
      setSuccessMessage('');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Sadece 'auth' ve 'email' gönderiyoruz.
      // 'actionCodeSettings' göndermeyince Firebase varsayılan web akışını kullanır.
      await sendPasswordResetEmail(auth, email);
      
      setSuccessMessage('Şifre sıfırlama e-postası gönderildi. Lütfen gelen kutunuzu (ve spam klasörünü) kontrol edin.');
      setEmail(''); // Başarılı olunca input'u temizle
    } catch (error: any) {
      let friendlyMessage = 'Bir hata oluştu. Lütfen tekrar deneyin.';
      if (error.code === 'auth/user-not-found') {
        friendlyMessage = 'Bu e-posta adresine kayıtlı bir kullanıcı bulunamadı.';
      }
      setErrorMessage(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 Arka plan animasyonu (Değişiklik yok)
  const moveAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(moveAnim, { toValue: 1, duration: 15000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1.2, duration: 15000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(moveAnim, { toValue: 0, duration: 15000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 15000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  const translateX = moveAnim.interpolate({ inputRange: [0, 1], outputRange: [-15, 15] });
  const translateY = moveAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] });

  // 🔹 Klavye animasyonu (Değişiklik yok)
  const translateYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardShow = Keyboard.addListener('keyboardDidShow', (e) => {
      Animated.timing(translateYAnim, {
        toValue: -e.endCoordinates.height * 0.9, 
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });

    const keyboardHide = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });

    return () => {
      keyboardShow.remove();
      keyboardHide.remove();
    };
  }, []);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Animated.Image
          source={require('../assets/Edward_Hooper.png')}
          style={[
            styles.backgroundImage,
            { transform: [{ translateX }, { translateY }, { scale: scaleAnim }] },
          ]}
          resizeMode="cover"
        />
        <View style={styles.overlay} />

        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.cardContainer, 
              { transform: [{ translateY: translateYAnim }] }
            ]}
          >
            {/* Artık "MOD" kontrolüne gerek yok.
              Ekran her zaman e-posta isteme formunu gösterecek.
            */}
            <View style={styles.card}>
              
              {/* Geri Dön Butonu */}
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <MaterialIcons name="arrow-back" size={24} color="#0A0A0A" />
              </TouchableOpacity>

              <Text style={styles.title}>Şifre Sıfırla</Text>
              <Text style={styles.subtitle}>Sıfırlama linki için e-postanızı girin.</Text>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="mail" size={20} color="#0A0A0A" style={styles.icon} />
                  <TextInput
                    placeholder="Email"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="done"
                    onSubmitEditing={handlePasswordReset}
                    style={styles.textInput}
                  />
                </View>

                <TouchableOpacity onPress={handlePasswordReset} disabled={isLoading}>
                  <View style={styles.loginButton}>
                    <Text style={styles.loginButtonText}>
                      {isLoading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Hata Mesajı */}
                {errorMessage ? (
                  <View style={styles.errorMessageContainer}>
                    <Text style={styles.errorMessage}>{errorMessage}</Text>
                  </View>
                ) : null}

                {/* Başarı Mesajı */}
                {successMessage ? (
                  <View style={styles.successMessageContainer}>
                    <Text style={styles.successMessage}>{successMessage}</Text>
                  </View>
                ) : null}

                {/* "Giriş Ekranına Dön" butonu kaldırıldı. */}
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default PasswordResetScreen;

// Stiller (Değişiklik yok, sadece 'registerContainer' artık kullanılmıyor)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backgroundImage: {
    position: 'absolute',
    width: width * 1.4,
    height: height * 1.4,
    top: -height * 0.2,
    left: -width * 0.2,
  },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  cardContainer: { justifyContent: 'flex-end', flex: 1, padding: 20 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 8,
    zIndex: 10,
  },
  title: { fontSize: 30, fontWeight: 'bold', color: '#0A0A0A', marginBottom: 6, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#0A0A0A', marginBottom: 26, textAlign: 'center', opacity: 0.7 },
  inputContainer: { width: '100%', gap: 14 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textInput: { flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 15, color: '#0A0A0A' },
  icon: { marginRight: 10 },
  loginButton: { backgroundColor: '#333333', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 3 },
  loginButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  errorMessageContainer: { 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 5,
    padding: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
  },
  errorMessage: { 
    color: '#FF3B30', 
    fontSize: 14,
    textAlign: 'center',
  },
  successMessageContainer: {
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 5,
    padding: 10,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 8,
  },
  successMessage: {
    color: '#34C759', 
    fontSize: 14,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  // Bu stiller artık kullanılmıyor ama zararı da yok
  registerContainer: { justifyContent: 'center', alignItems: 'center', marginTop: 15, borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingTop: 20},
  registerText: { 
    fontSize: 14, 
    fontWeight: 'bold',
    color: '#333333',
  },
});