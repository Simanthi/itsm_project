// itsm_frontend/src/context/auth/AuthContext.tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { AuthContext, type AuthContextType, type AuthUser } from './AuthContextDefinition';
import { loginApi } from '../../api/authApi'; // Adjust path as needed for your project

// Define the Props for AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider component manages authentication state and provides it to its children.
 * It handles login, logout, and token persistence in localStorage.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // FIX: Initialize token and isAuthenticated to null/false
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true); // Start as true, set to false after initial check

  // Effect to initialize authentication state on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          const parsedUser: AuthUser = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } catch (e) {
          console.error("Error parsing stored user data or token:", e);
          // Clear invalid or corrupted data
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        // No token or user in localStorage, so not authenticated
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false); // Authentication initialization complete
    };

    initializeAuth();
  }, []); // Empty dependency array means this runs once on mount

  /**
   * Handles the login process.
   * Calls the API, stores token/user, and updates state.
   * @param username The username for login.
   * @param password The password for login.
   * @returns A promise that resolves to true on successful login, false otherwise.
   */
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setLoading(true); // Indicate loading during login attempt
    try {
      const response = await loginApi(username, password);
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setToken(response.token);
      setUser(response.user);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      setIsAuthenticated(false);
      setToken(null);
      setUser(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      throw error;
    } finally {
      setLoading(false); // Reset loading state after login attempt
    }
  }, []);

  /**
   * Handles the logout process.
   * Clears token/user from state and localStorage.
   */
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }, []);

  const memoizedValue: AuthContextType = React.useMemo(() => ({
    token,
    user,
    isAuthenticated,
    loading,
    login,
    logout,
  }), [token, user, isAuthenticated, loading, login, logout]);

  return (
    <AuthContext.Provider value={memoizedValue}>
      {children}
    </AuthContext.Provider>
  );
};
