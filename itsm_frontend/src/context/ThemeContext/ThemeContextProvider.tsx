// src/context/ThemeContext/ThemeContextProvider.tsx
import React, { useState, useMemo, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { lightTheme, darkTheme } from '../../theme/theme'; // Path to theme.ts (assuming src/theme/theme.ts)
import { ThemeContext } from './'; // <<<--- THIS IS LINE 5. IT MUST BE EXACTLY THIS.

interface ThemeContextProviderProps {
  children: ReactNode;
}

export function ThemeContextProvider({ children }: ThemeContextProviderProps) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  const toggleColorMode = useMemo(
    () => () => {
      setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
    },
    [],
  );

  const theme = useMemo(() => (mode === 'light' ? lightTheme : darkTheme), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleColorMode }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}