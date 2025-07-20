import React, { createContext, useState, ReactNode, useContext } from 'react';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';

interface ThemeContextProps {
  isDarkTheme: boolean;
  toggleTheme: () => void;
  colors: typeof DarkTheme.colors;
}

export const ThemeContext = createContext<ThemeContextProps>({
  isDarkTheme: false,
  toggleTheme: () => {},
  colors: DefaultTheme.colors,
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const toggleTheme = () => {
    setIsDarkTheme((prev) => !prev);
  };

  const theme = isDarkTheme ? DarkTheme : DefaultTheme;

  return (
    <ThemeContext.Provider value={{ isDarkTheme, toggleTheme, colors: theme.colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

// İsteğe bağlı: kolay kullanım için hook
export const useThemeContext = () => useContext(ThemeContext);
