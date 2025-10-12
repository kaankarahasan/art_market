import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../routes/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@favorites';

const FavoritesContext = createContext<{
  favorites: Product[];
  addToFavorites: (product: Product) => void;
  removeFromFavorites: (productId: string) => void;
} | null>(null);

export const FavoritesProvider = ({ children }: { children: React.ReactNode }) => {
  const [favorites, setFavorites] = useState<Product[]>([]);

  // Uygulama açıldığında AsyncStorage'dan yükle
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const storedFavorites = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedFavorites) setFavorites(JSON.parse(storedFavorites));
      } catch (e) {
        console.log('Error loading favorites:', e);
      }
    };
    loadFavorites();
  }, []);

  // Favorileri AsyncStorage'a kaydet
  const saveFavorites = async (newFavorites: Product[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
    } catch (e) {
      console.log('Error saving favorites:', e);
    }
  };

  const addToFavorites = (product: Product) => {
    setFavorites((prev) => {
      const updated = [...prev, product];
      saveFavorites(updated);
      return updated;
    });
  };

  const removeFromFavorites = (productId: string) => {
    setFavorites((prev) => {
      const updated = prev.filter((p) => p.id !== productId);
      saveFavorites(updated);
      return updated;
    });
  };

  return (
    <FavoritesContext.Provider value={{ favorites, addToFavorites, removeFromFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used within a FavoritesProvider');
  return context;
};
