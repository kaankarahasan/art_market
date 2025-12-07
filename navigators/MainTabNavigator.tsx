import React, { useEffect, useState } from 'react';
import { View, Text, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useThemeContext } from '../contexts/ThemeContext';

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
      <HomeStack.Screen name="Search" component={SearchScreen} />
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
function MainTabNavigatorContent({ userData }: { userData: any }) {
  const insets = useSafeAreaInsets();
  const { colors, isDarkTheme } = useThemeContext(); // Tema renklerini al

  // İkon rengi artık temadan geliyor
  const iconColor = colors.text;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarBackground: () => <View style={{ backgroundColor: colors.background, flex: 1 }} />,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: colors.background,
          borderTopColor: isDarkTheme ? '#333' : '#F4F4F4', // Sınır rengini de temaya göre ayarla
          borderTopWidth: 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 6,
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
            <Text style={{ fontSize: 12, marginTop: 4, fontWeight: focused ? '800' : 'normal', color: iconColor }}>Home</Text>
          ),
          tabBarIcon: ({ focused, size }) =>
            focused ? <Ionicons name="home" size={size} color={iconColor} />
              : <Ionicons name="home-outline" size={size} color={iconColor} />,
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesStackNavigator}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={{ fontSize: 12, marginTop: 4, fontWeight: focused ? '800' : 'normal', color: iconColor }}>Favorites</Text>
          ),
          tabBarIcon: ({ focused, size }) =>
            focused ? <Ionicons name="heart" size={size} color={iconColor} />
              : <Ionicons name="heart-outline" size={size} color={iconColor} />,
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={{ fontSize: 12, marginTop: 4, fontWeight: focused ? '800' : 'normal', color: iconColor }}>Search</Text>
          ),
          tabBarIcon: ({ focused, size }) =>
            focused ? <Ionicons name="search" size={30} color={iconColor} />
              : <Ionicons name="search-outline" size={30} color={iconColor} />,
        }}
      />
      <Tab.Screen
        name="InboxTab"
        component={InboxStackNavigator}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={{ fontSize: 12, marginTop: 4, fontWeight: focused ? '800' : 'normal', color: iconColor }}>Inbox</Text>
          ),
          tabBarIcon: ({ focused, size }) =>
            focused ? <Ionicons name="mail" size={size} color={iconColor} />
              : <Ionicons name="mail-outline" size={size} color={iconColor} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text style={{ fontSize: 12, marginTop: 4, fontWeight: focused ? '800' : 'normal', color: iconColor }}>Profile</Text>
          ),
          tabBarIcon: ({ focused, size }) => {
            const borderWidth = focused ? 2 : 0;
            const iconSize = size - borderWidth * 2; // border içeriye doğru
            return (
              <View
                style={{
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  overflow: 'hidden',
                  borderWidth: borderWidth,
                  borderColor: iconColor, // Border rengi de dinamik
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Image
                  source={userData?.photoURL ? { uri: userData.photoURL } : require('../assets/default-avatar.png')}
                  style={{ width: iconSize, height: iconSize, borderRadius: iconSize / 2 }}
                />
              </View>
            );
          },
        }}
      />
    </Tab.Navigator>
  );
}

// MAIN TAB EXPORT
export default function MainTabNavigator() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setUserData(null);
        setLoading(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        setUserData(userDoc.exists() ? userDoc.data() : null);
      } catch (e) {
        console.error('Kullanıcı verisi alınamadı:', e);
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  if (loading) return null;
  if (!userData) return null;

  return <MainTabNavigatorContent userData={userData} />;
}
