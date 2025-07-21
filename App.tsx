import 'react-native-gesture-handler';
import React from 'react';
import 'react-native-get-random-values';
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
import EditProfileScreen from './screens/EditProfileScreen';
import MainTabNavigator from './navigators/MainTabNavigator';
import UserProfileScreen from './screens/UserProfileScreen';
import UpdateProductScreen from './screens/UpdateProductScreen';
import ChangeEmailAndPasswordScreen from './screens/ChangeEmailAndPasswordScreen';
import AboutScreen from './screens/AboutScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import TermsOfUseScreen from './screens/TermsOfUseScreen';
import PrivacyFollowerCommentSettingsScreen from './screens/PrivacyFollowerCommentSettingsScreen';
import ChatScreen from './screens/ChatScreen';

import { RootStackParamList } from './routes/types';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { ThemeProvider } from './contexts/ThemeContext'; // ✅ Eklendi

// Firebase'i initialize etmek için içeri aktarıyoruz (tek seferlik tetiklenir)
import './firebase';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
      <FavoritesProvider>
        <ThemeProvider>
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
              />
              <Stack.Screen
                name="Following"
                component={FollowingScreen}
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
                name="UserProfile"
                component={UserProfileScreen}
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
              <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
              />
              <Stack.Screen
                name="ChangeEmailAndPassword"
                component={ChangeEmailAndPasswordScreen}
              />
              <Stack.Screen
                name="About"
                component={AboutScreen}
              />
              <Stack.Screen
                name="PrivacyPolicy"
                component={PrivacyPolicyScreen}
              />
              <Stack.Screen
                name="TermsOfService"
                component={TermsOfUseScreen}
              />
              <Stack.Screen
                name="PrivacyFollowerCommentSettings"
                component={PrivacyFollowerCommentSettingsScreen}
              />
              <Stack.Screen
                name="ChatScreen"
                component={ChatScreen}
                options={{ title: 'Chat' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </ThemeProvider>
      </FavoritesProvider>
  );
}
