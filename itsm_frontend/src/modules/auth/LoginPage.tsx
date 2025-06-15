// itsm_frontend/src/modules/auth/LoginPage.tsx
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
import { useAuth } from '../../context/auth/useAuth'; // Updated import path for useAuth
import { useNavigate } from 'react-router-dom'; // Import useNavigate for explicit navigation

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate(); // Initialize useNavigate

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    console.log('Attempting login with:', { username, password });

    try {
      await login(username, password); // Call the login function from AuthContext
      console.log('Login successful! Navigating to dashboard.');
      navigate('/'); // Navigate to the home/dashboard page on success
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
        <Box
          component="form"
          onSubmit={handleLogin}
          sx={{ mt: 1, width: '100%' }}
        >
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
                backgroundColor: 'transparent',
                background: 'none',
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'transparent',
                background: 'none',
                borderRadius: theme.shape.borderRadius,
                '&.Mui-focused': {
                  backgroundColor: 'transparent',
                  background: 'none',
                },
                '&:hover': {
                  backgroundColor: 'transparent',
                  background: 'none',
                },
              },
              '& .MuiOutlinedInput-input': {
                fontSize: '1.0rem',
                color: theme.palette.text.primary,
                padding: '14px',
                '&:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
                  WebkitTextFillColor: theme.palette.text.primary,
                  transition: 'background-color 5000s ease-in-out 0s',
                },
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
                backgroundColor: 'transparent',
                background: 'none',
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'transparent',
                background: 'none',
                borderRadius: theme.shape.borderRadius,
                '&.Mui-focused': {
                  backgroundColor: 'transparent',
                  background: 'none',
                },
                '&:hover': {
                  backgroundColor: 'transparent',
                  background: 'none',
                },
                borderWidth: '0px',
              },
              '& .MuiOutlinedInput-input': {
                fontSize: '1.0rem',
                color: theme.palette.text.primary,
                padding: '14px',
                '&:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 1000px transparent inset !important',
                  WebkitTextFillColor: theme.palette.text.primary,
                  transition: 'background-color 5000s ease-in-out 0s',
                },
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
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Sign In'
            )}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
export default LoginPage;
