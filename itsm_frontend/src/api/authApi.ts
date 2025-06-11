// itsm_frontend/src/api/authApi.ts
import type { User } from '../types/UserTypes';

export const loginApi = async (username: string, password: string): Promise<{ token: string; user: { name: string; role: string; id: number } }> => {
  if (username === 'admin' && password === 'admin') {
    const mockToken = 'mock-jwt-token-abcdef12345';
    // FIX: Set the ID of the 'admin' user to 2, as per your Django backend
    const mockUser = { name: 'IT Admin', role: 'admin', id: 2 };
    return Promise.resolve({ token: mockToken, user: mockUser });
  } else {
    return Promise.reject(new Error('Invalid username or password'));
  }
};

export const getUserList = async (token: string): Promise<User[]> => {
  if (!token) {
    return Promise.reject(new Error('Authentication required'));
  }
  // FIX: Update mockUsers to reflect the actual user IDs from your Django backend
  const mockUsers: User[] = [
    { id: 2, username: 'admin', first_name: 'Super', last_name: 'User', email: 'admin@example.com' }, // Changed id from 1 to 2
    // IMPORTANT: If you have other users in your Django backend, ensure their IDs here match.
    // If not, you might want to remove these mock entries to avoid sending non-existent IDs.
    // { id: 3, username: 'jane.doe', first_name: 'Jane', last_name: 'Doe', email: 'jane.doe@example.com' },
    // { id: 4, username: 'mike.smith', first_name: 'Mike', last_name: 'Smith', email: 'mike.smith@example.com' },
  ];
  return Promise.resolve(mockUsers);
};