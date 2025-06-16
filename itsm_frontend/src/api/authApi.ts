// itsm_frontend/src/api/authApi.ts

import type { User } from '../types/UserTypes';
import { API_BASE_URL } from '../config';
// 👇 CHANGE 1: Import our new centralized apiClient
import { apiClient } from './apiClient';

// We no longer need these base URLs here as they are handled in apiClient or used directly
const SECURITY_ACCESS_ENDPOINT = '/security-access';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// 👇 CHANGE 2: The local 'authFetch' helper function is now removed.

export const loginApi = async (
  username: string,
  password: string,
): Promise<{
  token: string;
  user: { name: string; role: string; id: number; is_staff: boolean }; // Added is_staff
}> => {
  try {
    // This first call is PUBLIC (no token), so we use the native fetch API.
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

    // Now that we have a token, we can use our new apiClient for the authenticated call.
    // Update the type of loggedInUser to include is_staff
    const loggedInUser: { id: number; name: string; role: string; is_staff: boolean } = {
      id: 0,
      name: username,
      role: 'user', // Default role, will be updated based on is_staff
      is_staff: false, // Default is_staff
    };

    try {
      // 👇 CHANGE 3: Use the new apiClient for the authenticated user details fetch.
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
        loggedInUser.is_staff = currentUser.is_staff; // Store is_staff status
        loggedInUser.role = currentUser.is_staff ? 'admin' : 'user'; // Update role based on is_staff
      } else {
        console.warn(
          `loginApi: Could not find user details for username: ${username}. Defaulting role to 'user' and is_staff to false.`,
        );
      }
    } catch (userFetchError) {
      console.error(
        'loginApi: Error fetching full user details after login.',
        userFetchError,
      );
    }

    return { token, user: loggedInUser };
  } catch (error) {
    console.error('Login API error:', error);
    throw error;
  }
};

export const getUserList = async (
  authenticatedFetch: (endpoint: string, options?: RequestInit) => Promise<unknown>, // Changed Promise<any> to Promise<unknown>
): Promise<User[]> => {
  // Token check is now handled by authenticatedFetch
  try {
    const endpoint = `${SECURITY_ACCESS_ENDPOINT}/users/`;
    // Use authenticatedFetch instead of apiClient directly
    const paginatedUsersData = await authenticatedFetch(endpoint) as PaginatedResponse<User>;

    return paginatedUsersData?.results || [];
  } catch (error) {
    console.error('Error fetching user list:', error);
    throw error;
  }
};

export const logoutApi = async (token: string): Promise<void> => {
  // This is a fire-and-forget call, can be a simple fetch.
  // Or you could use apiClient and ignore the response.
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
