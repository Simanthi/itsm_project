// src/context/ThemeContext/index.ts
import { createContext } from 'react';

export interface ThemeContextType {
  mode: 'light' | 'dark';
  toggleColorMode: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);
