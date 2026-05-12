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
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ScrollView,
  Keyboard,
  Easing,
  StatusBar,
  Image,
} from 'react-native';
import { signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from '@react-native-firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth, db } from '../firebaseConfig';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../routes/types';
import { useThemeContext } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const { width, height } = Dimensions.get('window');


type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { colors } = useThemeContext();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '955753428630-5rk8spap7hc4biqhintbqnl8tq832pkf.apps.googleusercontent.com',
    });
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;

      if (!idToken) throw new Error('Google ID Token bulunamadı.');

      const googleCredential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, googleCredential);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnapshot = await getDoc(userDocRef);

      if (!userDocSnapshot.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          fullName: user.displayName || 'Unnamed User',
          username: user.email?.split('@')[0] || 'user_' + user.uid.substring(0, 5),
          profilePicture: user.photoURL || '',
          bio: '',
          followersCount: 0,
          followingCount: 0,
          createdAt: serverTimestamp(),
        });
      }

      navigation.replace('Main');
    } catch (error: any) {
      if (error.code !== 'SIGN_IN_CANCELLED') {
        setErrorMessage(t('signInWithGoogle') + ': ' + (error.message || error.toString()));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => setIsPasswordVisible(!isPasswordVisible);

  const handleLogin = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage(t('invalidEmail'));
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigation.replace('Main');
    } catch (error: any) {
      const message = error.message || t('loginError');
      setErrorMessage(message);
      Alert.alert(t('loginError'), message);
    } finally {
      setIsLoading(false);
    }
  };

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

  const sharedProps = {
    email, setEmail, password, setPassword, isPasswordVisible,
    togglePasswordVisibility, handleLogin, handleGoogleLogin,
    isLoading, errorMessage, navigation, translateX, translateY, scaleAnim, t,
  };

  if (Platform.OS === 'ios') return <IOSLoginScreen {...sharedProps} insets={insets} />;
  return <AndroidLoginScreen {...sharedProps} insets={insets} />;
};

const LoginCard = ({ email, setEmail, password, setPassword, isPasswordVisible, togglePasswordVisibility, handleLogin, handleGoogleLogin, isLoading, errorMessage, navigation, t }: any) => (
  <>
    <Text style={styles.title}>{t('loginTitle')}</Text>
    <Text style={styles.subtitle}>{t('loginSubtitle')}</Text>

    <View style={styles.inputContainer}>
      <View style={styles.inputWrapper}>
        <MaterialIcons name="mail" size={20} color="#0A0A0A" style={styles.icon} />
        <TextInput
          placeholder={t('emailPlaceholder')}
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
          style={styles.textInput}
        />
      </View>

      <View style={styles.inputWrapper}>
        <MaterialIcons name="lock" size={20} color="#0A0A0A" style={styles.icon} />
        <TextInput
          placeholder={t('passwordPlaceholder')}
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={handleLogin}
          secureTextEntry={!isPasswordVisible}
          returnKeyType="done"
          style={styles.textInput}
        />
        <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeButton}>
          <MaterialIcons name={isPasswordVisible ? 'visibility' : 'visibility-off'} size={20} color="#0A0A0A" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.forgotPasswordButton} onPress={() => navigation.navigate('PasswordReset')}>
        <Text style={styles.forgotPasswordText}>{t('forgotPassword')}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleLogin} disabled={isLoading}>
        <View style={styles.loginButton}>
          <Text style={styles.loginButtonText}>{isLoading ? t('loginButtonLoading') : t('loginButton')}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity onPress={handleGoogleLogin} disabled={isLoading} style={{ marginTop: 12 }}>
        <View style={styles.googleButton}>
          <Image source={require('../assets/google_g_logo.png')} style={{ width: 22, height: 22, marginRight: 12 }} />
          <Text style={styles.googleButtonText}>{t('signInWithGoogle')}</Text>
        </View>
      </TouchableOpacity>

      {errorMessage ? (
        <View style={styles.errorMessageContainer}>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.registerContainer}>
        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.registerText}>
            {t('noAccount')}
            <Text style={styles.registerLink}>{t('signUpLink')}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </>
);

const IOSLoginScreen = ({ translateX, translateY, scaleAnim, insets, ...rest }: any) => (
  <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Animated.Image
        source={require('../assets/Edward_Hooper.png')}
        style={[styles.backgroundImage, { transform: [{ translateX }, { translateY }, { scale: scaleAnim }] }]}
        resizeMode="cover"
      />
      <View style={styles.overlay} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <LoginCard {...rest} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  </TouchableWithoutFeedback>
);

const AndroidLoginScreen = ({ translateX, translateY, scaleAnim, insets, ...rest }: any) => {
  const translateYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardShow = Keyboard.addListener('keyboardDidShow', (e) => {
      Animated.timing(translateYAnim, { toValue: -e.endCoordinates.height * 1.1, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    });
    const keyboardHide = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(translateYAnim, { toValue: 0, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    });
    return () => { keyboardShow.remove(); keyboardHide.remove(); };
  }, []);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Animated.Image
          source={require('../assets/Edward_Hooper.png')}
          style={[styles.backgroundImage, { transform: [{ translateX }, { translateY }, { scale: scaleAnim }] }]}
          resizeMode="cover"
        />
        <View style={styles.overlay} />
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.cardContainer, { transform: [{ translateY: translateYAnim }] }]}>
            <View style={styles.card}>
              <LoginCard {...rest} />
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default LoginScreen;

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
  eyeButton: { paddingHorizontal: 5 },
  loginButton: { backgroundColor: '#333333', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 3 },
  loginButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  errorMessageContainer: { justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  errorMessage: { color: '#FF3B30', fontSize: 13 },
  registerContainer: { justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  registerText: { fontSize: 14, color: '#0A0A0A' },
  registerLink: { fontWeight: 'bold', color: '#333333' },
  forgotPasswordButton: { alignSelf: 'flex-end', marginTop: 4, marginBottom: 0 },
  forgotPasswordText: { color: '#333333', fontSize: 14, fontWeight: 'bold' },
  googleButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  googleButtonText: { color: '#333333', fontSize: 16, fontWeight: '600' },
});