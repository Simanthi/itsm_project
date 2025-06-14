// Defines the structure of a User object as received from the backend API.
// Ensure these fields match what your Django UserSerializer provides.
export interface User {
  id: number; // The primary key ID of the user (crucial)
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string; // ISO 8601 string (e.g., "2025-06-09T17:47:28.175204Z")
  last_login: string | null; // ISO 8601 string or null
  // Add any other user profile fields your backend exposes (e.g., 'role', 'department')
}
