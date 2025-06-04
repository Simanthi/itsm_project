// itsm_frontend/src/theme.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark', // Dark mode for a futuristic feel
    primary: {
      main: '#6200EE', // A deep purple, often associated with tech/futuristic themes
      light: '#9e47ff',
      dark: 'rgb(0, 0, 0)',
      
    },
    secondary: {
      main: '#03DAC6', // A vibrant teal for accents
      light: '#6dffff',
      dark: 'rgba(31, 2, 65, 0.7)', // Slightly subdued for a modern look
      
    },
    background: {
      default: '#121212', // Very dark background
      paper: '#1E1E1E', // Slightly lighter dark for cards/dialogs
    },
    text: {
      primary: '#E0E0E0', // Light grey for main text
      secondary: '#A0A0A0', // Slightly darker grey for secondary text
    },
  },
  typography: {
    fontFamily: 'Segoe UI', // Set the primary font family
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
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(58, 1, 138, 0.28)', // A slightly lighter dark for the app bar
          boxShadow: 'none', // Remove shadow for a flatter, modern look
          borderBottom: '0px solid rgb(0, 0, 0)', // Subtle border
          borderRadius: '0 0 12px 0px', // Bottom corners rounded
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: '40px', // Default (mobile) min-height
          '@media (min-width:600px)': { // For screens >= 600px (sm breakpoint)
            minHeight: '50px', // Taller for desktop
          },
          
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        
        paper: {
          
          backgroundColor: 'rgb(14, 13, 13)', // Match paper background for the drawer
          borderRight: '0px solid rgb(0, 0, 0)', // Subtle border
          borderRadius: '0 0 12px 0px', // Bottom corners rounded
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8, // Slightly rounded buttons
          '&:hover': {
            color: '#FFFFFF', // Pure white text on hover
          },
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
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8, // Apply rounded corners to menu items
          '&:hover': {
            backgroundColor: 'rgba(98, 0, 238, 0.1)', // Light hover effect using primary color
            '& .MuiListItemText-primary': { // Ensures text is white on hover
              color: '#FFFFFF',
            },
            '& .MuiListItemIcon-root': { // Targets the icon for color change on hover
              color: '#03DAC6', // Use secondary.main for icon color on hover
            },
          },
          // Default icon color (when not hovered)
          '& .MuiListItemIcon-root': {
             color: 'rgba(224, 224, 224, 0.7)', // Subdued primary text color for default
          },
          // Default text color (when not hovered)
          '& .MuiListItemText-primary': {
             color: 'rgba(224, 224, 224, 0.7)', // Default primary text color
          },
        },
      },
    },
  },
});

export default theme;