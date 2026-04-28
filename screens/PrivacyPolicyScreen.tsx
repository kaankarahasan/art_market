import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useThemeContext } from '../contexts/ThemeContext'; // Relative path
import { useLanguage } from '../contexts/LanguageContext';

const PrivacyPolicyScreen = () => {
  const { colors } = useThemeContext();
  const { t } = useLanguage();

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t('privacyPolicyTitle')}</Text>

      <Text style={[styles.paragraph, { color: colors.text }]}>
        {t('ppIntro')}
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('ppInfoCol')}</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        {t('ppInfoColDesc')}
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('ppInfoUse')}</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        {t('ppInfoUseDesc')}
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('ppSecurity')}</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        {t('ppSecurityDesc')}
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('ppThirdParty')}</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        {t('ppThirdPartyDesc')}
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('ppContact')}</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        {t('ppContactDesc')}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
  },
});

export default PrivacyPolicyScreen;
