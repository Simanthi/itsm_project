import { createContext } from 'react';

// Defines the structure of the authenticated user object stored in context and local storage.
// 'id' is crucial for linking requests to users in the backend.
export interface AuthUser {
  id: number;
  name: string; // Typically username or full name for display
  role: string; // User's role (e.g., 'user', 'admin')
}

// Defines the shape of the authentication context itself.
export interface AuthContextType {
  token: string | null; // JWT token for API authentication
  user: AuthUser | null; // The authenticated user's details
  isAuthenticated: boolean; // Convenience boolean to check auth status
  loading: boolean; // Indicates if authentication state is currently being loaded/initialized
  login: (username: string, password: string) => Promise<boolean>; // Function to handle user login
  logout: () => void; // Function to handle user logout
  authenticatedFetch: (endpoint: string, options?: RequestInit) => Promise<any>; // Function for making authenticated API calls
}

// Creates the React Context object. Default value is undefined, to be provided by AuthProvider.
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
