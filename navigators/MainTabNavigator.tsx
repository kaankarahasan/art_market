import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../firebase';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
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
      <HomeStack.Screen 
        name="Search" 
        component={SearchScreen}
        options={{
          animation: 'slide_from_right',
          animationTypeForReplace: 'push',
          presentation: 'card',
        }}
      />
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

// MAIN TAB WITH SAFE AREA
function MainTabNavigatorContent() {
  const insets = useSafeAreaInsets();
  const iconColor = '#333333';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E8E8E8',
          borderTopWidth: 1,
          // Güçlü gölgelendirme
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          // Otomatik margin ve yükseklik
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: iconColor,
        tabBarInactiveTintColor: iconColor,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={{ 
              fontSize: 12, 
              marginTop: 4, 
              fontWeight: focused ? '800' : 'normal',
              color: iconColor 
            }}>
              Home
            </Text>
          ),
          tabBarIcon: ({ focused, size }) =>
            focused ? (
              <Ionicons name="home" size={size} color={iconColor} />
            ) : (
              <Ionicons name="home-outline" size={size} color={iconColor} />
            ),
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesStackNavigator}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={{ 
              fontSize: 12, 
              marginTop: 4, 
              fontWeight: focused ? '800' : 'normal',
              color: iconColor 
            }}>
              Favorites
            </Text>
          ),
          tabBarIcon: ({ focused, size }) =>
            focused ? (
              <Ionicons name="heart" size={size} color={iconColor} />
            ) : (
              <Ionicons name="heart-outline" size={size} color={iconColor} />
            ),
        }}
      />
      <Tab.Screen
        name="InboxTab"
        component={InboxStackNavigator}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={{ 
              fontSize: 12, 
              marginTop: 4, 
              fontWeight: focused ? '800' : 'normal',
              color: iconColor 
            }}>
              Inbox
            </Text>
          ),
          tabBarIcon: ({ focused, size }) =>
            focused ? (
              <Ionicons name="mail" size={size} color={iconColor} />
            ) : (
              <Ionicons name="mail-outline" size={size} color={iconColor} />
            ),
        }}
      />
    </Tab.Navigator>
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

  return <MainTabNavigatorContent />;
}