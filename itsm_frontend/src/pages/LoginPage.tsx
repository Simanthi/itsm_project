// itsm_frontend/src/pages/LoginPage.tsx
import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';

import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const theme = useTheme();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    console.log('Attempting login with:', { username, password });

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (username === 'admin' && password === 'admin') {
        const mockToken = 'mock-jwt-token-abcdef12345';
        const mockUser = { name: 'IT Admin', role: 'admin' };
        login(mockToken, mockUser);
        console.log('Login successful! AuthContext handles navigation.');
      } else {
        setError('Invalid username or password.');
        console.log('Mock Login failed: Invalid credentials.');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'An unexpected error occurred during login.');
      } else if (typeof err === 'string') {
        setError(err);
      } else {
        setError('An unknown error occurred during login.');
      }
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container
      component="main"
      maxWidth="sm"
      
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: theme.palette.background.default,
        borderRadius: theme.shape.borderRadius,
        
      }}
    >
      
      <Paper
        elevation={10} 
        sx={{
          paddingBottom: 3,
          paddingTop: 3,
          paddingLeft: 4,
          paddingRight: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '80%',
          height: '80%',
          bgcolor: theme.palette.background.paper,
          borderRadius: theme.shape.borderRadius,
        }}
      >
        <img
          src="/images/sblt_fav_icon.png"
          alt="SBLT Logo"
          style={{ maxWidth: '100px', height: 'auto', marginBottom: '8px' }}
        />
        <Typography
          component="h1"
          variant="h3"
          sx={{
            mb: 3,
            color: theme.palette.primary.main,
          }}
        >
          IT Service Management
        </Typography>
        <Typography
        component="h1"
        variant="h2"
        sx={{
          mb: 3,
          textAlign: 'center',
          color: theme.palette.text.secondary,
        }}
      >
        Login
      </Typography>


        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleLogin} sx={{ mt: 1, width: '100%' }}>
          {/* Username TextField */}
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            variant="outlined"
            InputProps={{
              sx: {
                // Removed !important here. Base InputProps should take normal precedence.
                backgroundColor: 'transparent',
                background: 'none',
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                // Removed !important here. The root container of the outlined input.
                backgroundColor: 'transparent',
                background: 'none',
                borderRadius: theme.shape.borderRadius,
                '&.Mui-focused': {
                  // Removed !important here. Focused state of the root container.
                  backgroundColor: 'transparent',
                  background: 'none',
                },
                '&:hover': {
                  // Removed !important here. Hover state of the root container.
                  backgroundColor: 'transparent',
                  background: 'none',
                },
              },
              // Targeting the actual input element where autofill applies its styles.
              '& .MuiOutlinedInput-input': {
                fontSize: '1.0rem',
                color: theme.palette.text.primary,
                padding: '14px',
                // KEEP !important here for browser autofill override
                '&:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
                  WebkitTextFillColor: theme.palette.text.primary,
                  transition: 'background-color 5000s ease-in-out 0s',
                },
                // Keeping this for broader compatibility, also needs !important
                '&:-internal-autofill-selected': {
                  WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
                  WebkitTextFillColor: theme.palette.text.primary,
                  transition: 'background-color 5000s ease-in-out 0s',
                },
              },
              '& .MuiInputLabel-root': {
                fontSize: '18px',
                color: theme.palette.text.primary,
              },
              '& .MuiInputLabel-shrink': {
                fontSize: '18px',
              },
            }}
          />

          {/* Password TextField (same cleanup applied) */}
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            variant="outlined"
            InputProps={{
              sx: {
                backgroundColor: 'transparent', // Removed !important
                background: 'none', // Removed !important
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'transparent', // Removed !important
                background: 'none', // Removed !important
                borderRadius: theme.shape.borderRadius,
                '&.Mui-focused': {
                  backgroundColor: 'transparent', // Removed !important
                  background: 'none', // Removed !important
                },
                '&:hover': {
                  backgroundColor: 'transparent', // Removed !important
                  background: 'none', // Removed !important
                },
                borderWidth: '0px',
              },
              '& .MuiOutlinedInput-input': {
                fontSize: '1.0rem',
                color: theme.palette.text.primary,
                padding: '14px',
                // KEEP !important here for browser autofill override
                '&:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
                  WebkitTextFillColor: theme.palette.text.primary,
                  transition: 'background-color 5000s ease-in-out 0s',
                },
                // Keeping this for broader compatibility, also needs !important
                '&:-internal-autofill-selected': {
                  WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
                  WebkitTextFillColor: theme.palette.text.primary,
                  transition: 'background-color 5000s ease-in-out 0s',
                },
              },
              '& .MuiInputLabel-root': {
                fontSize: '18px',
                color: theme.palette.text.primary,
              },
              '& .MuiInputLabel-shrink': {
                fontSize: '18px',
              },
            }}
          />
          <Button
            type="submit"
            
            variant="contained"
            sx={{ mt: 3, mb: 2, py: 1.5 }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default LoginPage;