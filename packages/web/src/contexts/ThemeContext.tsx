import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeName =
  | 'light'
  | 'dark'
  | 'solarized-light'
  | 'solarized-dark'
  | 'grayscale'
  | 'high-contrast'
  | 'nord'
  | 'dracula';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  themes: { name: ThemeName; label: string; description: string }[];
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_STORAGE_KEY = 'possumbly-theme';

export const themes: { name: ThemeName; label: string; description: string }[] = [
  { name: 'light', label: 'Light', description: 'Clean, bright interface' },
  { name: 'dark', label: 'Dark', description: 'Easy on the eyes' },
  { name: 'solarized-light', label: 'Solarized Light', description: 'Warm, balanced tones' },
  { name: 'solarized-dark', label: 'Solarized Dark', description: 'Low contrast, warm dark' },
  { name: 'grayscale', label: 'Grayscale', description: 'Monochrome accessibility' },
  { name: 'high-contrast', label: 'High Contrast', description: 'Maximum readability' },
  { name: 'nord', label: 'Nord', description: 'Arctic, bluish tones' },
  { name: 'dracula', label: 'Dracula', description: 'Dark purple aesthetic' },
];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null;
      if (saved && themes.some((t) => t.name === saved)) {
        return saved;
      }
      // Check system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  useEffect(() => {
    // Remove all theme classes
    document.documentElement.classList.remove(...themes.map((t) => `theme-${t.name}`));
    // Add current theme class
    document.documentElement.classList.add(`theme-${theme}`);
    // Store preference
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
