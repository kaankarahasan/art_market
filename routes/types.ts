declare module 'uuid';

export type Product = {
  id: string;
  title: string;
  description: string;
  imageUrls: string[]; // ✅ Birden fazla görsel için
  mainImageUrl?: string; // ✅ Ana görsel (örneğin liste görünümünde kullanılır)
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
  year?: number | null; // ✅ Artık sayı olarak tutuluyor
  isSold?: boolean;
  createdAt?: any;
  updatedAt?: any;
};

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
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
