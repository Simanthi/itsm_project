// itsm_frontend/src/context/auth/AuthContextDefinition.ts

export interface User {
  id: number;
  username: string;
  is_staff: boolean;
  // Add other user properties that your backend provides (e.g., email, first_name, last_name, job_title)
}

export interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  login: (token: string, userId: number, username: string, isStaff: boolean) => void;
  logout: () => void;
}