import React, { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  AuthContext,
  type AuthContextType,
  type AuthUser,
} from './AuthContextDefinition';
import { loginApi, logoutApi as backendLogoutApi } from '../../api/authApi'; // Renamed logoutApi to avoid conflict
import { apiClient, AuthError } from '../../api/apiClient'; // Imported AuthError

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true); // Initial state is loading

  // Effect hook to initialize authentication state from localStorage on component mount.
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');

      console.log('AuthContext: Initializing authentication...');
      console.log(
        'AuthContext: Stored Token:',
        storedToken ? 'Found' : 'Not Found',
      );
      console.log(
        'AuthContext: Stored User:',
        storedUser ? 'Found' : 'Not Found',
      );

      if (storedToken && storedUser) {
        try {
          const parsedUser: AuthUser = JSON.parse(storedUser);
          // Validate parsed user data to ensure it's valid and has a non-zero ID.
          if (
            parsedUser &&
            parsedUser.id !== undefined &&
            parsedUser.id !== null &&
            parsedUser.id !== 0
          ) {
            setToken(storedToken);
            setUser(parsedUser);
            setIsAuthenticated(true);
            console.log(
              'AuthContext: Successfully parsed stored user. User ID:',
              parsedUser.id,
              'User Name:',
              parsedUser.name,
            );
          } else {
            // If stored user data is invalid, clear it and set to unauthenticated.
            console.error(
              'AuthContext: Stored user data is invalid (missing or zero ID). Clearing.',
            );
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch (e) {
          // Catch any parsing errors for malformed localStorage data.
          console.error(
            'AuthContext: Error parsing stored user data or token:',
            e,
          );
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
          console.log(
            'AuthContext: Cleared invalid stored auth data due to parsing error.',
          );
        }
      } else {
        // No stored token or user, so set to unauthenticated.
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        console.log(
          'AuthContext: No stored auth data. User is not authenticated.',
        );
      }
      setLoading(false); // Authentication initialization is complete.
      console.log('AuthContext: Authentication initialization complete.');
    };

    initializeAuth();
  }, []); // Empty dependency array means this runs only once on component mount.

  // Callback for handling user login.
  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      setLoading(true); // Set loading true during login process.
      try {
        console.log(
          'AuthContext: Attempting login via API for user:',
          username,
        );
        const response = await loginApi(username, password); // Call the login API function.

        // Crucial validation: Ensure the user object received from loginApi has a valid, non-zero ID.
        if (
          !response.user ||
          response.user.id === undefined ||
          response.user.id === null ||
          response.user.id === 0
        ) {
          console.error(
            'AuthContext: Login API returned invalid user ID (undefined, null, or zero). Aborting login. User:',
            response.user,
          );
          throw new Error(
            'Invalid user ID returned from login API. Please check backend configuration.',
          );
        }

        // Store the token and user object in localStorage upon successful login.
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('user', JSON.stringify(response.user)); // Store user object including ID.

        // Update React state with the new authentication details.
        setToken(response.token);
        setUser(response.user);
        setIsAuthenticated(true);

        console.log(
          'AuthContext: Login successful! User ID set in context:',
          response.user.id,
          'User Name:',
          response.user.name,
        );
        return true; // Indicate successful login.
      } catch (error) {
        // Handle any errors during the login process.
        console.error('AuthContext: Login failed:', error);
        setIsAuthenticated(false);
        setToken(null);
        setUser(null);
        localStorage.removeItem('authToken'); // Clear local storage on failed login.
        localStorage.removeItem('user');
        console.log(
          'AuthContext: Login failed, cleared auth state in context and local storage.',
        );
        throw error; // Re-throw the error for component-level error handling (e.g., in LoginPage).
      } finally {
        setLoading(false); // Set loading false after login attempt.
      }
    },
    [],
  ); // login dependency array is empty as it uses stable external functions.

  // Callback for handling user logout.
  const logout = useCallback(() => {
    console.log('AuthContext: Performing logout.');
    // Attempt to log out on the backend if a token exists.
    if (token) {
      backendLogoutApi(token).catch((err) =>
        console.error('AuthContext: Backend logout failed:', err),
      );
    }
    // Clear React state and localStorage.
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    console.log(
      'AuthContext: Auth state cleared for logout in context and local storage.',
    );
  }, [token]); // 'token' is a dependency because backendLogoutApi uses it.

  const authenticatedFetch = useCallback(
    async <T = unknown>(endpoint: string, options?: RequestInit): Promise<T> => { // Made generic with T = unknown
      if (!token) {
        console.error('authenticatedFetch: No token available.');
        // Optionally, call logout() here if missing token should always force logout
        // logout();
        throw new Error('No authentication token available. Please log in.');
      }

      try {
        // Pass generic type T to apiClient
        const result = await apiClient<T>(endpoint, token!, options);
        return result;
      } catch (error: unknown) {
        // Check if the error is an instance of AuthError
        if (error instanceof AuthError) {
          console.warn(
            'authenticatedFetch: AuthError instance caught. Logging out.',
            error,
          );
          logout(); // Clear session and redirect
          // Re-throw the original error or a more specific session expiry error
          // It might be useful for the caller to know the original error
          throw error;
        }
        // For non-auth errors, just re-throw
        throw error;
      }
    },
    [token, logout], // Dependencies: token for the API call, logout for error handling
  );

  // Memoize the context value to prevent unnecessary re-renders of consuming components.
  const memoizedValue: AuthContextType = React.useMemo(
    () => ({
      token,
      user,
      isAuthenticated,
      loading,
      login,
      logout,
      authenticatedFetch,
    }),
    [token, user, isAuthenticated, loading, login, logout, authenticatedFetch],
  );

  return (
    <AuthContext.Provider value={memoizedValue}>
      {children}
    </AuthContext.Provider>
  );
};
