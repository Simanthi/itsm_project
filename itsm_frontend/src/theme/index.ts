// itsm_frontend/src/theme/index.ts
import { createTheme } from '@mui/material/styles';

// Define a custom color palette for your futuristic dark theme
const primaryColor = '#00E676'; // A vibrant green/neon color
const secondaryColor = '#82B1FF'; // A subtle blue for secondary actions
const darkBackgroundColor = '#121212'; // A deep dark grey
const paperColor = '#1e1e1e'; // Slightly lighter dark for cards/paper
const textColor = '#E0E0E0'; // Light grey for primary text
const textSecondaryColor = '#B0B0B0'; // Lighter grey for secondary text

const theme = createTheme({
  palette: {
    mode: 'dark', // Enable dark mode
    primary: {
      main: primaryColor,
      light: '#69f0ae',
      dark: '#00c853',
      contrastText: '#000', // Ensure good contrast for text on primary
    },
    secondary: {
      main: secondaryColor,
      light: '#bbdefb',
      dark: '#42a5f5',
      contrastText: '#000',
    },
    background: {
      default: darkBackgroundColor, // Main background
      paper: paperColor, // Background for Paper, Card, etc.
    },
    text: {
      primary: textColor,
      secondary: textSecondaryColor,
    },
    // You can define other colors like success, error, warning, info
    success: {
      main: '#4caf50',
    },
    error: {
      main: '#ef5350',
    },
    warning: {
      main: '#ff9800',
    },
    info: {
      main: '#2196f3',
    },
  },
  typography: {
    // --- MODIFY THESE PROPERTIES ---
    fontSize: 13, // Global base font size (default is 14). Adjust this value.
    h1: {
      fontSize: '2.5rem', // You can explicitly set sizes for variants if needed
    },
    h2: {
      fontSize: '2.1rem',
    },
    h3: {
      fontSize: '1.8rem',
    },
    h4: {
      fontSize: '1.5rem',
    },
    h5: {
      fontSize: '1.25rem',
    },
    h6: {
      fontSize: '1.0rem', // This affects the "ITSM Connect" text in the drawer too
    },
    body1: {
      fontSize: '0.9rem', // Main paragraph text
    },
    body2: {
      fontSize: '0.8rem', // Smaller paragraph text
    },
    button: {
        fontSize: '0.85rem', // Button text
    }
    // You can add more specific variants like subtitle1, subtitle2, caption, overline
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#2C2C2C', // A slightly lighter dark for the app bar
          boxShadow: 'none', // Remove shadow for a flatter, modern look
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)', // Subtle border
          borderRadius: '0 0 12px 12px',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          // Default (mobile) min-height
          minHeight: '48px', // Example: taller for mobile
          '@media (min-width:600px)': { // For screens >= 600px (sm breakpoint)
            minHeight: '56px', // Example: taller for desktop
            
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1E1E1E', // Match paper background for the drawer
          borderRight: '1px solid rgba(255, 255, 255, 0.12)', // Subtle border
          borderRadius: '0 0 12px 12px',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8, // Slightly rounded buttons
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12, // More rounded corners for cards/papers
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8, // Match button roundedness
          },
        },
      },
    },
    // You might also want to style ListItems or ListButtonItems here if needed
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8, // Apply rounded corners to menu items
          '&:hover': {
            backgroundColor: 'rgba(98, 0, 238, 0.1)', // Light hover effect using primary color
          },
        },
      },
    },
  },

});

export default theme;