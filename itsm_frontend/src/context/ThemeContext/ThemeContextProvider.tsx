// src/context/ThemeContext/ThemeContextProvider.tsx
import {
  useState,
  useMemo,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { themes } from '../../theme/theme'; // Import all themes
import { ThemeContext } from './'; // <<<--- THIS IS LINE 5. IT MUST BE EXACTLY THIS.

interface ThemeContextProviderProps {
  children: ReactNode;
}

// --- Fix: Add ThemeName union type for all theme keys ---
type ThemeName = keyof typeof themes;

const defaultThemeName: ThemeName = 'light'; // Or Object.keys(themes)[0] if 'light' might not exist

export function ThemeContextProvider({ children }: ThemeContextProviderProps) {
  const [currentThemeName, setCurrentThemeName] = useState<ThemeName>(() => {
    try {
      const storedThemeName = localStorage.getItem('themeName');
      // Only allow valid theme names
      if (storedThemeName && storedThemeName in themes) {
        return storedThemeName as ThemeName;
      }
      return defaultThemeName;
    } catch (error) {
      console.error('Error reading themeName from localStorage', error);
      return defaultThemeName;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('themeName', currentThemeName);
    } catch (error) {
      console.error('Error saving themeName to localStorage', error);
    }
  }, [currentThemeName]);

  const setCurrentTheme = useCallback((themeName: string) => {
    if (themeName in themes) {
      setCurrentThemeName(themeName as ThemeName);
    } else {
      console.warn(
        `Theme "${themeName}" not found. Defaulting to "${defaultThemeName}".`,
      );
      setCurrentThemeName(defaultThemeName);
      localStorage.setItem('themeName', defaultThemeName); // also update LS for the default
    }
  }, []);

  const theme = useMemo(() => {
    return themes[currentThemeName] || themes[defaultThemeName];
  }, [currentThemeName]);

  const availableThemes = useMemo(() => Object.keys(themes) as ThemeName[], []);

  const contextValue = useMemo(
    () => ({
      currentThemeName,
      setCurrentTheme,
      availableThemes,
    }),
    [currentThemeName, setCurrentTheme, availableThemes],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
