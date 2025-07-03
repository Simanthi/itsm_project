// itsm_frontend/src/api/authApi.ts
import type { User } from '../types/UserTypes';
import { API_BASE_URL } from '../config';
import { apiClient } from './apiClient';

const SECURITY_ACCESS_ENDPOINT = '/security-access';

export type { User };

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const loginApi = async (
  username: string,
  password: string,
): Promise<{
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    is_staff: boolean;
    groups: string[];
    department_id?: number | null;
    department_name?: string | null;
  };
}> => {
  try {
    const tokenResponse = await fetch(`${API_BASE_URL}/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      throw new Error(errorData.detail || 'Invalid username or password');
    }

    const data = await tokenResponse.json();
    const token: string = data.access;

    const loggedInUser: {
      id: number;
      name: string;
      email: string;
      role: string;
      is_staff: boolean;
      groups: string[];
      department_id?: number | null;
      department_name?: string | null;
    } = {
      id: 0,
      name: username,
      email: '', // Initialize email
      role: 'user',
      is_staff: false,
      groups: [],
      department_id: null,
      department_name: null,
    };

    try {
      const endpoint = `${SECURITY_ACCESS_ENDPOINT}/users/?username=${username}`;
      const paginatedUserResponse = await apiClient<PaginatedResponse<User>>(
        endpoint,
        token,
      );

      if (paginatedUserResponse && paginatedUserResponse.results.length > 0) {
        const currentUser = paginatedUserResponse.results[0];
        loggedInUser.id = currentUser.id;
        loggedInUser.name =
          currentUser.first_name && currentUser.last_name
            ? `${currentUser.first_name} ${currentUser.last_name}`
            : currentUser.username;
        loggedInUser.email = currentUser.email; // Populate email
        loggedInUser.is_staff = currentUser.is_staff;
        loggedInUser.role = currentUser.is_staff ? 'admin' : 'user';

        if ('department_id' in currentUser && currentUser.department_id !== undefined) {
            loggedInUser.department_id = currentUser.department_id;
        }
        if ('department_name' in currentUser && currentUser.department_name !== undefined) {
            loggedInUser.department_name = currentUser.department_name;
        }
        if (currentUser.groups && Array.isArray(currentUser.groups)) {
            loggedInUser.groups = currentUser.groups.map(g => g.name);
        }
      } else {
        console.warn(
          `loginApi: Could not find user details for username: ${username}. Defaulting email, role, etc.`,
        );
        // Attempt to use the username as email if it looks like one, otherwise fallback or error
        loggedInUser.email = username.includes('@') ? username : `${username}@example.com`;
      }
    } catch (userFetchError) {
      console.error(
        'loginApi: Error fetching full user details after login. Defaulting email.',
        userFetchError,
      );
       loggedInUser.email = username.includes('@') ? username : `${username}@example.com`; // Fallback email
    }

    return { token, user: loggedInUser };
  } catch (error) {
    console.error('Login API error:', error);
    throw error;
  }
};

export const getUserList = async (
  authenticatedFetch: (
    endpoint: string,
    options?: RequestInit,
  ) => Promise<unknown>,
  params?: { search?: string; page?: number; page_size?: number }
): Promise<User[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.page_size) queryParams.append('page_size', String(params.page_size));

    const endpoint = `${SECURITY_ACCESS_ENDPOINT}/users/${queryParams.toString() ? '?' : ''}${queryParams.toString()}`;
    const paginatedUsersData = (await authenticatedFetch(endpoint)) as PaginatedResponse<User>;
    return paginatedUsersData?.results || [];
  } catch (error) {
    console.error('Error fetching user list:', error);
    throw error;
  }
};

export const logoutApi = async (token: string): Promise<void> => {
  try {
    await fetch(`${API_BASE_URL}/auth/logout/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('Successfully logged out on backend.');
  } catch (error) {
    console.error('Logout API error:', error);
  }
};
