// itsm_frontend/src/theme/theme.ts
import { createTheme, alpha, lighten, darken } from '@mui/material/styles';
import type { Theme, ThemeOptions } from '@mui/material/styles'; // Added Theme

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
      main: 'rgb(56, 104, 124)', // Material-UI default blue
      light: 'rgb(66, 165, 245)',
      dark: 'rgb(21, 101, 192)',
      contrastText: 'rgb(223, 223, 223)', // White
    },
    secondary: {
      main: 'rgb(156, 39, 176)', // Material-UI default purple
      light: 'rgb(186, 104, 200)',
      dark: 'rgb(123, 31, 162)',
      contrastText: 'rgb(255, 255, 255)', // White
    },
    background: {
      default: 'rgb(200, 200, 200)', // A very light grey for main content
      paper: 'rgb(195, 194, 194)', // White for cards, drawers
    },
    text: {
      primary: 'rgb(0, 0, 0)', // Dark text on light background
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
          fontWeight: 'bold', // Example: Make headers bold
          color: 'primary.main', // Example: Use your primary theme color for headers

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
            color: 'rgb(6, 91, 127)',
          },
        },
      },
    },
  },
});

// --- Dark Theme Definition ---
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: 'rgb(144, 202, 249)',
      light: 'rgb(227, 242, 253)',
      dark: 'rgb(108, 4, 129)',
      contrastText: 'rgb(0, 0, 0)',
    },
    secondary: {
      main: 'rgb(206, 147, 216)',
      light: 'rgb(243, 229, 245)',
      dark: 'rgb(171, 71, 188)',
      contrastText: 'rgb(0, 0, 0)',
    },
    background: {
      default: 'rgb(18, 18, 18)',
      paper: 'rgba(0, 0, 0, 0.55)',
    },
    text: {
      primary: 'rgb(255, 255, 255)',
      secondary: 'rgb(176, 176, 176)',
    },
  },
  shape: {
    borderRadius: 3,
  },
  typography: baseTypography,
  components: {
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: baseTypography.body2.fontSize,
        },
        head: ({ theme }: { theme: Theme }) => ({ // Typed theme parameter
          fontSize: baseTypography.th1.fontSize,
          fontWeight: 'bold',
          color: theme.palette.primary.main,
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
        }),
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': ({ theme }: { theme: Theme }) => ({ // Typed theme parameter
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
          }),
          '&.Mui-selected:hover': ({ theme }: { theme: Theme }) => ({ // Typed theme parameter
            backgroundColor: alpha(theme.palette.primary.main, 0.24),
          }),
          '&:hover': ({ theme }: { theme: Theme }) => ({ // Typed theme parameter for color
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            color: theme.palette.primary.light,
          }),
        },
      },
    },
  },
});

// --- Common Component Overrides for new themes ---

// For new LIGHT mode themes
const commonLightModeComponents: ThemeOptions['components'] = {
  MuiTableCell: {
    styleOverrides: {
      root: { fontSize: baseTypography.body2.fontSize },
      head: ({ theme }: { theme: Theme }) => ({ // Typed theme parameter
        fontSize: baseTypography.th1.fontSize,
        fontWeight: 'bold',
        color: theme.palette.primary.main,
        backgroundColor: alpha(theme.palette.primary.main, 0.08), // Adjusted alpha for light themes
      }),
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        '&.Mui-selected': ({ theme }: { theme: Theme }) => ({ // Typed theme parameter
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
        }),
        '&.Mui-selected:hover': ({ theme }: { theme: Theme }) => ({ // Typed theme parameter
          backgroundColor: alpha(theme.palette.primary.dark, 0.12),
        }),
        '&:hover': ({ theme }: { theme: Theme }) => ({ // Typed theme parameter for color
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
          color: theme.palette.primary.dark,
        }),
      },
    },
  },
};

// For new DARK mode themes (reusing structure from darkTheme with generic palette access)
const commonDarkModeComponents: ThemeOptions['components'] = {
  MuiTableCell: {
    styleOverrides: {
      root: {
        fontSize: baseTypography.body2.fontSize,
      },
      head: ({ theme }: { theme: Theme }) => ({ // Typed theme parameter
        fontSize: baseTypography.th1.fontSize,
        fontWeight: 'bold',
        color: theme.palette.primary.main,
        backgroundColor: alpha(theme.palette.primary.main, 0.1),
      }),
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        '&.Mui-selected': ({ theme }: { theme: Theme }) => ({ // Typed theme parameter
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
        }),
        '&.Mui-selected:hover': ({ theme }: { theme: Theme }) => ({ // Typed theme parameter
          backgroundColor: alpha(theme.palette.primary.main, 0.24),
        }),
        '&:hover': ({ theme }: { theme: Theme }) => ({ // Typed theme parameter for color
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          color: theme.palette.primary.light,
        }),
      },
    },
  },
};


