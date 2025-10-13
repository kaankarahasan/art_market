import React, { createContext, useState, ReactNode, useContext } from 'react';

// SoldContext'in tipi
interface SoldContextType {
  soldCount: number;
  setSoldCount: (count: number) => void;
}

// Default değer olarak boş bir değer sağlıyoruz
const defaultContextValue: SoldContextType = {
  soldCount: 0,
  setSoldCount: () => {}, // Placeholder fonksiyon
};

// Context oluşturuluyor
export const SoldContext = createContext<SoldContextType>(defaultContextValue);

interface SoldProviderProps {
  children: ReactNode;
}

// Provider bileşeni, soldCount'u yönetecek
export const SoldProvider = ({ children }: SoldProviderProps) => {
  const [soldCount, setSoldCount] = useState<number>(0);

  return (
    <SoldContext.Provider value={{ soldCount, setSoldCount }}>
      {children}
    </SoldContext.Provider>
  );
};

// useSold Hook'u: SoldContext'i kullanmak için
export const useSold = (): SoldContextType => {
  const context = useContext(SoldContext);
  if (!context) throw new Error('useSold must be used within a SoldProvider');
  return context;
};
