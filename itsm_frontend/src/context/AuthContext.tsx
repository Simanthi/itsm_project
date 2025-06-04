// itsm_frontend/src/context/AuthContext.tsx
// This file now contains ALL logic for your authentication context.
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

// Define the shape of your AuthContext values
export interface AuthContextType {
  isAuthenticated: boolean;
  user: { name: string; role: string } | null; // User object for display
  login: (token: string, userData?: { name: string; role: string }) => void; // Token-based login with optional user data
  logout: () => void;
}

// Create the AuthContext
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const navigate = useNavigate();

  // On mount, check if token and user exist in local storage
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user'); // Retrieve stored user data
    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setIsAuthenticated(true);
        setUser(parsedUser);
      } catch (e) {
        console.error("Error parsing stored user data:", e);
        // If parsing fails, clear invalid data and log out
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
      }
    } else {
      // If token or user data is missing/invalid, ensure logged out state
      setIsAuthenticated(false);
      setUser(null);
    }
  }, []);

  // Login function - now accepts token and optional user data
  const login = useCallback((token: string, userData?: { name: string; role: string }) => {
    localStorage.setItem('authToken', token);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData)); // Store user data
      setUser(userData);
    } else {
      localStorage.removeItem('user'); // Clear user if no data is provided on login
      setUser(null);
    }
    setIsAuthenticated(true);
    navigate('/'); // Navigate to home page on successful login
  }, [navigate]);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user'); // Clear user data on logout
    setIsAuthenticated(false);
    setUser(null);
    navigate('/login'); // Redirect to login page
  }, [navigate]);

  // Memoize the context value to prevent unnecessary re-renders
  const memoizedValue = React.useMemo(() => ({
    isAuthenticated,
    user,
    login,
    logout,
  }), [isAuthenticated, user, login, logout]);

  return (
    <AuthContext.Provider value={memoizedValue}>
      {children}
    </AuthContext.Provider>
  );
};