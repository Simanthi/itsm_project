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

const defaultThemeName = 'light'; // Or Object.keys(themes)[0] if 'light' might not exist

export function ThemeContextProvider({ children }: ThemeContextProviderProps) {
  const [currentThemeName, setCurrentThemeName] = useState<string>(() => {
    try {
      const storedThemeName = localStorage.getItem('themeName');
      return storedThemeName && themes[storedThemeName]
        ? storedThemeName
        : defaultThemeName;
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
    if (themes[themeName]) {
      setCurrentThemeName(themeName);
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

  const availableThemes = useMemo(() => Object.keys(themes), []);

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
