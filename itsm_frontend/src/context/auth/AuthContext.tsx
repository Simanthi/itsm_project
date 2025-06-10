// itsm_frontend/src/context/auth/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { AuthContextType, User } from './AuthContextDefinition'; // Use type import as fixed previously

// Create the AuthContext with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Load auth state from localStorage on initial render
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUserId = localStorage.getItem('authUserId');
    const storedUsername = localStorage.getItem('authUsername');
    const storedIsStaff = localStorage.getItem('authUserIsStaff');

    if (storedToken && storedUserId && storedUsername && storedIsStaff !== null) {
      setToken(storedToken);
      setUser({
        id: parseInt(storedUserId, 10),
        username: storedUsername,
        is_staff: storedIsStaff === 'true', // Convert string 'true'/'false' to boolean
      });
      setIsAuthenticated(true);
    }
  }, []);

  const login = (newToken: string, userId: number, username: string, isStaff: boolean) => {
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('authUserId', userId.toString());
    localStorage.setItem('authUsername', username);
    localStorage.setItem('authUserIsStaff', isStaff.toString());

    setToken(newToken);
    setUser({ id: userId, username, is_staff: isStaff });
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUserId');
    localStorage.removeItem('authUsername');
    localStorage.removeItem('authUserIsStaff');

    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const authContextValue: AuthContextType = {
    isAuthenticated,
    token,
    user,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};