import React, { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { AuthContext, type AuthContextType, type AuthUser } from './AuthContextDefinition';
import { loginApi, logoutApi as backendLogoutApi } from '../../api/authApi'; // Renamed logoutApi to avoid conflict

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');

      console.log('AuthContext: Initializing authentication...');
      console.log('AuthContext: Stored Token:', storedToken ? 'Found' : 'Not Found');
      console.log('AuthContext: Stored User:', storedUser ? 'Found' : 'Not Found');

      if (storedToken && storedUser) {
        try {
          const parsedUser: AuthUser = JSON.parse(storedUser);
          // Basic validation for parsedUser to ensure it has an ID
          if (parsedUser && parsedUser.id !== undefined && parsedUser.id !== null) {
            setToken(storedToken);
            setUser(parsedUser);
            setIsAuthenticated(true);
            console.log('AuthContext: Successfully parsed stored user. User ID:', parsedUser.id, 'User Name:', parsedUser.name);
          } else {
            console.error("AuthContext: Stored user data is invalid (missing ID). Clearing.");
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
            setIsAuthenticated(false);
          }
        } catch (e) {
          console.error("AuthContext: Error parsing stored user data or token:", e);
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
          console.log('AuthContext: Cleared invalid stored auth data.');
        }
      } else {
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        console.log('AuthContext: No stored auth data or invalid data. User is not authenticated.');
      }
      setLoading(false);
      console.log('AuthContext: Authentication initialization complete.');
    };

    initializeAuth();
  }, []); // Empty dependency array means this runs once on mount

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      console.log('AuthContext: Attempting login via API for user:', username);
      const response = await loginApi(username, password); // loginApi returns { token, user }
      
      // Crucial: Validate that the user object from loginApi has a valid ID
      if (!response.user || response.user.id === undefined || response.user.id === null || response.user.id === 0) {
        console.error("AuthContext: Login API returned invalid user ID. Aborting login. User:", response.user);
        throw new Error("Invalid user ID returned from login API. Please check backend configuration.");
      }

      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user)); // Ensure 'user' object with 'id' is stored

      setToken(response.token);
      setUser(response.user); // Update context user state
      setIsAuthenticated(true);

      console.log('AuthContext: Login successful! User ID set in context:', response.user.id, 'User Name:', response.user.name);
      return true;
    } catch (error) {
      console.error('AuthContext: Login failed:', error);
      setIsAuthenticated(false);
      setToken(null);
      setUser(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      console.log('AuthContext: Login failed, cleared auth state.');
      throw error; // Re-throw to be handled by the LoginPage component
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    console.log('AuthContext: Performing logout.');
    if (token) {
        backendLogoutApi(token).catch(err => console.error("AuthContext: Backend logout failed:", err));
    }
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    console.log('AuthContext: Auth state cleared for logout.');
  }, [token]);

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
