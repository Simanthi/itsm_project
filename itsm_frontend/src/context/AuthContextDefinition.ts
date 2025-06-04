// itsm_frontend/src/context/AuthContextDefinition.ts
import React, { useContext } from 'react'; // <--- Added useContext here

// Define the shape of your AuthContext values
export interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

// Create the AuthContext
export const AuthContext = React.createContext<AuthContextType | null>(null);

// --- Moved useAuth hook here ---
export const useAuth = () => {
  const context = useContext(AuthContext); // AuthContext is defined in this file
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};