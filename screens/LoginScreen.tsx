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
import { doc, getDoc } from 'firebase/firestore'; // Firestore ekledik
import { auth, db } from '../firebase'; // db'yi de import ettik
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// App.tsx dosyandaki stack yapısına göre bu tip tanımı vardır:
type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  SignUp: undefined;
  ProductDetail: {
    product: { id: string; title: string; image: string; seller?: string; description?: string };
  };
  CompleteProfile: undefined; // CompleteProfile ekranını da tiplere ekledik
};

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();

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
      const user = userCredential.user;

      // Firestore'da kullanıcının profil bilgisi var mı kontrol ediyoruz
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        // Kullanıcının profili tamamlanmış → Main'e yönlendir
        Alert.alert('Giriş Başarılı', `Hoş geldin, ${user.email}`);
        navigation.replace('Main');
      } else {
        // Kullanıcının profili eksik → CompleteProfile ekranına yönlendir
        navigation.replace('CompleteProfile');
      }
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
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>Login</Text>
      </View>
      <View>
        <Text style={styles.titleLogin}>Please login to continue.</Text>
      </View>
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <MaterialIcons
            name="mail"
            size={20}
            color="#9d9d9d"
            style={styles.icon}
          />
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.textInput}
          />
        </View>
        <View style={styles.inputWrapper}>
          <MaterialIcons
            name="lock"
            size={20}
            color="#9d9d9d"
            style={styles.icon}
          />
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleLogin}
            secureTextEntry={!isPasswordVisible}
            style={styles.textInput}
          />
          <TouchableOpacity onPress={togglePasswordVisibility}>
            <MaterialIcons
              name={isPasswordVisible ? 'visibility' : 'visibility-off'}
              size={20}
              color="#9d9d9d"
            />
          </TouchableOpacity>
        </View>
        <View style={styles.registerContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.registerText}>
              Don’t have an account?{' '}
              <Text style={styles.registerLink}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleLogin}>
          <View style={styles.loginButton}>
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
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#5F5F5F',
    fontSize: 25,
    fontWeight: '600',
  },
  titleLogin: {
    color: '#5F5F5F',
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
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    borderWidth: 0.2,
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
  registerContainer: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  registerText: {
    color: '#5F5F5F',
  },
  registerLink: {
    color: '#456FE8',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#456FE8',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 15,
  },
  errorMessageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorMessage: {
    color: 'red',
  },
});
