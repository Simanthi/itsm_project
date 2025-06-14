import { createContext } from 'react';

export interface AuthUser {
  id: number;
  name: string;
  role: string;
  // Removed 'token' from AuthUser as it's a credential, not part of user's profile
}

export interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
