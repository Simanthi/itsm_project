// itsm_frontend/src/context/auth/AuthContextDefinition.ts
import { createContext } from 'react';

// Define the structure of the user object stored in context
export interface AuthUser {
  id: number;
  name: string;
  role: string;
}

// Define the shape of the AuthContext value
export interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>; // Returns true on success, false on failure
  logout: () => void;
}

// Create the AuthContext.
// This is intentionally separated from AuthContext.tsx to satisfy the ESLint rule.
export const AuthContext = createContext<AuthContextType | undefined>(undefined);
