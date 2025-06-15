// src/context/ThemeContext/index.ts
import { createContext } from 'react';

export interface ThemeContextType {
  currentThemeName: string;
  setCurrentTheme: (themeName: string) => void;
  availableThemes: string[]; // List of theme names like ['light', 'dark', 'oceanic', etc.]
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);
