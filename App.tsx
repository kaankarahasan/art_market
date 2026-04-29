import 'fast-text-encoding';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'react-native';
import 'react-native-get-random-values';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import { auth } from './firebase';
import messaging from '@react-native-firebase/messaging';

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
import GeminiChatScreen from './screens/GeminiChatScreen';
import PasswordResetScreen from './screens/PasswordResetScreen';
import SearchScreen from './screens/SearchScreen';
import ViewInRoomScreen from './screens/ViewInRoomScreen';

import { RootStackParamList } from './routes/types';
import { FavoriteUsersProvider } from './contexts/FavoritesContext';
import { FavoriteItemsProvider } from './contexts/FavoritesContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';

// Firebase'i initialize etmek için içeri aktarıyoruz (tek seferlik tetiklenir)
import './firebase';

import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useThemeContext } from './contexts/ThemeContext';
import { fetchRemoteConfig } from './firebase';
import { saveFCMToken } from './utils/notificationService';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Bildirime tıklanınca navigasyon için global ref
const navigationRef = React.createRef<NavigationContainerRef<RootStackParamList>>();

// Bildirim data'sından chat ekranına git
function navigateToChat(data: any) {
  if (!data?.chatId || !data?.senderUserId || !data?.recipientUserId) return;
  try {
    navigationRef.current?.navigate('Chat', {
      currentUserId: data.recipientUserId,
      otherUserId: data.senderUserId,
    });
  } catch (e) {
    console.log('[FCM] Navigate hatası:', e);
  }
}

function AppContent() {
  const { isDarkTheme, colors } = useThemeContext();
  const theme = isDarkTheme ? DarkTheme : DefaultTheme;
  const [initializing, setInitializing] = React.useState(true);
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    fetchRemoteConfig();
    const subscriber = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      if (initializing) setInitializing(false);

      // Kullanıcı giriş yaptığında FCM token'ı kaydet
      if (usr?.uid) {
        saveFCMToken(usr.uid);
      }
    });
    return subscriber;
  }, [initializing]);

  React.useEffect(() => {
    // ─── Foreground mesajları (uygulama açıkken gelen bildirimler) ───────────
    // Foreground'da FCM otomatik bildirim göstermez; biz handle ederiz
    const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
      console.log('[FCM] Foreground mesaj:', remoteMessage.notification?.title);
      // Foreground'da bildirim göstermek için react-native'in Notification API'si yok,
      // FCM'nin onMessage'ı sadece data alır. Kullanıcı uygulamadaysa zaten görür.
      // Arka plan/kapalı durumda sistem tepsisi bildirimi gösterir.
    });

    // ─── Arka planda bildirime tıklanınca (uygulama arka planda açık) ────────
    const unsubscribeBackground = messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('[FCM] Arka planda bildirime tıklandı:', remoteMessage.data);
      if (remoteMessage.data) {
        navigateToChat(remoteMessage.data);
      }
    });

    // ─── Uygulama kapalıyken bildirime tıklanınca (quit state) ───────────────
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage?.data) {
          console.log('[FCM] Kapalıyken bildirime tıklandı:', remoteMessage.data);
          // Navigation hazır olana kadar kısa bir gecikme
          setTimeout(() => navigateToChat(remoteMessage.data), 1000);
        }
      });

    return () => {
      unsubscribeForeground();
      unsubscribeBackground();
    };
  }, []);

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={isDarkTheme ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <NavigationContainer theme={theme} ref={navigationRef}>
        <Stack.Navigator initialRouteName={user ? "Main" : "Login"} screenOptions={{ gestureEnabled: true, animation: 'slide_from_right' }}>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="SignUp" component={SignUpScreen} options={{ headerShown: false }} />
          <Stack.Screen name="PasswordReset" component={PasswordResetScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Main" component={MainTabNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Followers" component={FollowersScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Following" component={FollowingScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Sold" component={SoldScreen} options={{ title: 'Sold Products' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'User Profile' }} />
          <Stack.Screen name="OtherProfile" component={OtherProfileScreen} options={{ title: 'Other Profile' }} />
          <Stack.Screen name="AddProduct" component={AddProductScreen} options={{ headerShown: false }} />
          <Stack.Screen name="UpdateProduct" component={UpdateProductScreen} options={{ title: 'Update Product' }} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="ChangeEmailAndPassword" component={ChangeEmailAndPasswordScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
          <Stack.Screen name="TermsOfService" component={TermsOfUseScreen} />
          <Stack.Screen name="PrivacyFollowerCommentSettings" component={PrivacyFollowerCommentSettingsScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
          <Stack.Screen name="GeminiChat" component={GeminiChatScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ViewInRoom" component={ViewInRoomScreen} options={{ headerShown: false, presentation: 'fullScreenModal', orientation: 'landscape' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <FavoriteUsersProvider>
            <FavoriteItemsProvider>
              <ThemeProvider>
                <AppContent />
              </ThemeProvider>
            </FavoriteItemsProvider>
          </FavoriteUsersProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}