// itsm_frontend/src/context/auth/useAuth.ts
import { useContext } from 'react';
import { AuthContext, type AuthContextType } from './AuthContextDefinition'; // Import AuthContext and types from definition file

/**
 * Custom hook to access the authentication context.
 * Throws an error if used outside of an AuthProvider.
 * This hook is exported directly from this file, making it a "hook-only" file,
 * which satisfies the react-refresh/only-export-components ESLint rule.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
