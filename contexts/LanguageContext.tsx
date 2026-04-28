import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'tr' | 'en';

// ─── All translatable strings ───────────────────────────────────────────────
const translations = {
  tr: {
    // Tab bar
    home: 'Ana Sayfa',
    favorites: 'Favoriler',
    search: 'Keşfet',
    inbox: 'Mesajlar',
    profile: 'Profil',

    // Login
    loginTitle: 'Giriş Yap',
    loginSubtitle: 'Devam etmek için giriş yapın.',
    loginButton: 'Giriş Yap',
    loginButtonLoading: 'Giriş yapılıyor...',
    forgotPassword: 'Şifremi Unuttum?',
    noAccount: 'Hesabın yok mu? ',
    signUpLink: 'Kayıt Ol',
    signInWithGoogle: 'Google ile Giriş Yap',
    loginError: 'Giriş Hatası',
    emailPlaceholder: 'E-posta',
    passwordPlaceholder: 'Şifre',

    // Sign Up
    signUpTitle: 'Kayıt Ol',
    signUpSubtitle: 'Yeni hesap oluşturun.',
    signUpButton: 'Kayıt Ol',
    fullNamePlaceholder: 'Ad Soyad',
    usernamePlaceholder: 'Kullanıcı Adı',
    alreadyHaveAccount: 'Zaten hesabın var mı? ',
    loginLink: 'Giriş Yap',
    signUpSuccess: 'Hesap oluşturuldu ve profil kaydedildi!',
    signUpError: 'Hata',
    fillAllFields: 'Lütfen tüm alanları doldurun.',

    // Password Reset
    passwordResetTitle: 'Şifre Sıfırla',
    passwordResetSubtitle: 'Sıfırlama linki için e-postanızı girin.',
    sendResetLink: 'Sıfırlama Linki Gönder',
    sending: 'Gönderiliyor...',
    resetEmailSent: 'Şifre sıfırlama e-postası gönderildi. Lütfen gelen kutunuzu (ve spam klasörünü) kontrol edin.',
    invalidEmail: 'Lütfen geçerli bir e-posta adresi girin.',

    // Settings
    settings: 'Ayarlar',
    account: 'Hesap',
    editProfile: 'Profil Bilgilerini Düzenle',
    changeEmailPassword: 'E-posta / Şifre Değiştir',
    appearance: 'Görünüm',
    theme: 'Tema',
    themeDark: 'Karanlık',
    themeLight: 'Açık',
    themeChanged: 'Tema Değişti',
    themeChangedMsg: 'Tema {theme} olarak ayarlandı.',
    notifications: 'Bildirimler',
    pushNotifications: 'Push Bildirimleri',
    productNotifications: 'Ürün Bildirimleri',
    about: 'Hakkında',
    aboutUs: 'Hakkımızda',
    privacyPolicy: 'Gizlilik Politikası',
    termsOfUse: 'Kullanım Şartları',
    signOut: 'Çıkış Yap',
    signOutConfirm: 'Çıkış yapmak istediğinize emin misiniz?',
    cancel: 'İptal',
    confirm: 'Onayla',
    error: 'Hata',
    language: 'Dil',
    languageLabel: 'Dil: {lang}',
    languageTr: 'Türkçe',
    languageEn: 'İngilizce',
    languageChangeTitle: 'Dil Değiştir',
    languageChangeMsg: 'Dili "{lang}" olarak değiştirmek istediğinize emin misiniz?',

    // Profile
    followers: 'Takipçi',
    following: 'Takip Edilen',
    artworks: 'Eserler',
    aboutTab: 'Hakkında',
    noBio: 'Biyografi bilgisi bulunmamaktadır.',
    follow: 'Takip Et',
    message: 'Mesaj',
    noProducts: 'Henüz ürün eklememiş.',

    // Product
    productName: 'Ürün Adı',
    year: 'Yıl',
    description: 'Açıklama',
    price: 'Fiyat (₺)',
    category: 'Kategori',
    selectCategory: 'Kategori Seçin',
    size: 'Boyut (cm)',
    height: 'Yükseklik',
    width: 'Genişlik',
    yearPlaceholder: 'Yapım yılı (örn: 2024)',
    photos: 'Fotoğraflar (max 3)',
    pickFromGallery: 'Galeriden Seç',
    takeFromCamera: 'Kameradan Çek',
    save: 'Kaydet',
    addNewProduct: 'Yeni Eser Ekle',
    productAdded: 'Ürün başarıyla eklendi.',
    productAddError: 'Ürün eklenirken bir sorun oluştu.',
    maxPhotos: 'En fazla 3 fotoğraf ekleyebilirsiniz.',
    validYear: 'Lütfen geçerli bir yıl girin.',
    fillRequired: 'Lütfen tüm zorunlu alanları doldurun.',
    titleAndDescRequired: 'Başlık ve açıklama zorunludur.',
    productUpdated: 'Ürün güncellendi.',
    productUpdateError: 'Ürün güncellenemedi.',
    imagePickError: 'Resim seçilirken bir hata oluştu',
    imageUploadError: 'Resim yüklenemedi.',

    // Product Detail
    sendMessage: 'Mesaj Gönder',
    viewInRoom: 'Odada Gör',
    noImage: 'Görsel bulunamadı',
    noDescription: 'Bu ürün hakkında detaylı bilgi bulunmamaktadır.',
    dimension: 'Boyut',
    addedDate: 'Eklenme Tarihi',
    otherProducts: 'Diğer Ürünleri',
    noOtherProducts: 'Bu satıcının başka bir ürünü bulunmamaktadır.',
    seller: 'Satıcı',

    // Edit Profile
    editProfileTitle: 'Profil Düzenle',
    addPhoto: 'Fotoğraf Ekle',
    removePhoto: 'Fotoğrafı Kaldır',
    usernameLabel: 'Kullanıcı Adı',
    bioLabel: 'Bio',
    usernamePlaceholderEdit: 'Kullanıcı adınızı girin',
    bioPlaceholder: 'Kendinizden bahsedin',
    saveButton: 'Kaydet',
    profileUpdated: 'Profil güncellendi!',

    // Change Email & Password
    changeCredentialsTitle: 'E-posta ve Şifre Değiştir',
    currentPassword: 'Mevcut Şifre',
    currentPasswordPlaceholder: 'Mevcut şifrenizi girin',
    newEmail: 'Yeni E-posta',
    newEmailPlaceholder: 'Yeni e-posta adresiniz',
    newPassword: 'Yeni Şifre',
    newPasswordPlaceholder: 'Yeni şifre (en az 6 karakter)',
    update: 'Güncelle',
    updateSuccess: 'Bilgileriniz başarıyla güncellendi.',

    // Inbox / Chat
    messages: 'Mesajlar',
    messagePlaceholder: 'Mesaj...',
    noChats: 'Hiç sohbet yok.',
    pinChat: 'Sohbeti Sabitle',
    unpinChat: 'Sabitlemeyi Kaldır',
    deleteChat: 'Sohbeti Sil',
    areYouSureDeleteChat: 'Sohbeti silmek istediğinize emin misiniz?',
    loginRequired: 'Kullanıcı bilgisi alınamadı, lütfen giriş yapınız.',

    // Gemini
    geminiPlaceholder: 'Asistana mesaj yazın...',
    geminiSend: 'Gönder',
    geminiLoading: 'Asistan yanıtlıyor...',
    geminiReset: 'Sohbeti Sıfırla',
    geminiResetMsg: 'Tüm mesaj geçmişini silmek istediğinizden emin misiniz?',
    geminiCancel: 'Vazgeç',
    geminiConfirm: 'Sıfırla',
    artAssistant: 'Sanat Asistanı',

    // Search & Home
    searchPlaceholder: 'Ara...',
    recentSearches: 'Son Aramalar',
    noResults: 'Sonuç bulunamadı.',
    discover: 'Keşfedin',
    users: 'Kullanıcılar',
    artworksSection: 'Eserler',
    filter: 'Filtrele',
    sort: 'Sıralama',
    priceRange: 'Fiyat Aralığı (₺)',
    dimensions: 'Boyutlar (cm)',
    widthFilter: 'Genişlik',
    heightFilter: 'Yükseklik',
    minPlaceholder: 'Min',
    maxPlaceholder: 'Max',
    clear: 'Temizle',
    apply: 'Uygula',
    artists: 'Sanatçılar',
    all: 'Tümü',
    artwork: 'Eser',
    artist: 'Sanatçı',
    sizeScope: 'Boyut',

    // Misc
    noImageText: 'Resim yok',
    unknown: 'Bilinmeyen',
    unknownSeller: 'Satıcı',
    noTitle: 'Başlık Yok',
    close: 'Kapat',
    warning: 'Uyarı',
    success: 'Başarılı',
    delete: 'Sil',
    linkOpenError: 'Link açılamadı: ',
    update2: 'Güncelle',
    addImage: 'Resim Ekle',
    productNameLabel: 'Ürün Adı',
    descriptionLabel: 'Açıklama',
    priceLabel: 'Fiyat (₺)',
    categoryLabel: 'Kategori',

    // Categories
    cat_yagli_boya: 'Yağlı Boya',
    cat_suluboya: 'Suluboya',
    cat_akrilik: 'Akrilik',
    cat_heykel: 'Heykel',
    cat_fotograf: 'Fotoğraf',
    cat_dijital: 'Dijital Sanat',
    cat_cizim: 'Çizim',
    cat_grafik: 'Grafik Tasarım',
    cat_seramik: 'Seramik',
    cat_kolaj: 'Kolaj',
    cat_diger: 'Diğer',

    // Followers / Following
    followersTitle: 'Takipçiler',
    followingTitle: 'Takip Edilenler',
    noFollowers: 'Henüz takipçi yok.',
    noFollowing: 'Henüz takip edilen yok.',

    // Sold / Favorites
    soldTitle: 'Satılan Ürünler',
    noSold: 'Henüz satılan ürün yok.',
    noFavorites: 'Henüz favori ürün yok.',

    // PrivacyPolicy / TermsOfUse / About
    privacyPolicyTitle: 'Gizlilik Politikası',
    termsOfUseTitle: 'Kullanım Şartları',
    aboutTitle: 'Hakkımızda',
    aboutP1: 'Biz, [Şirket Adı] olarak sanatçıların eserlerini kolayca sergileyebileceği, satışa sunabileceği ve desteklenebileceği bir platform yaratmayı hedefliyoruz. Kullanıcı dostu arayüzümüzle, sanat severler ve üreticileri buluşturarak sanat ekosistemini güçlendirmek amacındayız.',
    aboutP2: 'Platformumuzda sanatçılar; eserlerini yükleyebilir, güncelleyebilir ve takipçi kitlesi oluşturabilir. Alıcılar ise özgün sanat eserlerine kolayca ulaşabilir ve güvenle alışveriş yapabilir.',
    aboutP3: 'Daha fazla bilgi ve destek için aşağıdaki iletişim kanallarından bize ulaşabilirsiniz.',
    ppIntro: 'Biz kullanıcılarımızın gizliliğine büyük önem veriyoruz. Bu gizlilik politikası, kişisel bilgilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar.',
    ppInfoCol: 'Toplanan Bilgiler',
    ppInfoColDesc: 'Kayıt sırasında e-posta adresiniz, kullanıcı adınız gibi temel bilgileri toplarız. Ayrıca uygulamamızın kullanımını analiz etmek için anonim veriler toplayabiliriz.',
    ppInfoUse: 'Bilgi Kullanımı',
    ppInfoUseDesc: 'Toplanan bilgiler, hizmetlerimizi geliştirmek, kullanıcı deneyimini iyileştirmek ve gerektiğinde size bildirim göndermek için kullanılır.',
    ppSecurity: 'Bilgi Güvenliği',
    ppSecurityDesc: 'Kişisel bilgileriniz güvenli sunucularda saklanır ve yetkisiz erişimlere karşı korunur.',
    ppThirdParty: 'Üçüncü Taraflarla Paylaşım',
    ppThirdPartyDesc: 'Kişisel bilgileriniz üçüncü taraflarla paylaşılmaz, ancak yasal zorunluluklar halinde yetkili kurumlarla paylaşılabilir.',
    ppContact: 'İletişim',
    ppContactDesc: 'Gizlilik politikamız hakkında sorularınız için lütfen destek@ornekapp.com adresinden bizimle iletişime geçin.',
    touIntro: 'Bu kullanım şartları, uygulamamızı kullanırken uymanız gereken kuralları ve şartları belirler. Uygulamamızı kullanarak bu şartları kabul etmiş sayılırsınız.',
    touResp: 'Kullanıcı Sorumlulukları',
    touRespDesc: 'Kullanıcılar, hizmetleri yasalara uygun şekilde kullanmayı taahhüt eder. Herhangi bir yasa dışı, zarar verici veya etik dışı davranış yasaktır.',
    touSec: 'Hesap Güvenliği',
    touSecDesc: 'Hesabınızın güvenliğini sağlamak sizin sorumluluğunuzdadır. Şifrenizi başkalarıyla paylaşmamanız ve düzenli olarak güncellemeniz önerilir.',
    touLimit: 'Sorumluluğun Sınırlandırılması',
    touLimitDesc: 'Uygulama, üçüncü taraf içeriklerinden veya hizmetlerinden doğabilecek zararlar için sorumluluk kabul etmez.',
    touChanges: 'Değişiklikler',
    touChangesDesc: 'Bu kullanım şartları zaman zaman güncellenebilir. Güncellemeler uygulandığında, kullanıcılar bilgilendirilecektir.',
    touContact: 'İletişim',
    touContactDesc: 'Kullanım şartları ile ilgili sorularınız için destek@ornekapp.com adresinden bize ulaşabilirsiniz.',

    // PrivacyFollowerCommentSettings
    settingsSaved: 'Ayarlar kaydedildi.',
    settingsSaveError: 'Ayarlar kaydedilirken bir hata oluştu.',
    followerSettings: 'Takipçi Ayarları',
    commentSettings: 'Yorum Ayarları',
    everyone: 'Herkes',
    approvedOnly: 'Sadece Onayladıklarım',
    none: 'Kimse',
    followingOnly: 'Takip Ettiklerim',

    // ViewInRoom
    viewInRoomError: 'Görüntülenecek bir görsel bulunamadı.',
  },

  en: {
    // Tab bar
    home: 'Home',
    favorites: 'Favorites',
    search: 'Discover',
    inbox: 'Inbox',
    profile: 'Profile',

    // Login
    loginTitle: 'Login',
    loginSubtitle: 'Please login to continue.',
    loginButton: 'Login',
    loginButtonLoading: 'Logging in...',
    forgotPassword: 'Forgot Your Password?',
    noAccount: "Don't have an account? ",
    signUpLink: 'Sign Up',
    signInWithGoogle: 'Sign in with Google',
    loginError: 'Login Error',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password',

    // Sign Up
    signUpTitle: 'Sign Up',
    signUpSubtitle: 'Create a new account.',
    signUpButton: 'Sign Up',
    fullNamePlaceholder: 'Name Surname',
    usernamePlaceholder: 'User Name',
    alreadyHaveAccount: 'Do you already have an account? ',
    loginLink: 'Login',
    signUpSuccess: 'Account created and profile saved!',
    signUpError: 'Error',
    fillAllFields: 'Please fill in all fields.',

    // Password Reset
    passwordResetTitle: 'Reset Password',
    passwordResetSubtitle: 'Enter your email to receive a reset link.',
    sendResetLink: 'Send Reset Link',
    sending: 'Sending...',
    resetEmailSent: 'Password reset email sent. Please check your inbox (and spam folder).',
    invalidEmail: 'Please enter a valid email address.',

    // Settings
    settings: 'Settings',
    account: 'Account',
    editProfile: 'Edit Profile',
    changeEmailPassword: 'Change Email / Password',
    appearance: 'Appearance',
    theme: 'Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    themeChanged: 'Theme Changed',
    themeChangedMsg: 'Theme set to {theme}.',
    notifications: 'Notifications',
    pushNotifications: 'Push Notifications',
    productNotifications: 'Product Notifications',
    about: 'About',
    aboutUs: 'About Us',
    privacyPolicy: 'Privacy Policy',
    termsOfUse: 'Terms of Use',
    signOut: 'Sign Out',
    signOutConfirm: 'Are you sure you want to sign out?',
    cancel: 'Cancel',
    confirm: 'Confirm',
    error: 'Error',
    language: 'Language',
    languageLabel: 'Language: {lang}',
    languageTr: 'Turkish',
    languageEn: 'English',
    languageChangeTitle: 'Change Language',
    languageChangeMsg: 'Are you sure you want to change the language to "{lang}"?',

    // Profile
    followers: 'Followers',
    following: 'Following',
    artworks: 'Artworks',
    aboutTab: 'About',
    noBio: 'No bio available.',
    follow: 'Follow',
    message: 'Message',
    noProducts: 'No products added yet.',

    // Product
    productName: 'Product Name',
    year: 'Year',
    description: 'Description',
    price: 'Price (₺)',
    category: 'Category',
    selectCategory: 'Select Category',
    size: 'Size (cm)',
    height: 'Height',
    width: 'Width',
    yearPlaceholder: 'Year (e.g., 2024)',
    photos: 'Photos (max 3)',
    pickFromGallery: 'Pick from Gallery',
    takeFromCamera: 'Take from Camera',
    save: 'Save',
    addNewProduct: 'Add New Artwork',
    productAdded: 'Product added successfully.',
    productAddError: 'An error occurred while adding the product.',
    maxPhotos: 'You can add a maximum of 3 photos.',
    validYear: 'Please enter a valid year.',
    fillRequired: 'Please fill in all required fields.',
    titleAndDescRequired: 'Title and description are required.',
    productUpdated: 'Product updated.',
    productUpdateError: 'Could not update product.',
    imagePickError: 'An error occurred while picking image.',
    imageUploadError: 'Could not upload image.',

    // Product Detail
    sendMessage: 'Send Message',
    viewInRoom: 'View in Room',
    noImage: 'No image found',
    noDescription: 'No detailed information available for this product.',
    dimension: 'Dimensions',
    addedDate: 'Added Date',
    otherProducts: "Other Products",
    noOtherProducts: 'This seller has no other products.',
    seller: 'Seller',

    // Edit Profile
    editProfileTitle: 'Edit Profile',
    addPhoto: 'Add Photo',
    removePhoto: 'Remove Photo',
    usernameLabel: 'Username',
    bioLabel: 'Bio',
    usernamePlaceholderEdit: 'Enter your username',
    bioPlaceholder: 'Tell us about yourself',
    saveButton: 'Save',
    profileUpdated: 'Profile updated!',

    // Change Email & Password
    changeCredentialsTitle: 'Change Email & Password',
    currentPassword: 'Current Password',
    currentPasswordPlaceholder: 'Enter your current password',
    newEmail: 'New Email',
    newEmailPlaceholder: 'Your new email address',
    newPassword: 'New Password',
    newPasswordPlaceholder: 'New password (min 6 characters)',
    update: 'Update',
    updateSuccess: 'Your information has been successfully updated.',

    // Inbox / Chat
    messages: 'Messages',
    messagePlaceholder: 'Message...',
    noChats: 'No conversations.',
    pinChat: 'Pin Conversation',
    unpinChat: 'Unpin Conversation',
    deleteChat: 'Delete Conversation',
    areYouSureDeleteChat: 'Are you sure you want to delete this conversation?',
    loginRequired: 'User information could not be retrieved, please login.',

    // Gemini
    geminiPlaceholder: 'Write a message to the assistant...',
    geminiSend: 'Send',
    geminiLoading: 'Assistant is responding...',
    geminiReset: 'Reset Chat',
    geminiResetMsg: 'Are you sure you want to delete this conversation?',
    geminiCancel: 'Cancel',
    geminiConfirm: 'Reset',
    artAssistant: 'Art Assistant',

    // Search & Home
    searchPlaceholder: 'Search...',
    recentSearches: 'Recent Searches',
    noResults: 'No results found.',
    discover: 'Discover',
    users: 'Users',
    artworksSection: 'Artworks',
    filter: 'Filter',
    sort: 'Sort',
    priceRange: 'Price Range (₺)',
    dimensions: 'Dimensions (cm)',
    widthFilter: 'Width',
    heightFilter: 'Height',
    minPlaceholder: 'Min',
    maxPlaceholder: 'Max',
    clear: 'Clear',
    apply: 'Apply',
    artists: 'Artists',
    all: 'All',
    artwork: 'Artwork',
    artist: 'Artist',
    sizeScope: 'Size',

    // Misc
    noImageText: 'No image',
    unknown: 'Unknown',
    unknownSeller: 'Seller',
    noTitle: 'No Title',
    close: 'Close',
    warning: 'Warning',
    success: 'Success',
    delete: 'Delete',
    linkOpenError: 'Could not open link: ',
    update2: 'Update',
    addImage: 'Add Image',
    productNameLabel: 'Product Name',
    descriptionLabel: 'Description',
    priceLabel: 'Price (₺)',
    categoryLabel: 'Category',

    // Categories
    cat_yagli_boya: 'Oil Painting',
    cat_suluboya: 'Watercolor',
    cat_akrilik: 'Acrylic',
    cat_heykel: 'Sculpture',
    cat_fotograf: 'Photography',
    cat_dijital: 'Digital Art',
    cat_cizim: 'Drawing',
    cat_grafik: 'Graphic Design',
    cat_seramik: 'Ceramics',
    cat_kolaj: 'Collage',
    cat_diger: 'Other',

    // Followers / Following
    followersTitle: 'Followers',
    followingTitle: 'Following',
    noFollowers: 'No followers yet.',
    noFollowing: 'Not following anyone yet.',

    // Sold / Favorites
    soldTitle: 'Sold Products',
    noSold: 'No sold products yet.',
    noFavorites: 'No favorite products yet.',

    // PrivacyPolicy / TermsOfUse / About
    privacyPolicyTitle: 'Privacy Policy',
    termsOfUseTitle: 'Terms of Use',
    aboutTitle: 'About Us',
    aboutP1: 'As [Company Name], we aim to create a platform where artists can easily showcase, sell, and receive support for their works. With our user-friendly interface, we aim to strengthen the art ecosystem by bringing art lovers and creators together.',
    aboutP2: 'On our platform, artists can upload and update their artworks and build a follower base. Buyers can easily access unique artworks and shop safely.',
    aboutP3: 'For more information and support, you can contact us through the communication channels below.',
    ppIntro: 'We attach great importance to the privacy of our users. This privacy policy explains how your personal information is collected, used, and protected.',
    ppInfoCol: 'Information Collected',
    ppInfoColDesc: 'During registration, we collect basic information such as your email address and username. We may also collect anonymous data to analyze the use of our application.',
    ppInfoUse: 'Use of Information',
    ppInfoUseDesc: 'The collected information is used to improve our services, enhance the user experience, and send you notifications when necessary.',
    ppSecurity: 'Information Security',
    ppSecurityDesc: 'Your personal information is stored on secure servers and protected against unauthorized access.',
    ppThirdParty: 'Sharing with Third Parties',
    ppThirdPartyDesc: 'Your personal information is not shared with third parties, but may be shared with authorized institutions in case of legal obligations.',
    ppContact: 'Contact',
    ppContactDesc: 'If you have questions about our privacy policy, please contact us at support@exampleapp.com.',
    touIntro: 'These terms of use set out the rules and conditions you must follow when using our application. By using our application, you are deemed to have accepted these terms.',
    touResp: 'User Responsibilities',
    touRespDesc: 'Users undertake to use the services in accordance with the law. Any illegal, harmful, or unethical behavior is prohibited.',
    touSec: 'Account Security',
    touSecDesc: 'It is your responsibility to ensure the security of your account. It is recommended that you do not share your password with others and update it regularly.',
    touLimit: 'Limitation of Liability',
    touLimitDesc: 'The application accepts no responsibility for damages that may arise from third-party content or services.',
    touChanges: 'Changes',
    touChangesDesc: 'These terms of use may be updated from time to time. When updates are applied, users will be informed.',
    touContact: 'Contact',
    touContactDesc: 'For questions regarding the terms of use, you can contact us at support@exampleapp.com.',

    // PrivacyFollowerCommentSettings
    settingsSaved: 'Settings saved.',
    settingsSaveError: 'An error occurred while saving settings.',
    followerSettings: 'Follower Settings',
    commentSettings: 'Comment Settings',
    everyone: 'Everyone',
    approvedOnly: 'Approved Only',
    none: 'No one',
    followingOnly: 'Following Only',

    // ViewInRoom
    viewInRoomError: 'No image found to display.',
  },
} as const;

export type TranslationKeys = keyof typeof translations.tr;

const LANG_STORAGE_KEY = '@app_language';

interface LanguageContextType {
  language: Language;
  t: (key: TranslationKeys) => string;
  changeLanguage: (lang: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'tr',
  t: (key) => translations.tr[key] ?? key,
  changeLanguage: async () => {},
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('tr');

  useEffect(() => {
    AsyncStorage.getItem(LANG_STORAGE_KEY).then((stored) => {
      if (stored === 'tr' || stored === 'en') {
        setLanguage(stored);
      }
    });
  }, []);

  const changeLanguage = async (lang: Language) => {
    setLanguage(lang);
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
  };

  const t = (key: TranslationKeys): string => {
    return translations[language][key] ?? translations.tr[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, t, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
