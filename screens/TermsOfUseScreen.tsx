import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useThemeContext } from '../contexts/ThemeContext';

const TermsOfUseScreen = () => {
  const { colors } = useThemeContext();

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Kullanım Şartları</Text>

      <Text style={[styles.paragraph, { color: colors.text }]}>
        Bu kullanım şartları, uygulamamızı kullanırken uymanız gereken kuralları ve şartları belirler. 
        Uygulamamızı kullanarak bu şartları kabul etmiş sayılırsınız.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Kullanıcı Sorumlulukları</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        Kullanıcılar, hizmetleri yasalara uygun şekilde kullanmayı taahhüt eder. Herhangi bir yasa dışı, zarar verici veya etik dışı davranış yasaktır.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Hesap Güvenliği</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        Hesabınızın güvenliğini sağlamak sizin sorumluluğunuzdadır. Şifrenizi başkalarıyla paylaşmamanız ve düzenli olarak güncellemeniz önerilir.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Sorumluluğun Sınırlandırılması</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        Uygulama, üçüncü taraf içeriklerinden veya hizmetlerinden doğabilecek zararlar için sorumluluk kabul etmez.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Değişiklikler</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        Bu kullanım şartları zaman zaman güncellenebilir. Güncellemeler uygulandığında, kullanıcılar bilgilendirilecektir.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>İletişim</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        Kullanım şartları ile ilgili sorularınız için destek@ornekapp.com adresinden bize ulaşabilirsiniz.
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
