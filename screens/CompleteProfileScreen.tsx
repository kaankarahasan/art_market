import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

type RootStackParamList = {
  Home: undefined;
  CompleteProfile: undefined;
};

type CompleteProfileScreenProp = NativeStackNavigationProp<RootStackParamList, 'CompleteProfile'>;

const CompleteProfileScreen = () => {
  const navigation = useNavigation<CompleteProfileScreenProp>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');

  const handleSaveProfile = async () => {
    if (!firstName || !lastName || !username) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);

        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          firstName: firstName,
          lastName: lastName,
          username: username,
          createdAt: new Date(),
        });

        Alert.alert('Success', 'Profile completed successfully!');
        navigation.navigate('Home');
      } else {
        Alert.alert('Error', 'User not found.');
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complete Your Profile</Text>
      <Text style={styles.subtitle}>Tell us a bit about yourself.</Text>

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="First Name"
            onChangeText={setFirstName}
            value={firstName}
          />
        </View>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            placeholder="Last Name"
            onChangeText={setLastName}
            value={lastName}
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
      </View>

      <TouchableOpacity onPress={handleSaveProfile}>
        <View style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save Profile</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default CompleteProfileScreen;

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
  subtitle: {
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
  saveButton: {
    backgroundColor: '#456FE8',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
  },
});
