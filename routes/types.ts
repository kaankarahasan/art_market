// UUID modülü TypeScript tarafından bilinmediği için declare ediyoruz
declare module 'uuid';

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
  viewCount?: number; // <--- BU SATIRI EKLEYİN
  isSeeded?: boolean;
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
};