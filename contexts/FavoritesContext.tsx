import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- FAVORİ KULLANICILAR ---
export type FavoriteUser = {
  id: string;
  avatarUrl?: string;
  name: string;
  fullName?: string;
  bio?: string;
};

const USER_STORAGE_KEY = '@favoriteUsers';

type FavoriteUsersContextType = {
  favoriteUsers: FavoriteUser[];
  addToFavoriteUsers: (user: FavoriteUser) => void;
  removeFromFavoriteUsers: (userId: string) => void;
};

const FavoriteUsersContext = createContext<FavoriteUsersContextType | null>(null);

export const FavoriteUsersProvider = ({ children }: { children: ReactNode }) => {
  const [favoriteUsers, setFavoriteUsers] = useState<FavoriteUser[]>([]);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const storedFavorites = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (storedFavorites) setFavoriteUsers(JSON.parse(storedFavorites));
      } catch (e) {
        console.log('Error loading favorite users:', e);
      }
    };
    loadFavorites();
  }, []);

  const saveFavorites = async (users: FavoriteUser[]) => {
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.log('Error saving favorite users:', e);
    }
  };

  const addToFavoriteUsers = (user: FavoriteUser) => {
    setFavoriteUsers((prev) => {
      if (prev.find(u => u.id === user.id)) return prev;
      const updated = [...prev, user];
      saveFavorites(updated);
      return updated;
    });
  };

  const removeFromFavoriteUsers = (userId: string) => {
    setFavoriteUsers((prev) => {
      const updated = prev.filter((u) => u.id !== userId);
      saveFavorites(updated);
      return updated;
    });
  };

  return (
    <FavoriteUsersContext.Provider
      value={{ favoriteUsers, addToFavoriteUsers, removeFromFavoriteUsers }}
    >
      {children}
    </FavoriteUsersContext.Provider>
  );
};

export const useFavoriteUsers = () => {
  const context = useContext(FavoriteUsersContext);
  if (!context) throw new Error('useFavoriteUsers must be used within a FavoriteUsersProvider');
  return context;
};

// --- FAVORİ ÜRÜNLER ---
export type FavoriteItem = {
  id: string;
  title: string;
  username?: string;
  imageUrl?: string;
  imageUrls?: string[];
  price?: number;
  year?: string | number;
  [key: string]: any;
};

const ITEM_STORAGE_KEY = '@favoriteItems';

type FavoriteItemsContextType = {
  favoriteItems: FavoriteItem[];
  addFavorite: (item: FavoriteItem) => void;
  removeFavorite: (id: string) => void;
};

const FavoriteItemsContext = createContext<FavoriteItemsContextType | null>(null);

export const FavoriteItemsProvider = ({ children }: { children: ReactNode }) => {
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    const loadItems = async () => {
      try {
        const storedItems = await AsyncStorage.getItem(ITEM_STORAGE_KEY);
        if (storedItems) setFavoriteItems(JSON.parse(storedItems));
      } catch (e) {
        console.log('Error loading favorite items:', e);
      }
    };
    loadItems();
  }, []);

  const saveItems = async (items: FavoriteItem[]) => {
    try {
      await AsyncStorage.setItem(ITEM_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.log('Error saving favorite items:', e);
    }
  };

  const addFavorite = (item: FavoriteItem) => {
    setFavoriteItems((prev) => {
      if (prev.find(i => i.id === item.id)) return prev; // aynı ürün varsa ekleme
      const updated = [...prev, item];
      saveItems(updated);
      return updated;
    });
  };

  const removeFavorite = (id: string) => {
    setFavoriteItems((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      saveItems(updated);
      return updated;
    });
  };

  return (
    <FavoriteItemsContext.Provider value={{ favoriteItems, addFavorite, removeFavorite }}>
      {children}
    </FavoriteItemsContext.Provider>
  );
};

export const useFavoriteItems = () => {
  const context = useContext(FavoriteItemsContext);
  if (!context) throw new Error('useFavoriteItems must be used within a FavoriteItemsProvider');
  return context;
};
