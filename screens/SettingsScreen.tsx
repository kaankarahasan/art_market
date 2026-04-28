import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  Modal,
} from 'react-native';
import { auth } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes/types';
import { useThemeContext } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useLanguage, Language } from '../contexts/LanguageContext';

const SettingsScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isDarkTheme, toggleTheme, colors } = useThemeContext();
  const insets = useSafeAreaInsets();
  const { t, language, changeLanguage } = useLanguage();

  const [langModalVisible, setLangModalVisible] = useState(false);
  const [pendingLang, setPendingLang] = useState<Language | null>(null);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);

  const onToggleTheme = () => {
    toggleTheme();
  };

  const handleSignOut = () => {
    setSignOutModalVisible(true);
  };

  const confirmSignOut = () => {
    setSignOutModalVisible(false);
    auth.signOut()
      .then(() => navigation.replace('Login'))
      .catch(error => Alert.alert(t('error'), error.message));
  };

  const requestLanguageChange = (lang: Language) => {
    if (lang === language) return;
    setPendingLang(lang);
    setLangModalVisible(true);
  };

  const confirmLanguageChange = async () => {
    if (pendingLang) {
      await changeLanguage(pendingLang);
    }
    setLangModalVisible(false);
    setPendingLang(null);
  };

  const cancelLanguageChange = () => {
    setLangModalVisible(false);
    setPendingLang(null);
  };

  const currentLangLabel = language === 'tr' ? t('languageTr') : t('languageEn');
  const pendingLangLabel = pendingLang === 'tr' ? t('languageTr') : t('languageEn');

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings')}</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: 40 + insets.bottom }]}>

        {/* Hesap */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('account')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
            <Text style={[styles.item, { color: colors.text }]}>{t('editProfile')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ChangeEmailAndPassword')}>
            <Text style={[styles.item, { color: colors.text }]}>{t('changeEmailPassword')}</Text>
          </TouchableOpacity>
        </View>

        {/* Görünüm */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('appearance')}</Text>
          <View style={styles.rowItem}>
            <Text style={[styles.item, { color: colors.text, flex: 1 }]}>
              {t('theme')}: {isDarkTheme ? t('themeDark') : t('themeLight')}
            </Text>
            <Switch
              value={isDarkTheme}
              onValueChange={onToggleTheme}
              trackColor={{ false: '#ccc', true: '#1976d2' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Dil */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('language')}</Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[
                styles.langButton,
                language === 'tr' && styles.langButtonActive,
                { borderColor: language === 'tr' ? colors.text : (colors.border || '#ddd') },
              ]}
              onPress={() => requestLanguageChange('tr')}
            >
              <Text style={[styles.langButtonText, { color: language === 'tr' ? colors.background : colors.text }]}>
                🇹🇷  {t('languageTr')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.langButton,
                language === 'en' && styles.langButtonActive,
                { borderColor: language === 'en' ? colors.text : (colors.border || '#ddd') },
              ]}
              onPress={() => requestLanguageChange('en')}
            >
              <Text style={[styles.langButtonText, { color: language === 'en' ? colors.background : colors.text }]}>
                🇬🇧  {t('languageEn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bildirimler */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('notifications')}</Text>
          <Text style={[styles.item, { color: colors.text }]}>{t('pushNotifications')}</Text>
          <Text style={[styles.item, { color: colors.text }]}>{t('productNotifications')}</Text>
        </View>

        {/* Hakkında */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('about')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('About')}>
            <Text style={[styles.item, { color: colors.text }]}>{t('aboutUs')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={[styles.item, { color: colors.text }]}>{t('privacyPolicy')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')}>
            <Text style={[styles.item, { color: colors.text }]}>{t('termsOfUse')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: '#ff5252' }]}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutButtonText}>{t('signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Language Change Confirmation Modal */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelLanguageChange}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={cancelLanguageChange}
        >
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Ionicons name="language-outline" size={36} color={colors.text} style={{ marginBottom: 12 }} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('languageChangeTitle')}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.text + 'aa' }]}>
              {t('languageChangeMsg').replace('{lang}', pendingLangLabel)}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: isDarkTheme ? '#444' : '#E0E0E0' }]}
                onPress={cancelLanguageChange}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: colors.text }]}
                onPress={confirmLanguageChange}
              >
                <Text style={[styles.modalConfirmText, { color: colors.background }]}>{t('confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={signOutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSignOutModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSignOutModalVisible(false)}
        >
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <MaterialIcons name="logout" size={36} color="#ff5252" style={{ marginBottom: 12 }} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t('signOut')}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.text + 'aa' }]}>
              {t('signOutConfirm')}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: isDarkTheme ? '#444' : '#E0E0E0' }]}
                onPress={() => setSignOutModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: '#ff5252' }]}
                onPress={confirmSignOut}
              >
                <Text style={[styles.modalConfirmText, { color: '#fff' }]}>{t('signOut')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    paddingRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  scrollContainer: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  item: { fontSize: 16, paddingVertical: 6, paddingLeft: 10 },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  langRow: {
    flexDirection: 'row',
    gap: 12,
    paddingLeft: 10,
    marginTop: 4,
  },
  langButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  langButtonActive: {
    backgroundColor: '#333',
  },
  langButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  signOutButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignSelf: 'center',
    marginTop: 30,
  },
  signOutButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '82%',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: { fontWeight: '600', fontSize: 15 },
  modalConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmText: { fontWeight: '700', fontSize: 15 },
});

export default SettingsScreen;
