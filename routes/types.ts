// Ürün tipi
export type Product = {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];          // Birden fazla görsel
  mainImageUrl?: string;        // Ana görsel (liste görünümünde)
  ownerId: string;
  username?: string;
  userProfileImage?: string;
  seller?: string;
  price?: number;
  category?: string;
  dimensions?: {
    height?: number | null;
    width?: number | null;
    depth?: number | null;
  };
  year?: number | null;         // Yıl artık sayı olarak tutuluyor
  isSold?: boolean;
  createdAt?: any;
  updatedAt?: any;
  viewCount?: number;
  isSeeded?: boolean;
  aiVisualTags?: string[];      // AI görsel analiz etiketleri
  modelGlbUrl?: string;         // Android/Web AR modeli
  modelUsdzUrl?: string;        // iOS AR modeli
  processedTextureUrl?: string; // İşlenmiş (şeffaf/düzeltilmiş) AR görseli
  has3DModel?: boolean;         // 3D model var mı?
};

// Root Stack Param Listesi
export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  PasswordReset: undefined;
  Main: undefined;
  Profile: { userId?: string };
  Followers: { userId: string };
  Following: { userId: string };
  Favorites: undefined;
  Sold: undefined;
  Settings: undefined;
  AddProduct: undefined;
  UpdateProduct: { product: Product };
  OtherProfile: { userId: string };
  ProductDetail: { product: Product };
  UserProfile: { user: any };
  EditProfile: undefined;
  ChangeEmailAndPassword: undefined;
  About: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
  PrivacyFollowerCommentSettings: undefined;
  InboxScreen: { currentUserId: string };
  Chat: { currentUserId: string; otherUserId: string };
  Search: undefined;
  GeminiChat: undefined;
  ViewInRoom: { 
    imageUrl: string; 
    dimensions?: { height?: number | null; width?: number | null; depth?: number | null; };
  };
};