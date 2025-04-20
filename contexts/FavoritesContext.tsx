import React, { createContext, useContext, useState, ReactNode } from 'react';

type Artwork = {
  id: string;
  title: string;
  image: string;
};

type FavoritesContextType = {
  favorites: Artwork[];
  addToFavorites: (item: Artwork) => void;
  removeFromFavorites: (itemId: string) => void;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const [favorites, setFavorites] = useState<Artwork[]>([]);

  const addToFavorites = (item: Artwork) => {
    setFavorites((prev) => {
      const alreadyExists = prev.some((fav) => fav.id === item.id);
      return alreadyExists ? prev : [...prev, item];
    });
  };

  const removeFromFavorites = (itemId: string) => {
    setFavorites((prev) => prev.filter((fav) => fav.id !== itemId));
  };

  return (
    <FavoritesContext.Provider value={{ favorites, addToFavorites, removeFromFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
