import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';
import { DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// interface yerine type kullandık
type ExtendedColors = Theme['colors'] & {
  secondaryText: string;
};

interface ThemeContextProps {
  isDarkTheme: boolean;
  toggleTheme: () => void;
  colors: ExtendedColors;
}

// Default değerler
const lightColors: ExtendedColors = {
  ...DefaultTheme.colors,
  secondaryText: '#6E6E6E', // ekstra renk
};

const darkColors: ExtendedColors = {
  ...DarkTheme.colors,
  secondaryText: '#aaa', // ekstra renk
};

export const ThemeContext = createContext<ThemeContextProps>({
  isDarkTheme: false,
  toggleTheme: () => { },
  colors: lightColors,
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('THEME_PREFERENCE');
        if (storedTheme !== null) {
          setIsDarkTheme(storedTheme === 'dark');
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkTheme;
      setIsDarkTheme(newTheme);
      await AsyncStorage.setItem('THEME_PREFERENCE', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const colors = isDarkTheme ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDarkTheme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook: Context'i kullanmayı kolaylaştırır
export const useThemeContext = (): ThemeContextProps => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemeContext must be used within a ThemeProvider');
  return context;
};
