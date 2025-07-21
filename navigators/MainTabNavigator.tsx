import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OtherProfileScreen from '../screens/OtherProfileScreen';
import InboxScreen from '../screens/InboxScreen';
import ChatScreen from '../screens/ChatScreen';
import { RootStackParamList } from '../routes/types';
import { Ionicons } from '@expo/vector-icons';

import { auth } from '../firebase'; // Firebase auth import

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator<RootStackParamList>();
const ProfileStack = createNativeStackNavigator<RootStackParamList>();
const InboxStack = createNativeStackNavigator<RootStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Main"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ headerShown: true }}
      />
      <HomeStack.Screen
        name="OtherProfile"
        component={OtherProfileScreen}
        options={{ headerShown: true }}
      />
      <HomeStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: true }}
      />
    </HomeStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: true }}
      />
      <ProfileStack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ headerShown: true }}
      />
      <ProfileStack.Screen
        name="OtherProfile"
        component={OtherProfileScreen}
        options={{ headerShown: true }}
      />
    </ProfileStack.Navigator>
  );
}

function InboxStackNavigator() {
  return (
    <InboxStack.Navigator>
      <InboxStack.Screen
        name="InboxScreen"
        component={InboxScreen}
        options={{ headerShown: true, title: 'Inbox' }}
      />
      <InboxStack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{ headerShown: true, title: 'Sohbet' }}
      />
    </InboxStack.Navigator>
  );
}

export default function MainTabNavigator() {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    // İstersen burada bir Loading spinner gösterebilirsin
    return null;
  }

  if (!currentUser) {
    // Kullanıcı giriş yapmamışsa boş ekran ya da yönlendirme yapılabilir
    return null;
  }

  return (
    <Tab.Navigator>
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          headerShown: false,
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="InboxTab"
        component={InboxStackNavigator}
        options={{
          headerShown: false,
          tabBarLabel: 'Inbox',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mail-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'Favorites',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          headerShown: false,
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
