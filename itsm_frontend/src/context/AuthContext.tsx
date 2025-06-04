// itsm_frontend/src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

// Define the shape of your authentication context
interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

// Create the context with a default (null) value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the AuthContext, with error handling
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Define props for the AuthProvider component
interface AuthProviderProps {
  children: ReactNode; // Represents the child components that the provider will wrap
}

// The AuthProvider component that manages the authentication state
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Initialize token from localStorage.
  // If token exists, user is considered authenticated.
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token') || null
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!token); // Convert token presence to boolean

  // Effect to update localStorage whenever the token changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    }
  }, [token]);

  // Login function: stores the token
  const login = (newToken: string) => {
    setToken(newToken);
  };

  // Logout function: clears the token
  const logout = () => {
    setToken(null);
  };

  // The value provided to consumers of this context
  const authContextValue: AuthContextType = {
    token,
    isAuthenticated,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};