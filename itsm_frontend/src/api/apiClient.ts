// itsm_frontend/src/api/apiClient.ts

import { API_BASE_URL } from '../config';

// A standard error response shape from our Django backend
interface ErrorResponse {
  detail?: string;
  message?: string;
  // You can add other potential error keys here
}

/**
 * A centralized, authenticated fetch client for all API requests.
 * @param endpoint The API endpoint (e.g., '/service-requests/requests/'). Note the leading slash.
 * @param token The JWT authentication token.
 * @param options Optional RequestInit object for fetch (e.g., method, body).
 * @returns A Promise that resolves to the parsed JSON response of type T.
 * @throws An Error with a parsed message if the request fails.
 */
export async function apiClient<T>(
  endpoint: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options?.headers,
      },
    });

    // If the response is not OK, parse the error and throw
    if (!response.ok) {
      const errorData: ErrorResponse = await response.json().catch(() => ({
        message: response.statusText,
      }));
      // Prefer the 'detail' field from Django REST Framework, otherwise use message or status.
      throw new Error(
        errorData.detail ||
          errorData.message ||
          `API Error: ${response.status}`,
      );
    }

    // Handle successful requests that don't return content (e.g., DELETE, PATCH with 204)
    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  } catch (error) {
    console.error(
      `API Client Error: Failed to fetch from endpoint ${endpoint}`,
      error,
    );
    // Re-throw the error so the calling function can handle it
    throw error;
  }
}
