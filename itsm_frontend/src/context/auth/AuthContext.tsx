// itsm_frontend/src/context/auth/AuthContext.tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { AuthContext, type AuthContextType, type AuthUser } from './AuthContextDefinition'; // Import context and types from definition file
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
  // State for authentication token, initially read from localStorage
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken')); // Use 'authToken' key as per LoginPage.tsx
  // State for authenticated user data
  const [user, setUser] = useState<AuthUser | null>(null);
  // State to track if the user is authenticated
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false); // Will be set to true after successful login and user data loaded
  // State to manage loading status (e.g., during initial load or login attempt)
  const [loading, setLoading] = useState<boolean>(true);

  // Effect to initialize authentication state on component mount
  useEffect(() => {
    const initializeAuth = async () => {
      // Check for token and user in localStorage
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
          // Clear invalid data
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
        setToken(null);
        setUser(null);
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
    setLoading(true);
    try {
      // Call the mock login API
      const response = await loginApi(username, password);
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user)); // Store user data
      setToken(response.token);
      setUser(response.user);
      setIsAuthenticated(true);
      return true; // Login successful
    } catch (error) {
      console.error('Login failed:', error);
      setIsAuthenticated(false);
      setToken(null);
      setUser(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      throw error; // Re-throw the error for the calling component to handle (e.g., display message)
    } finally {
      setLoading(false);
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
    // Consider navigating to login page here or letting the route guard handle it
  }, []);

  // Memoize the context value to prevent unnecessary re-renders of consumers
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
