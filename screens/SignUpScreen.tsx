import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

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

  const handleSignUp = async () => {
    if (!email || !password || !fullName || !username) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        fullName: fullName,
        username: username,
        profilePicture: '',       // default boş fotoğraf
        bio: '',                  // başlangıçta boş bio
        followersCount: 0,
        followingCount: 0,
        createdAt: serverTimestamp(), // firebase timestamp
      });

      Alert.alert('Success', 'Account created and profile saved!');
      navigation.navigate('Main');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>
      <Text style={styles.titleLogin}>Create a new account.</Text>

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="Full Name"
            onChangeText={setFullName}
            value={fullName}
          />
        </View>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="Username"
            autoCapitalize="none"
            onChangeText={setUsername}
            value={username}
          />
        </View>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="Email"
            autoCapitalize="none"
            onChangeText={setEmail}
            value={email}
          />
        </View>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="Password"
            secureTextEntry
            onChangeText={setPassword}
            value={password}
          />
        </View>
      </View>

      <TouchableOpacity onPress={handleSignUp}>
        <View style={styles.signUpButton}>
          <Text style={styles.signUpButtonText}>Sign Up</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.registerContainer}>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.registerText}>
            Already have an account? <Text style={styles.registerLink}>Log in</Text>
          </Text>
        </TouchableOpacity>
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
  signUpButton: {
    backgroundColor: '#456FE8',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 15,
  },
  registerContainer: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    marginTop: 20,
  },
  registerText: {
    color: '#5F5F5F',
  },
  registerLink: {
    color: '#456FE8',
    fontWeight: '600',
  },
});
