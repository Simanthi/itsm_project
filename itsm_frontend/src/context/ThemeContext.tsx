// itsm_frontend/src/context/ThemeContext.tsx
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import type { PaletteMode } from '@mui/material'; // <--- ADD 'type' HERE!

// Define the shape of our theme context
interface ThemeContextProps {
  mode: PaletteMode;
  toggleColorMode: () => void;
}

// Create the context with default (or null) values
const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

// Custom hook to use the theme context
export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

// Theme provider component
export const ThemeContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get initial mode from local storage or default to 'light'
  const [mode, setMode] = useState<PaletteMode>(() => {
    const savedMode = localStorage.getItem('themeMode');
    return (savedMode === 'light' || savedMode === 'dark') ? savedMode : 'dark';
  });

  // Effect to save theme mode to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  // Memoize the toggle function to prevent unnecessary re-renders
  const toggleColorMode = useMemo(
    () => () => {
      setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
    },
    [],
  );

  const contextValue = useMemo(
    () => ({
      mode,
      toggleColorMode,
    }),
    [mode, toggleColorMode],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};