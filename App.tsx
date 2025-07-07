import 'react-native-gesture-handler';
import React from 'react';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import FollowersScreen from './screens/FollowersScreen';
import FollowingScreen from './screens/FollowingScreen';
import SoldScreen from './screens/SoldScreen';
import SettingsScreen from './screens/SettingsScreen';
import ProfileScreen from './screens/ProfileScreen';
import OtherProfileScreen from './screens/OtherProfileScreen';
import AddProductScreen from './screens/AddProductScreen';

import MainTabNavigator from './navigators/MainTabNavigator';
import { FavoritesProvider } from './contexts/FavoritesContext';

// Firebase'i initialize etmek için içeri aktarıyoruz (tek seferlik tetiklenir)
import './firebase';
import UserProfileScreen from './UserProfileScreen';
import UpdateProductScreen from './screens/UpdateProductScreen';
import { Product } from './types';

// Parametreler için tipleri tanımlıyoruz
export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Main: undefined;
  Profile: { userId?: string };
  Followers: undefined;
  Following: undefined;
  Sold: undefined;
  Settings: undefined;
  AddProduct: undefined;
  UpdateProduct: { product: Product };
  OtherProfile: { userId: string };
  ProductDetail: { product: Product };
  UserProfile: { user: any };  // UserProfile ekranını ve parametrelerini ekliyoruz
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
            name="SignUp"
            component={SignUpScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ headerShown: false }}
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
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
          <Stack.Screen
            name="ProductDetail"
            component={ProductDetailScreen}
            options={{ title: 'Product Detail' }}
          />
          <Stack.Screen
            name="UserProfile"  // Bu satırı ekliyoruz
            component={UserProfileScreen}  // Bu ekranı daha sonra oluşturacağız
            options={{ title: 'User Profile' }}
          />
          <Stack.Screen
            name="OtherProfile"
            component={OtherProfileScreen}
            options={{ title: 'Other Profile' }}
          />
          <Stack.Screen
            name="AddProduct"
            component={AddProductScreen}
            options={{ title: 'Add Product' }}
          />
          <Stack.Screen
            name="UpdateProduct"
            component={UpdateProductScreen}
            options={{ title: 'Update Product' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </FavoritesProvider>
  );
}
