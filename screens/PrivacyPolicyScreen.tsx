import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useThemeContext } from '../contexts/ThemeContext'; // Relative path

const PrivacyPolicyScreen = () => {
  const { colors } = useThemeContext();

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Gizlilik Politikası</Text>

      <Text style={[styles.paragraph, { color: colors.text }]}>
        Biz kullanıcılarımızın gizliliğine büyük önem veriyoruz. Bu gizlilik politikası, 
        kişisel bilgilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Toplanan Bilgiler</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        Kayıt sırasında e-posta adresiniz, kullanıcı adınız gibi temel bilgileri toplarız. Ayrıca uygulamamızın kullanımını analiz etmek için anonim veriler toplayabiliriz.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Bilgi Kullanımı</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        Toplanan bilgiler, hizmetlerimizi geliştirmek, kullanıcı deneyimini iyileştirmek ve gerektiğinde size bildirim göndermek için kullanılır.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Bilgi Güvenliği</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        Kişisel bilgileriniz güvenli sunucularda saklanır ve yetkisiz erişimlere karşı korunur.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Üçüncü Taraflarla Paylaşım</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        Kişisel bilgileriniz üçüncü taraflarla paylaşılmaz, ancak yasal zorunluluklar halinde yetkili kurumlarla paylaşılabilir.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>İletişim</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        Gizlilik politikamız hakkında sorularınız için lütfen destek@ornekapp.com adresinden bizimle iletişime geçin.
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
