import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import BottomTabNavigator from './navigation/BottomTabNavigator';
import AppNavigator from './navigators/MainTabNavigator';
import MainTabNavigator from './navigators/MainTabNavigator';
import { FavoritesProvider } from './contexts/FavoritesContext';
import FollowersScreen from './screens/FollowersScreen';
import FollowingScreen from './screens/FollowingScreen';
import SoldScreen from './screens/SoldScreen';
import SignUpScreen from './screens/SignUpScreen';
import CompleteProfileScreen from './screens/CompleteProfileScreen';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen'; // Yeni ekledik

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Followers: undefined;
  Following: undefined;
  Sold: undefined;
  SignUp: undefined;
  CompleteProfile: undefined;
  Home: undefined;
  Settings: undefined; // Buraya da ekledik
  ProductDetail: {
    product: {
      id: string;
      title: string;
      image: string;
      seller?: string;
      description?: string;
    };
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <FavoritesProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ProductDetail"
            component={ProductDetailScreen}
            options={{ title: 'Product Detail' }}
          />
          <Stack.Screen
            name="Followers"
            component={FollowersScreen}
            options={{ title: 'Followers' }}
          />
          <Stack.Screen
            name="Following"
            component={FollowingScreen}
            options={{ title: 'Following' }}
          />
          <Stack.Screen
            name="Sold"
            component={SoldScreen}
            options={{ title: 'Sold Products' }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CompleteProfile"
            component={CompleteProfileScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Settings' }} // Başlığı "Settings" yapıyoruz
          />
        </Stack.Navigator>
      </NavigationContainer>
    </FavoritesProvider>
  );
}
