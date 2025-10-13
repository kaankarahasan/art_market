import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Linking,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useThemeContext } from '../contexts/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';

const AboutScreen = () => {
  const { colors } = useThemeContext();

  // Sosyal medya linkleri
  const socialLinks = {
    instagram: 'https://www.instagram.com/sirketadi',
    facebook: 'https://www.facebook.com/sirketadi',
    twitter: 'https://twitter.com/sirketadi',
    email: 'mailto:destek@sirketadi.com',
  };

  // Link açma fonksiyonu
  const openLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      alert('Bu bağlantı açılamıyor: ' + url);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Logo veya Görsel */}
      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={[styles.title, { color: colors.text }]}>Hakkımızda</Text>
      <Text style={[styles.content, { color: colors.text }]}>
        Biz, <Text style={{ fontWeight: '700' }}>[Şirket Adı]</Text> olarak sanatçıların eserlerini
        kolayca sergileyebileceği, satışa sunabileceği ve desteklenebileceği bir platform yaratmayı
        hedefliyoruz. Kullanıcı dostu arayüzümüzle, sanat severler ve üreticileri buluşturarak sanat
        ekosistemini güçlendirmek amacındayız.
      </Text>
      <Text style={[styles.content, { color: colors.text }]}>
        Platformumuzda sanatçılar; eserlerini yükleyebilir, güncelleyebilir ve takipçi kitlesi
        oluşturabilir. Alıcılar ise özgün sanat eserlerine kolayca ulaşabilir ve güvenle alışveriş
        yapabilir.
      </Text>
      <Text style={[styles.content, { color: colors.text }]}>
        Daha fazla bilgi ve destek için aşağıdaki iletişim kanallarından bize ulaşabilirsiniz.
      </Text>

      {/* İletişim Butonları */}
      <View style={styles.contactContainer}>
        <TouchableOpacity
          style={[styles.contactButton, { backgroundColor: colors.primary || '#1976d2' }]}
          onPress={() => openLink(socialLinks.email)}
        >
          <FontAwesome name="envelope" size={20} color="#fff" />
          <Text style={styles.contactButtonText}>destek@sirketadi.com</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.contactButton, { backgroundColor: '#C13584' }]}
          onPress={() => openLink(socialLinks.instagram)}
        >
          <FontAwesome name="instagram" size={20} color="#fff" />
          <Text style={styles.contactButtonText}>Instagram</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.contactButton, { backgroundColor: '#3b5998' }]}
          onPress={() => openLink(socialLinks.facebook)}
        >
          <FontAwesome name="facebook" size={20} color="#fff" />
          <Text style={styles.contactButtonText}>Facebook</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.contactButton, { backgroundColor: '#1DA1F2' }]}
          onPress={() => openLink(socialLinks.twitter)}
        >
          <FontAwesome name="twitter" size={20} color="#fff" />
          <Text style={styles.contactButtonText}>Twitter</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexGrow: 1,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 25,
    borderRadius: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 15,
    textAlign: 'center',
  },
  content: {
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 22,
    textAlign: 'justify',
  },
  contactContainer: {
    marginTop: 25,
    gap: 15,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  contactButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 12,
    fontSize: 16,
  },
});

export default AboutScreen;
