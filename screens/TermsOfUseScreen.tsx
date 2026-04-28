import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useThemeContext } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const TermsOfUseScreen = () => {
  const { colors } = useThemeContext();
  const { t } = useLanguage();

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{t('termsOfUseTitle')}</Text>

      <Text style={[styles.paragraph, { color: colors.text }]}>
        {t('touIntro')}
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('touResp')}</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        {t('touRespDesc')}
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('touSec')}</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        {t('touSecDesc')}
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('touLimit')}</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        {t('touLimitDesc')}
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('touChanges')}</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        {t('touChangesDesc')}
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('touContact')}</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        {t('touContactDesc')}
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

export default TermsOfUseScreen;
