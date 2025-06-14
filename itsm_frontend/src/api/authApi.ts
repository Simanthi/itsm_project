import type { User } from '../types/UserTypes';
import { API_BASE_URL } from '../config';

const DJANGO_AUTH_API_BASE_URL = `${API_BASE_URL}`;
const SECURITY_ACCESS_API_BASE_URL = `${API_BASE_URL}/security-access`;

// Define a type for common API error responses
interface ErrorResponse {
  detail?: string;
  message?: string;
  // Removed [key: string]: any; to resolve ESLint warning, focusing on explicit fields.
  // Add any other common error properties your backend consistently returns here.
}

async function authFetch<T>(url: string, token: string, options?: RequestInit): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  try {
    console.log(`authFetch: Making request to URL: ${url}`);
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options?.headers,
      },
    });

    console.log(`authFetch: Received response for ${url}. Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text(); // Get raw text to avoid JSON parse errors
      console.error(`authFetch: Non-OK response for ${url}. Status: ${response.status}. Raw error text:`, errorText);
      const errorData: ErrorResponse = { message: response.statusText }; // Changed let to const
      try {
        const parsed = JSON.parse(errorText);
        // Ensure parsed object conforms to ErrorResponse (or assign relevant parts)
        if (typeof parsed === 'object' && parsed !== null) {
          if ('detail' in parsed) errorData.detail = parsed.detail;
          if ('message' in parsed) errorData.message = parsed.message;
          // You might need to explicitly copy other relevant properties here if your backend sends them
        }
      } catch { 
        console.warn("authFetch: Could not parse error response as JSON.");
      }
      throw new Error(errorData.detail || errorData.message || `API error: ${response.status}`);
    }

    if (response.status === 204) {
      console.log(`authFetch: Received 204 No Content for ${url}. Returning null.`);
      return null as T; // Handle No Content
    }

    const data = await response.json();
    console.log(`authFetch: Successfully parsed JSON data for ${url}. Data:`, data);
    return data;
  } catch (error) {
    console.error(`authFetch: Caught error during fetch to ${url}:`, error);
    throw error;
  }
}

export const loginApi = async (username: string, password: string): Promise<{ token: string; user: { name: string; role: string; id: number } }> => {
  try {
    console.log("loginApi: Sending login request to Django token endpoint...");
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
    const token = data.access;
    console.log("loginApi: Successfully received JWT token.");

    const loggedInUser: { id: number; name: string; role: string } = {
      id: 0, // Default to 0, will be updated
      name: username,
      role: 'user', // Default role
    };

    try {
        console.log(`loginApi: Calling authFetch to get user details for username '${username}'...`);
        const currentUserResponse = await authFetch<User[]>(`${SECURITY_ACCESS_API_BASE_URL}/users/?username=${username}`, token);
        
        if (currentUserResponse && currentUserResponse.length > 0) {
            loggedInUser.id = currentUserResponse[0].id;
            loggedInUser.name = currentUserResponse[0].first_name && currentUserResponse[0].last_name
                            ? `${currentUserResponse[0].first_name} ${currentUserResponse[0].last_name}`
                            : currentUserResponse[0].username;
            console.log("loginApi: Fetched full user details. User ID:", loggedInUser.id, "User Name:", loggedInUser.name, "Full User Object:", currentUserResponse[0]);
        } else {
            console.warn(`loginApi: Could not find user details for username: ${username}. Response was empty or null. User ID set to 0.`);
            console.warn("loginApi: Raw response for user details fetch:", currentUserResponse);
        }
    } catch (userFetchError) {
        console.error("loginApi: Error fetching full user details after login. User ID might be 0. Error:", userFetchError);
    }

    return { token: token, user: loggedInUser };
  } catch (error) {
    console.error("Login API error (outer catch):", error);
    throw error;
  }
};

export const getUserList = async (token: string): Promise<User[]> => {
  if (!token) {
    console.error('getUserList: Authentication required to fetch user list. Token is null.');
    return Promise.reject(new Error('Authentication required to fetch user list.'));
  }
  try {
    console.log("getUserList: Attempting to fetch all users from API...");
    const usersData = await authFetch<User[]>(`${SECURITY_ACCESS_API_BASE_URL}/users/`, token);
    console.log("getUserList: Fetched users from API. Count:", usersData.length, "Users data:", usersData);
    return usersData;
  } catch (error) {
    console.error("Error fetching user list:", error);
    throw error;
  }
};

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
