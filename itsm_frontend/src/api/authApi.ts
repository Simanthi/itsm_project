// itsm_frontend/src/api/authApi.ts

// You might need to adjust the path to your AuthContext if it's different
// For now, assuming this path based on previous interactions.
// import { AuthContextType } from '../context/auth/AuthContextDefinition'; // Assuming this defines AuthContextType
import type { User } from '../types/UserTypes'; // Assuming you have a User type defined, or define it here

/**
 * Simulates a login API call.
 * In a real application, this would send credentials to your backend
 * and receive a JWT token and user data.
 * @param username The user's username.
 * @param password The user's password.
 * @returns A promise that resolves with a mock token and user data.
 */
export const loginApi = async (username: string, password: string): Promise<{ token: string; user: { name: string; role: string; id: number } }> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (username === 'admin' && password === 'admin') {
        // Mock token and user data for successful login
        const mockToken = 'mock-jwt-token-abcdef12345';
        const mockUser = { name: 'IT Admin', role: 'admin', id: 1 };
        resolve({ token: mockToken, user: mockUser });
      } else {
        // Simulate failed login
        reject(new Error('Invalid username or password'));
      }
    }, 1000); // Simulate network delay
  });
};

/**
 * Simulates fetching a list of users.
 * In a real application, this would be an authenticated API call
 * to your backend's user endpoint.
 * @param token The authentication token.
 * @returns A promise that resolves with an array of User objects.
 */
export const getUserList = async (token: string): Promise<User[]> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!token) {
        reject(new Error('Authentication required'));
        return;
      }

      // Mock user data, matching the structure from security_access/serializers.py
      const mockUsers: User[] = [
        { id: 1, username: 'admin', first_name: 'Super', last_name: 'User', email: 'admin@example.com' },
        { id: 2, username: 'james', first_name: 'James', last_name: 'Bond', email: 'james@example.com' },
        { id: 3, username: 'jane.doe', first_name: 'Jane', last_name: 'Doe', email: 'jane.doe@example.com' },
        { id: 4, username: 'mike.smith', first_name: 'Mike', last_name: 'Smith', email: 'mike.smith@example.com' },
      ];
      resolve(mockUsers);
    }, 500); // Simulate network delay
  });
};

// You might also need to define the User type if it's not already in ServiceRequestTypes.ts
// For consistency, it's better to have a dedicated `types/UserTypes.ts` or similar.
// If not, you can define it here:
/*
export interface User {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}
*/
// Assuming it exists in `itsm_frontend/src/types/UserTypes.ts` based on typical project structure.
