import React, { createContext, useState, ReactNode, useContext } from 'react';
import { DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';

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
  toggleTheme: () => {},
  colors: lightColors,
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const toggleTheme = () => setIsDarkTheme((prev) => !prev);

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
