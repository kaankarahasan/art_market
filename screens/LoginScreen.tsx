import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeContext } from '../contexts/ThemeContext';

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

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const handleLogin = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setErrorMessage('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      Alert.alert('Giriş Başarılı', `Hoş geldin, ${userCredential.user.email}`);
      navigation.replace('Main');

    } catch (error: any) {
      console.log(error);
      const message = error.message || 'Giriş yapılamadı.';
      setErrorMessage(message);
      Alert.alert('Giriş Hatası', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View>
        <Text style={[styles.title, { color: colors.text }]}>Login</Text>
      </View>
      <View>
        <Text style={[styles.titleLogin, { color: colors.text }]}>Please login to continue.</Text>
      </View>
      <View style={styles.inputContainer}>
        <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <MaterialIcons
            name="mail"
            size={20}
            color={colors.text}
            style={styles.icon}
          />
          <TextInput
            placeholder="Email"
            placeholderTextColor={colors.border}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={[styles.textInput, { color: colors.text }]}
          />
        </View>
        <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <MaterialIcons
            name="lock"
            size={20}
            color={colors.text}
            style={styles.icon}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor={colors.border}
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
            secureTextEntry={!isPasswordVisible}
            style={[styles.textInput, { color: colors.text }]}
          />
          <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeButton}>
            <MaterialIcons
              name={isPasswordVisible ? 'visibility' : 'visibility-off'}
              size={20}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.registerContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={[styles.registerText, { color: colors.text }]}>
              Don’t have an account?{' '}
              <Text style={[styles.registerLink, { color: colors.primary }]}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleLogin} disabled={isLoading}>
          <View style={[styles.loginButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.errorMessageContainer}>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
        </View>
      </View>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 25,
    fontWeight: '600',
  },
  titleLogin: {
    fontSize: 15,
    marginTop: 10,
  },
  inputContainer: {
    width: '80%',
    marginTop: 20,
    gap: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderWidth: 0.5,
    borderRadius: 5,
  },
  textInput: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  icon: {
    marginRight: 10,
  },
  eyeButton: {
    paddingHorizontal: 5,
  },
  registerContainer: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  registerText: {
    fontSize: 14,
  },
  registerLink: {
    fontWeight: '600',
  },
  loginButton: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 15,
  },
  errorMessageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  errorMessage: {
    color: 'red',
  },
});
