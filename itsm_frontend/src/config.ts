// itsm_frontend/src/config.ts

// Read the API base URL from the environment variable.
// The `||` provides a fallback, which is useful if the .env file is missing.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
