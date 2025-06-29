// itsm_frontend/src/api/apiClient.ts

import { API_BASE_URL } from '../config';

// Custom AuthError class
export class AuthError extends Error {
  isAuthError: boolean;
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
    this.isAuthError = true;
    // This line is important for instanceof to work correctly with custom errors in some environments
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

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
  // Base headers without Content-Type initially
  const baseHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  // Conditionally set Content-Type
  // Do not set Content-Type if body is FormData, as browser will set it with boundary
  if (!(options?.body instanceof FormData)) {
    baseHeaders['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...baseHeaders, // Use the conditionally prepared baseHeaders
        ...options?.headers, // Allow explicit override from options
      },
    });

    // If the response is not OK, parse the error and throw
    if (!response.ok) {
      if (response.status === 401) {
        throw new AuthError('Authentication failed: Unauthorized');
      }
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
