// itsm_frontend/src/api/authApi.ts
import type { User } from '../types/UserTypes'; // User type should include email
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
  user: { // This type MUST align with AuthUser in AuthContextDefinition.ts
    id: number;
    name: string;
    email: string; // Ensure email is here
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
      let errorDetail = 'Invalid username or password';
      try {
        const errorData = await tokenResponse.json();
        errorDetail = errorData.detail || errorDetail;
      } catch (e) {
        // Ignore if response is not JSON
      }
      throw new Error(errorDetail);
    }

    const data = await tokenResponse.json();
    const token: string = data.access;

    // This internal loggedInUser object must also align with the AuthUser structure
    const loggedInUser: {
      id: number;
      name: string;
      email: string; // Ensure email is here
      role: string;
      is_staff: boolean;
      groups: string[];
      department_id?: number | null;
      department_name?: string | null;
    } = {
      id: 0, // Default, will be updated
      name: username, // Default, will be updated
      email: '', // Default, MUST be updated from currentUser
      role: 'user',
      is_staff: false,
      groups: [],
      department_id: null,
      department_name: null,
    };

    try {
      const endpoint = `${SECURITY_ACCESS_ENDPOINT}/users/?username=${username}`;
      // Assuming User type (from ../types/UserTypes) includes: id, username, email, first_name, last_name, is_staff, groups
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
        loggedInUser.email = currentUser.email; // CRITICAL: Populate email
        loggedInUser.is_staff = currentUser.is_staff;
        loggedInUser.role = currentUser.is_staff ? 'admin' : 'user';

        loggedInUser.department_id = currentUser.department_id ?? null;
        loggedInUser.department_name = currentUser.department_name ?? null;

        if (currentUser.groups && Array.isArray(currentUser.groups)) {
          // Assuming currentUser.groups is an array of objects like { name: string }
          loggedInUser.groups = currentUser.groups.map(g => g.name).filter(name => typeof name === 'string');
        } else {
          loggedInUser.groups = [];
        }
      } else {
        console.warn(
          `loginApi: Could not find user details for username: ${username}. Using username as name and a default email.`,
        );
        // Fallback if user details not found - ensure email is a string
        loggedInUser.email = username.includes('@') ? username : `${username.replace(/\s+/g, '.')}@example.com`;
      }
    } catch (userFetchError) {
      console.error(
        'loginApi: Error fetching full user details after login. Using username as name and a default email.',
        userFetchError,
      );
       loggedInUser.email = username.includes('@') ? username : `${username.replace(/\s+/g, '.')}@example.com`; // Fallback email
    }

    // Final check to ensure email is not empty if it's required non-optional
    if (!loggedInUser.email) {
        console.error("loginApi: Email is still empty after attempting to fetch user details. This should not happen.");
        // Provide a failsafe default, though this indicates a deeper issue if reached.
        loggedInUser.email = "fallback@example.com";
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
