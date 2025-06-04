// itsm_frontend/src/pages/LoginPage.tsx
import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  CircularProgress, // For loading indicator
  Alert, // For error messages
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '../context/AuthContext'; // Correct import path

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // For loading state
  const [error, setError] = useState<string | null>(null); // For error messages
  const { login } = useAuth(); // Get login function from context

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); // Start loading
    setError(null); // Clear previous errors

    console.log('Attempting login with:', { username, password });

    try {
      // Mock API delay and token and user data
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate network delay

      if (username === 'admin' && password === 'admin') { // Simple mock credentials
        const mockToken = 'mock-jwt-token-abcdef12345'; // A mock token string
        const mockUser = { name: 'IT Admin', role: 'admin' };
        login(mockToken, mockUser);
        console.log('Login successful! AuthContext handles navigation.');
      } else {
        setError('Invalid username or password.');
        console.log('Mock Login failed: Invalid credentials.');
      }
    } catch (err: unknown) { // <--- CHANGED: Use 'unknown' here
      // <--- ADDED: Type narrowing to safely access error properties
      if (err instanceof Error) {
        setError(err.message || 'An unexpected error occurred during login.');
      } else if (typeof err === 'string') {
        setError(err); // If it's a string error
      } else {
        setError('An unknown error occurred during login.');
      }
      console.error('Login error:', err);
    } finally {
      setLoading(false); // End loading
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'primary.dark' }}>
      <Paper elevation={6} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', bgcolor: 'background.paper'}}>
        <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          ITSM Login
        </Typography>
        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={handleLogin} sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            variant="outlined"
            size="small"
            InputLabelProps={{ style: { color: 'inherit' } }}
            InputProps={{ style: { color: 'inherit' } }}
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
            size="small"
            InputLabelProps={{ style: { color: 'inherit' } }}
            InputProps={{ style: { color: 'inherit' } }}
          />
          <Button
            type="submit"
            fullWidth
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