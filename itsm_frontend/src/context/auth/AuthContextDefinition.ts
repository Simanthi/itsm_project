// itsm_frontend/src/context/auth/AuthContextDefinition.ts
import { createContext } from 'react';

// Define the structure of the user object stored in context
export interface AuthUser {
  id: number;
  name: string;
  role: string;
  // FIX: Added token property to AuthUser
  token: string;
}

// Define the shape of the AuthContext value
export interface AuthContextType {
  token: string | null; // This is the overall token, which will be the same as user.token
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>; // Returns true on success, false on failure
  logout: () => void;
}

// Create the AuthContext.
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
