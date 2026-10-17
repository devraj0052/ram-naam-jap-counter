import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme } from '../types/shared';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ramjap_theme') as Theme;
      if (saved && ['saffron', 'dark', 'light'].includes(saved)) return saved;
    }
    return 'saffron';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light', 'theme-saffron');
    if (theme === 'dark') {
      root.classList.add('theme-dark', 'dark');
    } else if (theme === 'light') {
      root.classList.add('theme-light');
    } else {
      root.classList.add('theme-saffron');
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('ramjap_theme', t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