// --- Oceanic Theme (Light Mode) ---
export const oceanicTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: 'rgb(0, 119, 190)', // Deep Blue/Teal
      light: lighten('rgb(0, 119, 190)', 0.2),
      dark: darken('rgb(0, 119, 190)', 0.2),
      contrastText: '#ffffff',
    },
    secondary: {
      main: 'rgb(240, 160, 112)', // Sandy Brown/Coral
      light: lighten('rgb(240, 160, 112)', 0.2),
      dark: darken('rgb(240, 160, 112)', 0.2),
      contrastText: 'rgb(62, 39, 35)', // Dark brown
    },
    background: {
      default: 'rgb(224, 247, 250)', // Very Light Blue
      paper: '#ffffff',
    },
    text: {
      primary: 'rgb(1, 87, 155)', // Dark Blue
      secondary: 'rgb(79, 131, 204)', // Muted Blue
    },
  },
  typography: baseTypography,
  shape: { borderRadius: 3 },
  components: commonLightModeComponents,
});

// --- Forest Theme (Dark Mode) ---
export const forestTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: 'rgb(76, 175, 80)', // Leaf Green (using MUI green 500 as example)
      light: lighten('rgb(76, 175, 80)', 0.3),
      dark: darken('rgb(76, 175, 80)', 0.3),
      contrastText: '#000000', // Black for contrast on green
    },
    secondary: {
      main: 'rgb(121, 85, 72)', // Earthy Brown (MUI brown 500)
      light: lighten('rgb(121, 85, 72)', 0.2),
      dark: darken('rgb(121, 85, 72)', 0.2),
      contrastText: '#ffffff', // White for contrast on brown
    },
    background: {
      default: 'rgb(27, 38, 28)', // Very Dark Green/Black
      paper: 'rgb(41, 61, 43)', // Darker Green
    },
    text: {
      primary: 'rgb(200, 230, 201)', // Light Green/Off-white
      secondary: 'rgb(165, 214, 167)', // Lighter Green
    },
  },
  typography: baseTypography,
  shape: { borderRadius: 3 },
  components: commonDarkModeComponents,
});

// --- Sunset Theme (Light Mode) ---
export const sunsetTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: 'rgb(255, 112, 67)', // Deep Orange (MUI deepOrange 400)
      light: lighten('rgb(255, 112, 67)', 0.2),
      dark: darken('rgb(255, 112, 67)', 0.2),
      contrastText: 'rgb(255, 255, 255)', // White
    },
    secondary: {
      main: 'rgb(255, 202, 40)', // Warm Yellow (MUI amber 400)
      light: lighten('rgb(255, 202, 40)', 0.2),
      dark: darken('rgb(255, 202, 40)', 0.2),
      contrastText: 'rgb(62, 39, 35)', // Dark brown
    },
    background: {
      default: 'rgb(255, 243, 224)', // Light Yellow/Off-white
      paper: '#ffffff',
    },
    text: {
      primary: 'rgb(93, 64, 55)', // Dark Brown
      secondary: 'rgb(191, 54, 12)', // Deep Orange/Red
    },
  },
  typography: baseTypography,
  shape: { borderRadius: 3 },
  components: commonLightModeComponents,
});

// --- Matrix Theme (Dark Mode) ---
export const matrixTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: 'rgb(57, 255, 20)', // Bright Green
      light: lighten('rgb(57, 255, 20)', 0.3),
      dark: darken('rgb(57, 255, 20)', 0.3),
      contrastText: '#000000', // Black
    },
    secondary: {
      main: 'rgb(0, 143, 17)', // Darker Green
      light: lighten('rgb(0, 143, 17)', 0.2),
      dark: darken('rgb(0, 143, 17)', 0.2),
      contrastText: '#ffffff', // White
    },
    background: {
      default: '#000000', // Black
      paper: 'rgb(13, 13, 13)', // Very Dark Grey
    },
    text: {
      primary: 'rgb(57, 255, 20)', // Bright Green
      secondary: 'rgb(0, 194, 41)', // Slightly Dimmer Bright Green
    },
  },
  typography: baseTypography,
  shape: { borderRadius: 3 },
  components: commonDarkModeComponents,
});

// --- Vintage Theme (Light Mode) ---
export const vintageTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: 'rgb(121, 85, 72)', // Sepia/Brown (MUI brown 500)
      light: lighten('rgb(121, 85, 72)', 0.2),
      dark: darken('rgb(121, 85, 72)', 0.2),
      contrastText: '#ffffff', // White
    },
    secondary: {
      main: 'rgb(163, 133, 96)', // Muted Gold/Yellow
      light: lighten('rgb(163, 133, 96)', 0.2),
      dark: darken('rgb(163, 133, 96)', 0.2),
      contrastText: 'rgb(62, 39, 35)', // Dark brown
    },
    background: {
      default: 'rgb(245, 245, 220)', // Cream/Off-white (Beige)
      paper: 'rgb(255, 253, 245)', // Lighter Cream
    },
    text: {
      primary: 'rgb(62, 39, 35)', // Dark Brown
      secondary: 'rgb(93, 64, 55)', // Slightly Lighter Dark Brown
    },
  },
  typography: baseTypography,
  shape: { borderRadius: 3 },
  components: commonLightModeComponents,
});

// Export all themes
export const themes = {
  light: lightTheme,
  dark: darkTheme,
  oceanic: oceanicTheme,
  forest: forestTheme,
  sunset: sunsetTheme,
  matrix: matrixTheme,
  vintage: vintageTheme,
};
