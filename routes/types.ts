declare module 'uuid';

export type Product = {
  id: string;
  title: string;
  description: string;
  image: string;
  imageUrl: string;
  ownerId: string;
  seller?: string;
  price?: number;
  category?: string;
  createdAt?: any;
};

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  Main: undefined;
  Profile: { userId?: string };
  Followers: { userId: string };
  Following: { userId: string };
  Sold: undefined;
  Settings: undefined;
  AddProduct: undefined;
  UpdateProduct: { product: Product };
  OtherProfile: { userId: string };
  ProductDetail: { product: Product };
  UserProfile: { user: any };
  EditProfile: undefined;
};
