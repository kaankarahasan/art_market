import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Geçerli izin türleri
type FollowerPermission = 'everyone' | 'approved' | 'none';
type CommentPermission = 'everyone' | 'following' | 'none';

const options = {
  follower: ['everyone', 'approved', 'none'] as const,
  comment: ['everyone', 'following', 'none'] as const
};

const labels = {
  follower: {
    everyone: 'Herkes',
    approved: 'Sadece Onayladıklarım',
    none: 'Kimse'
  },
  comment: {
    everyone: 'Herkes',
    following: 'Takip Ettiklerim',
    none: 'Kimse'
  }
};

const PrivacyFollowerCommentSettingsScreen = () => {
  const [followerSetting, setFollowerSetting] = useState<FollowerPermission>('everyone');
  const [commentSetting, setCommentSetting] = useState<CommentPermission>('everyone');

  useEffect(() => {
    const fetchSettings = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const userDoc = await getDoc(doc(db, 'users', uid));
      const data = userDoc.data();
      if (data?.privacySettings) {
        setFollowerSetting(data.privacySettings.followerPermission);
        setCommentSetting(data.privacySettings.commentPermission);
      }
    };

    fetchSettings();
  }, []);

  const saveSettings = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı.');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', uid), {
        privacySettings: {
          followerPermission: followerSetting,
          commentPermission: commentSetting
        }
      });
      Alert.alert('Başarılı', 'Ayarlar kaydedildi.');
    } catch (err) {
      console.error(err);
      Alert.alert('Hata', 'Ayarlar kaydedilirken bir hata oluştu.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Takipçi Ayarları</Text>
      {options.follower.map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.option,
            followerSetting === option && styles.selectedOption
          ]}
          onPress={() => setFollowerSetting(option)}
        >
          <Text>{labels.follower[option]}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.header}>Yorum Ayarları</Text>
      {options.comment.map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.option,
            commentSetting === option && styles.selectedOption
          ]}
          onPress={() => setCommentSetting(option)}
        >
          <Text>{labels.comment[option]}</Text>
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
        <Text style={styles.saveText}>Kaydet</Text>
      </TouchableOpacity>
    </View>
  );
};

export default PrivacyFollowerCommentSettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  },
  header: {
    fontSize: 18,
    marginVertical: 10,
    fontWeight: 'bold'
  },
  option: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 5,
    borderRadius: 8
  },
  selectedOption: {
    backgroundColor: '#d0e8ff',
    borderColor: '#007bff'
  },
  saveButton: {
    marginTop: 30,
    backgroundColor: '#007bff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center'
  },
  saveText: {
    color: '#fff',
    fontWeight: 'bold'
  }
});
