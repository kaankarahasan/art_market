// MainTabNavigator.tsx
import React, { useEffect, useState } from 'react';
import { Text, Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebase';

import HomeScreen from '../screens/HomeScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import InboxScreen from '../screens/InboxScreen';
import ChatScreen from '../screens/ChatScreen';
import OtherProfileScreen from '../screens/OtherProfileScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const FavoritesStack = createNativeStackNavigator();
const InboxStack = createNativeStackNavigator();

// HOME STACK
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <HomeStack.Screen name="Profile" component={ProfileScreen} />
      <HomeStack.Screen name="OtherProfile" component={OtherProfileScreen} />
    </HomeStack.Navigator>
  );
}

// FAVORITES STACK
function FavoritesStackNavigator() {
  return (
    <FavoritesStack.Navigator screenOptions={{ headerShown: false }}>
      <FavoritesStack.Screen name="Favorites" component={FavoritesScreen} />
      <FavoritesStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <FavoritesStack.Screen name="OtherProfile" component={OtherProfileScreen} />
    </FavoritesStack.Navigator>
  );
}

// INBOX STACK
function InboxStackNavigator() {
  return (
    <InboxStack.Navigator screenOptions={{ headerShown: false }}>
      <InboxStack.Screen name="Inbox" component={InboxScreen} />
      <InboxStack.Screen name="Chat" component={ChatScreen} />
      <InboxStack.Screen name="OtherProfile" component={OtherProfileScreen} />
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

  const iconColor = '#333333';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            borderTopColor: '#F4F4F4',
            borderTopWidth: StyleSheet.hairlineWidth,
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          },
        ],
        tabBarActiveTintColor: iconColor,
        tabBarInactiveTintColor: iconColor,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarIcon: ({ focused, size }) =>
            focused ? <Ionicons name="home" size={size} color={iconColor} /> : <Ionicons name="home-outline" size={size} color={iconColor} />,
          tabBarLabel: ({ focused }) => (
            <Text style={{ color: iconColor, fontWeight: focused ? 'bold' : 'normal' }}>Home</Text>
          ),
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesStackNavigator}
        options={{
          tabBarIcon: ({ focused, size }) =>
            focused ? <Ionicons name="heart" size={size} color={iconColor} /> : <Ionicons name="heart-outline" size={size} color={iconColor} />,
          tabBarLabel: ({ focused }) => (
            <Text style={{ color: iconColor, fontWeight: focused ? 'bold' : 'normal' }}>Favorites</Text>
          ),
        }}
      />
      <Tab.Screen
        name="InboxTab"
        component={InboxStackNavigator}
        options={{
          tabBarIcon: ({ focused, size }) =>
            focused ? <Ionicons name="mail" size={size} color={iconColor} /> : <Ionicons name="mail-outline" size={size} color={iconColor} />,
          tabBarLabel: ({ focused }) => (
            <Text style={{ color: iconColor, fontWeight: focused ? 'bold' : 'normal' }}>Inbox</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopColor: '#F4F4F4',
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
});
