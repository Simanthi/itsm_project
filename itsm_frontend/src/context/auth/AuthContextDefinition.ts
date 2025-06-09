// itsm_frontend/src/context/auth/AuthContextDefinition.ts

import { createContext, useContext } from 'react';

// Define the shape of your AuthContext values
export interface AuthContextType {
  isAuthenticated: boolean;
  user: { name: string; role: string } | null; // User object for display
  isLoading: boolean; // Indicates if initial auth check is ongoing
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