// itsm_frontend/src/context/AuthContext.tsx
import React, { useState, useEffect } from 'react'; // <--- Removed useContext here
import type { ReactNode } from 'react';
// --- Updated import for AuthContext and AuthContextType (type-only) ---
import { AuthContext } from './AuthContextDefinition';
import type { AuthContextType } from './AuthContextDefinition'; // <--- Added 'type' here

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('authToken');
  });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setIsAuthenticated(!!token);
  }, []);

  const login = (token: string) => {
    localStorage.setItem('authToken', token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
  };

  const authContextValue: AuthContextType = {
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

// --- REMOVE THE useAuth EXPORT FROM HERE ---
// export const useAuth = () => { ... } // This block should be removed.