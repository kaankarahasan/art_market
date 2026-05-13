import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, StatusBar } from 'react-native';
import { getDoc, doc, updateDoc } from '@react-native-firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useLanguage } from '../contexts/LanguageContext';
import { useThemeContext } from '../contexts/ThemeContext';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

type FollowerPermission = 'everyone' | 'approved' | 'none';
type CommentPermission = 'everyone' | 'following' | 'none';

const options = {
  follower: ['everyone', 'approved', 'none'] as const,
  comment: ['everyone', 'following', 'none'] as const,
};

const PrivacyFollowerCommentSettingsScreen = () => {
  const [followerSetting, setFollowerSetting] = useState<FollowerPermission>('everyone');
  const [commentSetting, setCommentSetting] = useState<CommentPermission>('everyone');
  const { t } = useLanguage();
  const { colors, isDarkTheme } = useThemeContext();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const labels = {
    follower: {
      everyone: t('everyone'),
      approved: t('approvedOnly'),
      none: t('none'),
    },
    comment: {
      everyone: t('everyone'),
      following: t('followingOnly'),
      none: t('none'),
    },
  };

  useEffect(() => {
    const fetchSettings = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      try {
        const userSnap = await getDoc(doc(db, 'users', uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data?.privacySettings) {
            setFollowerSetting(data.privacySettings.followerPermission);
            setCommentSetting(data.privacySettings.commentPermission);
          }
        }
      } catch (err) {
        console.error('Ayarlar alınamadı:', err);
      }
    };

    fetchSettings();
  }, []);

  const saveSettings = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert(t('error'), t('loginRequired'));
      return;
    }

    try {
      await updateDoc(doc(db, 'users', uid), {
        privacySettings: {
          followerPermission: followerSetting,
          commentPermission: commentSetting,
        },
      });
      Alert.alert(t('success'), t('settingsSaved'));
    } catch (err) {
      console.error('Ayarlar kaydedilirken hata:', err);
      Alert.alert(t('error'), t('settingsSaveError'));
    }
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkTheme ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        {/* HEADER */}
        <View style={[styles.header, { borderBottomColor: isDarkTheme ? '#333' : '#eee' }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Gizlilik Ayarları</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('followerSettings')}</Text>
          <View style={styles.optionsContainer}>
            {options.follower.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionCard, 
                  { backgroundColor: colors.card, borderColor: followerSetting === option ? colors.text : colors.border }
                ]}
                onPress={() => setFollowerSetting(option)}
              >
                <Text style={[styles.optionText, { color: colors.text }]}>{labels.follower[option]}</Text>
                {followerSetting === option && <Ionicons name="checkmark-circle" size={20} color={colors.text} />}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 32 }]}>{t('commentSettings')}</Text>
          <View style={styles.optionsContainer}>
            {options.comment.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionCard, 
                  { backgroundColor: colors.card, borderColor: commentSetting === option ? colors.text : colors.border }
                ]}
                onPress={() => setCommentSetting(option)}
              >
                <Text style={[styles.optionText, { color: colors.text }]}>{labels.comment[option]}</Text>
                {commentSetting === option && <Ionicons name="checkmark-circle" size={20} color={colors.text} />}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.text }]} onPress={saveSettings}>
            <Text style={[styles.saveText, { color: colors.background }]}>{t('saveButton')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    paddingRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
    opacity: 0.6,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    marginTop: 48,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  saveText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PrivacyFollowerCommentSettingsScreen;

