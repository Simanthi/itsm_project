// itsm_frontend/src/theme/theme.ts
// Remove PaletteMode from this import, as it's not directly used here.
import { createTheme } from '@mui/material'; 

// Define common typography settings
const baseTypography = {
  //fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  fontFamily: '"Segoe UI"',
    h1: {
    fontSize: '20px',
    fontWeight: 'bold',
          },
        h2: {
    fontSize: '30px',
    fontWeight: 'bold',
        
      },
      h3: {
    fontSize: '15px',
    fontWeight: 'bold',
          },
  h6: {
    fontSize: '16px',
  },
  body1: {
    fontSize: '16px',
  },
  body2: {
    fontSize: '14px',
  },
  th1: {
    fontSize: '15px',
  },
};

// --- Light Theme Definition ---
export const lightTheme = createTheme({
  palette: {
    mode: 'light', // 'light' is a string literal, not directly referencing PaletteMode type here
    primary: {
      main: 'rgb(56, 104, 124)',   // Material-UI default blue
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
      paper: 'rgb(195, 194, 194)',   // White for cards, drawers
    },
    text: {
      primary: 'rgb(0, 0, 0)',   // Dark text on light background
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
          
          fontSize: baseTypography.body2.fontSize,
          // Apply the font size directly here for all TableCell components
        },
        head: {
          // <--- ADD THIS SECTION FOR TABLE HEADERS
          fontSize: baseTypography.th1.fontSize,
          fontWeight: 'bold',  // Example: Make headers bold
          color: 'primary.main',  // Example: Use your primary theme color for headers
          
          // You can also adjust padding, background, etc.
          backgroundColor: 'rgb(25, 118, 210)', // Example: a light primary background
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgb(56, 104, 124)', // Light blue for selected nav item (with transparency)
          },
          '&.Mui-selected:hover': {
            backgroundColor: 'rgba(25, 118, 210, 0.12)',
          },
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)', // Light hover effect
            color : 'rgb(6, 91, 127)',
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
      dark: 'rgb(108, 4, 129)',
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
      paper: 'rgba(0, 0, 0, 0.55)',     // Slightly lighter dark grey for cards, drawers
    },
    text: {
      primary: 'rgb(255, 255, 255)', // White text on dark background
      secondary: 'rgb(176, 176, 176)', // Light grey secondary text on dark background
    },
  },
  shape: {
    borderRadius: 3, // Consistent border radius for all components
    // You can adjust this value to change the roundness of corners
  },
  typography: baseTypography,
  components: {
    MuiTableCell: {
      // REMOVE defaultProps: { variant: 'body2' }
      styleOverrides: {
        root: {
          
          fontSize: baseTypography.body2.fontSize,
          // Apply the font size directly here for all TableCell components
        },
        head: {
          // <--- ADD THIS SECTION FOR TABLE HEADERS
          fontSize: baseTypography.th1.fontSize,
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
            backgroundColor: 'rgb(144, 202, 249)', // Dark blue for selected nav item (with transparency)
            color : 'rgb(0, 0, 0)',
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