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
import { auth } from '../firebase';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator<RootStackParamList>();
const FavoritesStack = createNativeStackNavigator<RootStackParamList>();
const ProfileStack = createNativeStackNavigator<RootStackParamList>();
const InboxStack = createNativeStackNavigator<RootStackParamList>();

// HOME STACK
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Main" component={HomeScreen} />
      <HomeStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <HomeStack.Screen name="OtherProfile" component={OtherProfileScreen} />
      <HomeStack.Screen name="Profile" component={ProfileScreen} />
    </HomeStack.Navigator>
  );
}

// FAVORITES STACK
function FavoritesStackNavigator() {
  return (
    <FavoritesStack.Navigator screenOptions={{ headerShown: false }}>
      {/* RootStackParamList'e eklediğimiz "Favorites" */}
      <FavoritesStack.Screen name="Favorites" component={FavoritesScreen} />
      <FavoritesStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <FavoritesStack.Screen name="OtherProfile" component={OtherProfileScreen} />
    </FavoritesStack.Navigator>
  );
}

// PROFILE STACK
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <ProfileStack.Screen name="OtherProfile" component={OtherProfileScreen} />
    </ProfileStack.Navigator>
  );
}

// INBOX STACK
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

// MAIN TAB
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

  if (loading) return null;
  if (!currentUser) return null;

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
        name="FavoritesTab"
        component={FavoritesStackNavigator}
        options={{
          headerShown: false,
          tabBarLabel: 'Favorites',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
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

      {/*
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
      */}
    </Tab.Navigator>
  );
}
