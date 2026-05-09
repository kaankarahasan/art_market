import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { getDoc, doc, updateDoc } from '@react-native-firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useLanguage } from '../contexts/LanguageContext';

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

  const getLabels = () => ({
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
  });

  const labels = getLabels();

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
    <View style={styles.container}>
      <Text style={styles.header}>{t('followerSettings')}</Text>
      {options.follower.map((option) => (
        <TouchableOpacity
          key={option}
          style={[styles.option, followerSetting === option && styles.selectedOption]}
          onPress={() => setFollowerSetting(option)}
        >
          <Text>{labels.follower[option]}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.header}>{t('commentSettings')}</Text>
      {options.comment.map((option) => (
        <TouchableOpacity
          key={option}
          style={[styles.option, commentSetting === option && styles.selectedOption]}
          onPress={() => setCommentSetting(option)}
        >
          <Text>{labels.comment[option]}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
        <Text style={styles.saveText}>{t('saveButton')}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default PrivacyFollowerCommentSettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 18,
    marginVertical: 10,
    fontWeight: 'bold',
  },
  option: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 5,
    borderRadius: 8,
  },
  selectedOption: {
    backgroundColor: '#d0e8ff',
    borderColor: '#007bff',
  },
  saveButton: {
    marginTop: 30,
    backgroundColor: '#007bff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
