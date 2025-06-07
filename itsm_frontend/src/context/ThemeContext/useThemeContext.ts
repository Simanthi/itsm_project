// src/context/ThemeContext/useThemeContext.ts
import { useContext } from 'react';
// Corrected: Added 'type' for ThemeContextType
import { ThemeContext, type ThemeContextType } from './';

export function useThemeContext(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeContextProvider');
  }
  return context;
}