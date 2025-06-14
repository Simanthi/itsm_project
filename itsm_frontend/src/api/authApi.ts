import type { User } from '../types/UserTypes';
import { API_BASE_URL } from '../config';

const DJANGO_AUTH_API_BASE_URL = `${API_BASE_URL}`;
const SECURITY_ACCESS_API_BASE_URL = `${API_BASE_URL}/security-access`;

// Define a type for common API error responses expected from the backend.
interface ErrorResponse {
  detail?: string; // Common detail field for DRF errors
  message?: string; // Generic message field
  // Add any other common error properties your backend consistently returns here
}

// Define a type for Django REST Framework's paginated responses.
// This is crucial because your backend sends users wrapped in this structure.
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[]; // The actual array of data items
}

/**
 * Generic fetch wrapper for authenticated API requests.
 * @param url The API endpoint URL.
 * @param token The JWT authentication token.
 * @param options Optional RequestInit object for fetch.
 * @returns A Promise that resolves to the parsed JSON response of type T.
 * @throws An Error if the network request fails or the response status is not OK.
 */
async function authFetch<T>(url: string, token: string, options?: RequestInit): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`, // Include the JWT token in Authorization header
  };

  try {
    console.log(`authFetch: Making request to URL: ${url}`); // Log the URL being fetched
    console.log(`authFetch: Request options:`, options); // Log fetch options for debugging
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options?.headers, // Allow overriding default headers
      },
    });

    console.log(`authFetch: Received response for ${url}. Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text(); // Get raw text to capture non-JSON error bodies
      console.error(`authFetch: Non-OK response for ${url}. Status: ${response.status}. Raw error text:`, errorText);
      
      // Attempt to parse error response as JSON, fallback to generic message.
      const errorData: ErrorResponse = { message: response.statusText };
      try {
        const parsed = JSON.parse(errorText);
        if (typeof parsed === 'object' && parsed !== null) {
          if ('detail' in parsed) errorData.detail = parsed.detail;
          if ('message' in parsed) errorData.message = parsed.message;
        }
      } catch { 
        console.warn("authFetch: Could not parse error response as JSON (may not be JSON).");
      }
      throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`);
    }

    if (response.status === 204) {
      console.log(`authFetch: Received 204 No Content for ${url}. Returning null.`);
      return null as T; // Explicitly handle 204 No Content response.
    }

    const data = await response.json();
    console.log(`authFetch: Successfully parsed JSON data for ${url}. Data:`, data);
    return data;
  } catch (error) {
    console.error(`authFetch: Caught error during fetch to ${url}:`, error);
    throw error; // Re-throw to be handled by the calling function.
  }
}

/**
 * Handles user login, exchanges credentials for a JWT token, and fetches full user details.
 * @param username User's username.
 * @param password User's password.
 * @returns A Promise resolving to an object containing the JWT token and the authenticated user's details.
 * @throws An Error if login fails or user details cannot be fetched.
 */
export const loginApi = async (username: string, password: string): Promise<{ token: string; user: { name: string; role: string; id: number } }> => {
  try {
    console.log("loginApi: Sending login request to Django token endpoint...");
    // First, request a JWT token using username and password.
    const response = await fetch(`${DJANGO_AUTH_API_BASE_URL}/token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("loginApi: Token endpoint returned error:", errorData);
      throw new Error(errorData.detail || 'Invalid username or password');
    }

    const data = await response.json();
    const token = data.access; // Extract the access token.
    console.log("loginApi: Successfully received JWT token.");

    // Initialize user object with default/known values.
    const loggedInUser: { id: number; name: string; role: string } = {
      id: 0, // Default ID to 0, will be updated from backend user details.
      name: username,
      role: 'user', // Default role, assuming no role information from token endpoint.
    };

    try {
        console.log(`loginApi: Calling authFetch to get user details for username '${username}'...`);
        // Expect a PaginatedResponse<User> from authFetch now.
        const paginatedUserResponse = await authFetch<PaginatedResponse<User>>(`${SECURITY_ACCESS_API_BASE_URL}/users/?username=${username}`, token);
        
        // Access the user from the 'results' array within the paginated response.
        if (paginatedUserResponse && paginatedUserResponse.results && paginatedUserResponse.results.length > 0) {
            const currentUser = paginatedUserResponse.results[0]; // Get the first user from results.
            loggedInUser.id = currentUser.id;
            loggedInUser.name = currentUser.first_name && currentUser.last_name
                            ? `${currentUser.first_name} ${currentUser.last_name}`
                            : currentUser.username;
            console.log("loginApi: Fetched full user details. User ID:", loggedInUser.id, "User Name:", loggedInUser.name, "Full User Object (from results[0]):", currentUser);
        } else {
            console.warn(`loginApi: Could not find user details for username: ${username}. Paginated response results were empty or null. User ID remains 0.`);
            console.warn("loginApi: Raw paginated response for user details fetch:", paginatedUserResponse);
        }
    } catch (userFetchError) {
        console.error("loginApi: Error fetching full user details after login. User ID might be 0. Error:", userFetchError);
    }

    return { token: token, user: loggedInUser }; // Return both token and user details.
  } catch (error) {
    console.error("Login API error (outer catch block):", error);
    throw error;
  }
};

/**
 * Fetches a list of all users from the backend (requires authentication).
 * @param token The JWT authentication token.
 * @returns A Promise resolving to an array of User objects.
 * @throws An Error if authentication is missing or fetching fails.
 */
export const getUserList = async (token: string): Promise<User[]> => {
  if (!token) {
    console.error('getUserList: Authentication required to fetch user list. Token is null.');
    return Promise.reject(new Error('Authentication required to fetch user list.'));
  }
  try {
    console.log("getUserList: Attempting to fetch all users from API...");
    // Expect a PaginatedResponse<User> for the user list as well.
    const paginatedUsersData = await authFetch<PaginatedResponse<User>>(`${SECURITY_ACCESS_API_BASE_URL}/users/`, token);
    
    // Return the 'results' array directly.
    if (paginatedUsersData && paginatedUsersData.results) {
      console.log("getUserList: Fetched users from API. Count:", paginatedUsersData.results.length, "Users data (from results):", paginatedUsersData.results);
      return paginatedUsersData.results;
    } else {
      console.warn("getUserList: Paginated user data results were empty or null. Returning empty array.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching user list:", error);
    throw error;
  }
};

/**
 * Handles user logout on the backend.
 * @param token The JWT authentication token to invalidate.
 * @returns A Promise that resolves when logout is successful.
 * @throws An Error if logout fails on the backend.
 */
export const logoutApi = async (token: string): Promise<void> => {
    try {
        console.log("logoutApi: Sending logout request to backend.");
        const response = await fetch(`${DJANGO_AUTH_API_BASE_URL}/auth/logout/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("logoutApi: Backend logout failed:", errorData);
            throw new Error(`API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }
        console.log("Successfully logged out on backend.");
    } catch (error) {
        console.error("Logout API error:", error);
    }
};
