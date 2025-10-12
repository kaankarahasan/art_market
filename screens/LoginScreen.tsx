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
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeContext } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  SignUp: undefined;
  ProductDetail: {
    product: { id: string; title: string; image: string; seller?: string; description?: string };
  };
};

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { colors } = useThemeContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const togglePasswordVisibility = () => setIsPasswordVisible(!isPasswordVisible);

  const handleLogin = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setErrorMessage('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      Alert.alert('Giriş Başarılı', `Hoş geldin, ${userCredential.user.email}`);
      navigation.replace('Main');
    } catch (error: any) {
      const message = error.message || 'Giriş yapılamadı.';
      setErrorMessage(message);
      Alert.alert('Giriş Hatası', message);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 Arka plan animasyonu
  const moveAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(moveAnim, {
            toValue: 1,
            duration: 15000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 15000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(moveAnim, {
            toValue: 0,
            duration: 15000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 15000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  const translateX = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-15, 15],
  });

  const translateY = moveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 10],
  });

  // 🔹 Klavye açılış/kapanış animasyonu
  useEffect(() => {
    const keyboardShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const keyboardHeight = e.endCoordinates?.height ?? 0;
        const offset = keyboardHeight + 20; // 🔹 ekstra padding ile yukarı kaydır
        Animated.timing(translateYAnim, {
          toValue: -offset,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }
    );

    const keyboardHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }
    );

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

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.cardContainer,
                { transform: [{ translateY: translateYAnim }] },
              ]}
            >
              <View style={styles.card}>
                <Text style={styles.title}>Login</Text>
                <Text style={styles.subtitle}>Please login to continue.</Text>

                <View style={styles.inputContainer}>
                  <View style={styles.inputWrapper}>
                    <MaterialIcons name="mail" size={20} color="#0A0A0A" style={styles.icon} />
                    <TextInput
                      placeholder="Email"
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
                      placeholder="Password"
                      placeholderTextColor="#999"
                      value={password}
                      onChangeText={setPassword}
                      onSubmitEditing={handleLogin}
                      secureTextEntry={!isPasswordVisible}
                      returnKeyType="done"
                      style={styles.textInput}
                    />
                    <TouchableOpacity
                      onPress={togglePasswordVisibility}
                      style={styles.eyeButton}
                    >
                      <MaterialIcons
                        name={isPasswordVisible ? 'visibility' : 'visibility-off'}
                        size={20}
                        color="#0A0A0A"
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={handleLogin} disabled={isLoading}>
                    <View style={styles.loginButton}>
                      <Text style={styles.loginButtonText}>
                        {isLoading ? 'Logging in...' : 'Login'}
                      </Text>
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
                        Don't have an account?{' '}
                        <Text style={styles.registerLink}>Sign Up</Text>
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
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

  cardContainer: {
    justifyContent: 'flex-end',
    flex: 1,
    padding: 20,
  },

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
});
