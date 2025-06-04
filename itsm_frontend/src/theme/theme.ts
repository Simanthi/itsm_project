// itsm_frontend/src/theme/theme.ts
// Remove PaletteMode from this import, as it's not directly used here.
import { createTheme } from '@mui/material'; 

// Define common typography settings
const baseTypography = {
  //fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  fontFamily: '"Segoe UI"',
  h6: {
    fontSize: '16px',
  },
  body1: {
    fontSize: '16px',
  },
  body2: {
    fontSize: '16px',
  },
};

// --- Light Theme Definition ---
export const lightTheme = createTheme({
  palette: {
    mode: 'light', // 'light' is a string literal, not directly referencing PaletteMode type here
    primary: {
      main: 'rgb(25, 118, 210)',   // Material-UI default blue
      light: 'rgb(66, 165, 245)',
      dark: 'rgb(21, 101, 192)',
      contrastText: 'rgb(255, 255, 255)', // White
    },
    secondary: {
      main: 'rgb(156, 39, 176)',  // Material-UI default purple
      light: 'rgb(186, 104, 200)',
      dark: 'rgb(123, 31, 162)',
      contrastText: 'rgb(255, 255, 255)', // White
    },
    background: {
      default: 'rgb(200, 200, 200)', // A very light grey for main content
      paper: 'rgb(216, 216, 216)',   // White for cards, drawers
    },
    text: {
      primary: 'rgb(33, 43, 54)',   // Dark text on light background
      secondary: 'rgb(99, 115, 129)', // Muted text on light background
    },
  },
  typography: baseTypography,
  components: {
     // Add this to apply body2 to all TableCell components by default
     MuiTableCell: {
      // REMOVE defaultProps: { variant: 'body2' }
      styleOverrides: {
        root: {
          // Apply the font size directly here for all TableCell components
          fontSize: '14px', // Matches your body2 font size
          // Or, if you want to use the 'body2' definition from typography, you could do:
          // fontSize: baseTypography.body2.fontSize,
        },
        head: {
          // <--- ADD THIS SECTION FOR TABLE HEADERS
          fontSize: '15px', // Example: Slightly smaller than body for header, or '18px' for larger
          fontWeight: 'bold',  // Example: Make headers bold
          color: 'primary.main', // Example: Use your primary theme color for headers
          
          // You can also adjust padding, background, etc.
          backgroundColor: 'rgba(25, 118, 210, 0.1)', // Example: a light primary background
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgba(25, 118, 210, 0.08)', // Light blue for selected nav item (with transparency)
          },
          '&.Mui-selected:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.12)',
          },
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)', // Light hover effect
          },
        },
      },
    },
  },
});

// --- Dark Theme Definition ---
export const darkTheme = createTheme({
  palette: {
    mode: 'dark', // 'dark' is a string literal, not directly referencing PaletteMode type here
    primary: {
      main: 'rgb(144, 202, 249)',   // Light blue for primary elements
      light: 'rgb(227, 242, 253)',
      dark: 'rgb(66, 165, 245)',
      contrastText: 'rgb(0, 0, 0)', // Black
    },
    secondary: {
      main: 'rgb(206, 147, 216)',   // Lighter purple
      light: 'rgb(243, 229, 245)',
      dark: 'rgb(171, 71, 188)',
      contrastText: 'rgb(0, 0, 0)', // Black
    },
    background: {
      default: 'rgb(18, 18, 18)',   // Very dark grey/black
      paper: 'rgb(0, 0, 0)',     // Slightly lighter dark grey for cards, drawers
    },
    text: {
      primary: 'rgb(255, 255, 255)', // White text on dark background
      secondary: 'rgb(176, 176, 176)', // Light grey secondary text on dark background
    },
  },
  typography: baseTypography,
  components: {
    MuiTableCell: {
      // REMOVE defaultProps: { variant: 'body2' }
      styleOverrides: {
        root: {
          // Apply the font size directly here for all TableCell components
          fontSize: '14px', // Matches your body2 font size
          // Or, if you want to use the 'body2' definition from typography, you could do:
          // fontSize: baseTypography.body2.fontSize,
        },
        head: {
          // <--- ADD THIS SECTION FOR TABLE HEADERS
          fontSize: '15px', // Example: Slightly smaller than body for header, or '18px' for larger
          fontWeight: 'bold',  // Example: Make headers bold
          color: 'primary.main', // Example: Use your primary theme color for headers
          // You can also adjust padding, background, etc.
          backgroundColor: 'rgba(144, 202, 249, 0.1)', // Example: a light primary background
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgba(144, 202, 249, 0.16)', // Dark blue for selected nav item (with transparency)
          },
          '&.Mui-selected:hover': {
            backgroundColor: 'rgba(144, 202, 249, 0.24)',
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)', // Dark hover effect
          },
        },
      },
    },
  },
});