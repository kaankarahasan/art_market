import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  StatusBar,
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase'; // relative path
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

type SignUpScreenProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const SignUpScreen = () => {
  const navigation = useNavigation<SignUpScreenProp>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');

  // 🔹 Arka plan animasyon değerleri
  const moveAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1.1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(moveAnim, {
            toValue: 1,
            duration: 10000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.3,
            duration: 10000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(moveAnim, {
            toValue: 0,
            duration: 10000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 10000,
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

  const handleSignUp = async () => {
    if (!email || !password || !fullName || !username) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        fullName,
        username,
        profilePicture: '',
        bio: '',
        followersCount: 0,
        followingCount: 0,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Başarılı', 'Hesap oluşturuldu ve profil kaydedildi!');
      navigation.navigate('Main');
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        {/* 🔹 Dinamik arka plan */}
        <Animated.Image
          source={require('../assets/Edward_Hooper.png')}
          style={[
            styles.backgroundImage,
            {
              transform: [{ translateX }, { translateY }, { scale: scaleAnim }],
            },
          ]}
          resizeMode="cover"
        />

        {/* 🔹 Karartma efekti */}
        <View style={styles.overlay} />

        {/* 🔹 Klavye dinamik yapısı */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.cardContainer}>
              <View style={styles.card}>
                <Text style={styles.title}>Sign Up</Text>
                <Text style={styles.subtitle}>Create a new account.</Text>

                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Name Surname"
                    placeholderTextColor="#999"
                    onChangeText={setFullName}
                    value={fullName}
                    returnKeyType="next"
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="User Name"
                    placeholderTextColor="#999"
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    value={username}
                    returnKeyType="next"
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Email"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    value={email}
                    returnKeyType="next"
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Password"
                    placeholderTextColor="#999"
                    secureTextEntry
                    onChangeText={setPassword}
                    value={password}
                    returnKeyType="done"
                  />
                </View>

                <TouchableOpacity onPress={handleSignUp}>
                  <View style={styles.signUpButton}>
                    <Text style={styles.signUpButtonText}>Sign Up</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.registerContainer}>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.registerText}>
                      Do you already have an account?{' '}
                      <Text style={styles.registerLink}>Login</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default SignUpScreen;

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
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  cardContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: { fontSize: 30, fontWeight: 'bold', color: '#0A0A0A', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#0A0A0A', textAlign: 'center', opacity: 0.7, marginBottom: 25 },
  inputContainer: { width: '100%', gap: 16 },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#0A0A0A',
    fontSize: 15,
  },
  signUpButton: { backgroundColor: '#333333', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  signUpButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  registerContainer: { justifyContent: 'center', alignItems: 'center', marginTop: 15 },
  registerText: { fontSize: 14, color: '#0A0A0A' },
  registerLink: { fontWeight: 'bold', color: '#333333' },
});
