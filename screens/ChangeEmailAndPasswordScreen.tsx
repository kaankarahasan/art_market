import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Animated,
  StatusBar,
  ScrollView,
} from 'react-native';
import ReactNativeFirebaseAuth from '@react-native-firebase/auth';
import { auth } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { useThemeContext } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ChangeEmailAndPasswordScreen = () => {
  const user = auth.currentUser;
  const navigation = useNavigation();

  const { colors, isDarkTheme } = useThemeContext();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const reauthenticate = async (password: string) => {
    if (!user || !user.email) throw new Error('Kullanıcı bulunamadı');
    const credential = ReactNativeFirebaseAuth.EmailAuthProvider.credential(user.email, password);
    await user.reauthenticateWithCredential(credential);
  };

  React.useEffect(() => {
    if (feedback) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        if (feedback.type === 'success') hideFeedback();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const hideFeedback = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      const isSuccess = feedback?.type === 'success';
      setFeedback(null);
      if (isSuccess) {
        navigation.goBack();
      }
    });
  };

  const handleUpdate = async () => {
    if (!user) {
      setFeedback({ type: 'error', message: t('loginRequired') });
      return;
    }

    if (!currentPassword) {
      setFeedback({ type: 'warning', message: t('currentPasswordPlaceholder') });
      return;
    }

    setLoading(true);

    try {
      await reauthenticate(currentPassword);

      if (newEmail && newEmail !== user.email) {
        await user.updateEmail(newEmail);
      }

      if (newPassword) {
        if (newPassword.length < 6) {
          setFeedback({ type: 'warning', message: t('newPasswordPlaceholder') });
          setLoading(false);
          return;
        }
        await user.updatePassword(newPassword);
      }

      setFeedback({ type: 'success', message: t('updateSuccess') });
    } catch (error: any) {
      console.error("Update credentials error:", error);
      let message = t('error');
      if (error.code === 'auth/wrong-password') message = 'Mevcut şifre yanlış.';
      else if (error.code === 'auth/invalid-email') message = 'Geçersiz e-posta adresi.';
      else if (error.code === 'auth/email-already-in-use') message = 'Bu e-posta zaten kullanılıyor.';
      else if (error.code === 'auth/requires-recent-login') message = 'Güvenlik nedeniyle bu işlem için tekrar giriş yapmalısınız.';
      setFeedback({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />
      
      {/* HEADER */}
      <SafeAreaView edges={['top', 'left', 'right']} style={{ backgroundColor: colors.background }}>
        <View style={[styles.header, { borderBottomColor: isDarkTheme ? '#333' : '#eee' }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('changeEmailPassword')}</Text>
        </View>
      </SafeAreaView>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        style={styles.container} 
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
      >
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.secondaryText }]}>{t('currentPassword')}</Text>
            <TextInput
              secureTextEntry
              style={[
                styles.underlineInput, 
                { borderBottomColor: focusedField === 'current' ? colors.primary : colors.border, color: colors.text }
              ]}
              placeholder={t('currentPasswordPlaceholder')}
              placeholderTextColor={colors.secondaryText}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              onFocus={() => setFocusedField('current')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.secondaryText }]}>{t('newEmail')}</Text>
            <TextInput
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.underlineInput, 
                { borderBottomColor: focusedField === 'email' ? colors.primary : colors.border, color: colors.text }
              ]}
              placeholder={t('newEmailPlaceholder')}
              placeholderTextColor={colors.secondaryText}
              value={newEmail}
              onChangeText={setNewEmail}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.secondaryText }]}>{t('newPassword')}</Text>
            <TextInput
              secureTextEntry
              style={[
                styles.underlineInput, 
                { borderBottomColor: focusedField === 'new' ? colors.primary : colors.border, color: colors.text }
              ]}
              placeholder={t('newPasswordPlaceholder')}
              placeholderTextColor={colors.secondaryText}
              value={newPassword}
              onChangeText={setNewPassword}
              onFocus={() => setFocusedField('new')}
              onBlur={() => setFocusedField(null)}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.mainActionButton, { backgroundColor: loading ? colors.border : colors.text }]} 
          onPress={handleUpdate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={[styles.mainActionButtonText, { color: colors.background }]}>{t('update')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* FEEDBACK OVERLAY */}
      {feedback && (
        <Animated.View style={[styles.feedbackOverlay, { opacity: fadeAnim, backgroundColor: 'rgba(0,0,0,0.8)' }]}>
          <View style={[styles.feedbackContent, { backgroundColor: colors.card }]}>
            <Ionicons 
              name={feedback.type === 'success' ? 'checkmark-circle' : (feedback.type === 'warning' ? 'warning' : 'alert-circle')} 
              size={54} 
              color={feedback.type === 'success' ? '#4CD964' : (feedback.type === 'warning' ? '#FF9500' : '#FF3B30')} 
            />
            <Text style={[styles.feedbackMessage, { color: colors.text }]}>{feedback.message}</Text>
            <TouchableOpacity style={[styles.closeFeedback, { backgroundColor: colors.text }]} onPress={hideFeedback}>
              <Text style={{ color: colors.background, fontWeight: 'bold' }}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

export default ChangeEmailAndPasswordScreen;

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  backButton: { paddingRight: 10 },
  container: { flex: 1, padding: 24 },
  
  formSection: { marginBottom: 32, marginTop: 10 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  underlineInput: {
    borderBottomWidth: 1.5,
    paddingVertical: 10,
    fontSize: 16,
    lineHeight: 22,
  },

  mainActionButton: {
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
  },
  mainActionButtonText: { fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 },

  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 30,
  },
  feedbackContent: {
    width: '100%',
    padding: 30,
    borderRadius: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
  },
  feedbackMessage: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginTop: 20, marginBottom: 30, lineHeight: 26 },
  closeFeedback: { paddingHorizontal: 40, paddingVertical: 15, borderRadius: 16 },
});
