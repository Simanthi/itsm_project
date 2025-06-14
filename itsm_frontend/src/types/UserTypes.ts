export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string; // ISO 8601 string
  last_login: string | null; // ISO 8601 string or null
  // Add other fields you expect from your Django User model/serializer
}
