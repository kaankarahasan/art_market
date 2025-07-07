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
