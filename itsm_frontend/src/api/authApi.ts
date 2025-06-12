// itsm_frontend/src/api/authApi.ts
import type { User } from '../types/UserTypes';

// Define the base URL for your main Django API (where token endpoints are)
const DJANGO_API_BASE_URL = 'http://localhost:8000/api';
// Define the base URL for the service-requests API, which was already in serviceRequestApi.ts
// Removed SERVICE_REQUESTS_API_BASE_URL as it was unused in this file.
const SECURITY_ACCESS_API_BASE_URL = 'http://localhost:8000/api/security-access';


/**
 * Helper for making authenticated fetch requests.
 * This is duplicated from serviceRequestApi.ts for clarity within authApi.ts.
 * In a larger app, you'd centralize this.
 */
async function authFetch<T>(url: string, token: string, options?: RequestInit): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`, // Assuming JWT Bearer token
  };

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    // If the server returns a 'detail' field (common for DRF errors) use that
    throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`);
  }

  // Handle 204 No Content for successful deletions/updates where no body is returned
  if (response.status === 204) {
    return null as T; // Return null or a meaningful empty value for no content
  }

  return response.json();
}


/**
 * Logs in a user by sending credentials to the backend's JWT token endpoint.
 *
 * @param username The user's username.
 * @param password The user's password.
 * @returns A promise that resolves with the access token and basic user info.
 * The `user` object here is simplified; a real app might fetch full user profile.
 */
export const loginApi = async (username: string, password: string): Promise<{ token: string; user: { name: string; role: string; id: number } }> => {
  try {
    const response = await fetch(`${DJANGO_API_BASE_URL}/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Invalid username or password');
    }

    const data = await response.json();
    // 'data.access' is the JWT token
    const token = data.access;

    // In a real scenario, you might decode the JWT to get basic user info
    // or make another API call to get the authenticated user's details.
    // For now, we'll construct a mock user based on the username for demonstration.
    // The 'id' should ideally come from the backend's user data.
    // If your JWT doesn't contain user ID, you'd typically fetch '/api/security-access/users/me/'
    // or similar after login.
    const mockUser = {
      id: 0, // Placeholder: In a real app, this should come from a decoded JWT or a separate user info endpoint
      name: username, // Using username as name for simplicity
      role: 'user', // Default role; roles would typically come from backend
    };

    // Attempt to get the actual user ID from the response if available, or based on username
    // This is a common pattern: after getting token, fetch current user's full details
    try {
        const currentUserResponse = await authFetch<User[]>(`${SECURITY_ACCESS_API_BASE_URL}/users/?username=${username}`, token);
        if (currentUserResponse && currentUserResponse.length > 0) {
            mockUser.id = currentUserResponse[0].id;
            mockUser.name = currentUserResponse[0].first_name && currentUserResponse[0].last_name
                            ? `${currentUserResponse[0].first_name} ${currentUserResponse[0].last_name}`
                            : currentUserResponse[0].username;
            // You might infer role here based on backend data if it exists
        }
    } catch (userFetchError) {
        console.warn("Could not fetch full user details after login, using basic mock user:", userFetchError);
    }


    return { token: token, user: mockUser };
  } catch (error) {
    console.error("Login API error:", error);
    throw error; // Re-throw to be handled by the calling component (LoginPage)
  }
};

/**
 * Fetches a list of users from the backend.
 * This function now makes a real API call to your /api/security-access/users/ endpoint.
 *
 * @param token The authentication token.
 * @returns A promise that resolves to an array of User objects.
 */
export const getUserList = async (token: string): Promise<User[]> => {
  if (!token) {
    return Promise.reject(new Error('Authentication required to fetch user list.'));
  }
  try {
    // Making a real API call to your Django backend's UserViewSet
    const usersData = await authFetch<User[]>(`${SECURITY_ACCESS_API_BASE_URL}/users/`, token);
    return usersData;
  } catch (error) {
    console.error("Error fetching user list:", error);
    throw error; // Re-throw to be handled by the calling component
  }
};
