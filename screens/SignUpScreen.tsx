import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  SignUp: undefined;
};

type SignUpScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SignUp'
>;

const SignUpScreen = () => {
  const navigation = useNavigation<SignUpScreenNavigationProp>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const handleSignUp = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setErrorMessage('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      Alert.alert('Kayıt Başarılı', `Hoş geldin, ${userCredential.user.email}`);
      navigation.replace('Main');
    } catch (error: any) {
      const message = error.message || 'Kayıt işlemi başarısız.';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.title}>Sign Up</Text>
      </View>
      <View>
        <Text style={styles.titleLogin}>Create a new account.</Text>
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
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.registerText}>
              Already have an account?{' '}
              <Text style={styles.registerLink}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleSignUp}>
          <View style={styles.loginButton}>
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Creating...' : 'Sign Up'}
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

export default SignUpScreen;

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
