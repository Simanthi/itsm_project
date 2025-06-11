// itsm_frontend/src/api/authApi.ts
import type { User } from '../types/UserTypes';

export const loginApi = async (username: string, password: string): Promise<{ token: string; user: { name: string; role: string; id: number } }> => {
  // Removed setTimeout for immediate login response
  if (username === 'admin' && password === 'admin') {
    const mockToken = 'mock-jwt-token-abcdef12345';
    const mockUser = { name: 'IT Admin', role: 'admin', id: 1 };
    return Promise.resolve({ token: mockToken, user: mockUser });
  } else {
    return Promise.reject(new Error('Invalid username or password'));
  }
};

export const getUserList = async (token: string): Promise<User[]> => {
  // Removed setTimeout for immediate user list response
  if (!token) {
    return Promise.reject(new Error('Authentication required'));
  }
  const mockUsers: User[] = [
    { id: 1, username: 'admin', first_name: 'Super', last_name: 'User', email: 'admin@example.com' },
    { id: 2, username: 'james', first_name: 'James', last_name: 'Bond', email: 'james@example.com' },
    { id: 3, username: 'jane.doe', first_name: 'Jane', last_name: 'Doe', email: 'jane.doe@example.com' },
    { id: 4, username: 'mike.smith', first_name: 'Mike', last_name: 'Smith', email: 'mike.smith@example.com' },
  ];
  return Promise.resolve(mockUsers);
};