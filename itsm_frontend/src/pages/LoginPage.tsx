// itsm_frontend/src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useAuth } from '../context/AuthContext'; // <--- Import useAuth hook

// Remove LoginPageProps interface as onLoginSuccess will be handled by context
// interface LoginPageProps {
//   onLoginSuccess: () => void;
// }

function LoginPage(/* Remove { onLoginSuccess }: LoginPageProps */) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // For loading state
  const [error, setError] = useState<string | null>(null); // For error messages
  const navigate = useNavigate();
  const { login } = useAuth(); // <--- Get login function from context

  const handleLogin = async (event: React.FormEvent) => { // <--- Make it async
    event.preventDefault();
    setLoading(true); // Start loading
    setError(null); // Clear previous errors

    console.log('Attempting login with:', { username, password });

    try {
      // --- Simulate Real API Call ---
      // In a real app, you'd replace this with an actual fetch/axios call to your Django backend
      // Example: const response = await fetch('http://localhost:8000/api/token/', { ... });
      // const data = await response.json();
      // const token = data.access_token; // Get token from response

      // Mock API delay and token
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate network delay

      if (username === 'admin' && password === 'admin') { // Simple mock credentials
        const mockToken = 'mock-jwt-token-abcdef12345'; // A mock token string
        login(mockToken); // Call context login, which stores token in localStorage
        console.log('Login successful! Navigating to homepage.');
        navigate('/'); // Navigate to the homepage
      } else {
        setError('Invalid username or password.');
        console.log('Mock Login failed: Invalid credentials.');
      }
    } catch (err) {
      setError('An unexpected error occurred during login.');
      console.error('Login error:', err);
    } finally {
      setLoading(false); // End loading
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={6} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
          ITSM Login
        </Typography>
        {error && ( // Display error message if present
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
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2, py: 1.5 }}
            disabled={loading} // Disable button while loading
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default LoginPage;