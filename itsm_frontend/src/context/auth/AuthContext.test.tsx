// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';
import * as authApi from '../../api/authApi';
import * as apiClient from '../../api/apiClient'; // For mocking apiClient used by authenticatedFetch
import type { AuthUser } from './AuthContextDefinition';

// Mock API modules
vi.mock('../../api/authApi', () => ({
  loginApi: vi.fn(),
  logoutApi: vi.fn(), // Corrected: This should be the actual exported name from the module
}));
vi.mock('../../api/apiClient', () => {
  // Actual AuthError takes only a message. The mock should reflect this.
  class MockAuthError extends Error {
    isAuthError: boolean;
    constructor(message: string) {
      super(message);
      this.name = 'AuthError';
      this.isAuthError = true;
      Object.setPrototypeOf(this, MockAuthError.prototype);
    }
  }
  return {
    apiClient: vi.fn(),
    AuthError: MockAuthError,
  };
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });


describe('AuthContext', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorageMock.clear();
    // Mock implementations will be set in individual tests or specific beforeEach blocks if needed for a group
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('initializes with loading false and not authenticated if no localStorage', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    // Loading is true initially, then useEffect sets it to false.
    // We wait for loading to become false.
    await waitFor(() => expect(result.current.loading).toBe(false));

    // After loading, check authentication state
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('initializes from localStorage if token and user are present', async () => {
    const mockUser: AuthUser = { id: 1, name: 'Stored User', email: 'stored@example.com', role: 'admin', is_staff: true, groups: [] };
    const mockToken = 'stored-token';
    localStorageMock.setItem('authToken', mockToken);
    localStorageMock.setItem('user', JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe(mockToken);
  });

  it('clears localStorage and logs error if stored user data is invalid (e.g. missing id)', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const invalidUser = { name: 'Invalid User' }; // Missing id
    localStorageMock.setItem('authToken', 'some-token');
    localStorageMock.setItem('user', JSON.stringify(invalidUser));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorageMock.getItem('authToken')).toBeNull();
    expect(localStorageMock.getItem('user')).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Stored user data is invalid'));
    consoleErrorSpy.mockRestore();
  });


  describe('login action', () => {
    it('updates state and localStorage on successful login', async () => {
      const mockLoginData = {
        token: 'new-token',
        user: { id: 2, name: 'Logged In User', email: 'login@example.com', role: 'editor', is_staff: false, groups: [] }
      };
      vi.mocked(authApi.loginApi).mockResolvedValue(mockLoginData);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial loading to complete
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.login('testuser', 'password');
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockLoginData.user);
      expect(result.current.token).toBe(mockLoginData.token);
      expect(localStorageMock.getItem('authToken')).toBe(mockLoginData.token);
      expect(JSON.parse(localStorageMock.getItem('user')!)).toEqual(mockLoginData.user);
      expect(result.current.loading).toBe(false); // Should be false after login completes
    });

    it('clears state and localStorage and throws error on failed login', async () => {
      const loginError = new Error('Invalid credentials');
      vi.mocked(authApi.loginApi).mockRejectedValue(loginError);

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false)); // Wait for initial load

      let caughtError;
      await act(async () => {
        try {
          await result.current.login('wronguser', 'wrongpass');
        } catch (e) {
          caughtError = e;
        }
      });

      expect(caughtError).toBe(loginError);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(localStorageMock.getItem('authToken')).toBeNull();
      expect(localStorageMock.getItem('user')).toBeNull();
      expect(result.current.loading).toBe(false);
    });
     it('throws error and clears state if login API returns user with no ID', async () => {
      // This is the corrected definition for the user object in the "user with no ID" test case.
      const mockUserForInvalidIdTest: Omit<AuthUser, 'id'> & { department_id?: null; department_name?: null } = {
        name: 'User Without ID',
        email: 'no-id@example.com', // email is correctly a string
        role: 'guest',              // Provide all other required fields for AuthUser
        is_staff: false,
        groups: [],
        department_id: null,      // Explicitly include optional fields as null or provide values
        department_name: null,
        // id is intentionally omitted here due to Omit<AuthUser, 'id'>, so it will be undefined.
      };
      const mockInvalidLoginData = {
        token: 'new-token',
        // Cast to AuthUser. The runtime check for 'id' in AuthContext's login function is what this test targets.
        user: mockUserForInvalidIdTest as AuthUser
      };
      vi.mocked(authApi.loginApi).mockResolvedValue(mockInvalidLoginData);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));

      let caughtError;
      await act(async () => {
        try {
          await result.current.login('testuser', 'password');
        } catch (e) {
          caughtError = e;
        }
      });

      expect(caughtError).toBeInstanceOf(Error);
      // @ts-expect-error // ESLint prefers this over @ts-ignore
      expect(caughtError?.message).toContain('Invalid user ID returned from login API');
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.getItem('authToken')).toBeNull();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('logout action', () => {
    it('clears state and localStorage on logout', async () => {
      // Setup initial authenticated state
      const initialUser: AuthUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'user', is_staff: false, groups: [] };
      const initialToken = 'initial-token';
      localStorageMock.setItem('authToken', initialToken);
      localStorageMock.setItem('user', JSON.stringify(initialUser));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isAuthenticated).toBe(true)); // Ensure initial state is set

      // Ensure logoutApi (aliased as backendLogoutApi in context) returns a promise
      vi.mocked(authApi.logoutApi).mockResolvedValue(undefined);

      await act(async () => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(localStorageMock.getItem('authToken')).toBeNull();
      expect(localStorageMock.getItem('user')).toBeNull();
      expect(authApi.logoutApi).toHaveBeenCalledWith(initialToken); // Check the actual export
    });

     it('logs out even if backendLogoutApi fails', async () => {
      const initialUser: AuthUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'user', is_staff: false, groups: [] };
      const initialToken = 'initial-token';
      localStorageMock.setItem('authToken', initialToken);
      localStorageMock.setItem('user', JSON.stringify(initialUser));

      vi.mocked(authApi.logoutApi).mockRejectedValueOnce(new Error('Backend logout failed')); // Use actual export
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      await act(async () => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.getItem('authToken')).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('AuthContext: Backend logout failed:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('authenticatedFetch', () => {
    it('calls apiClient with token and options', async () => {
      const mockToken = 'auth-token-123';
      const mockUser: AuthUser = { id: 1, name: 'User', email: 'user@example.com', role: 'user', is_staff: false, groups:[] };
      localStorageMock.setItem('authToken', mockToken);
      localStorageMock.setItem('user', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.token).toBe(mockToken));

      const endpoint = '/test-endpoint';
      const options = { method: 'POST', body: JSON.stringify({ data: 'test' }) };
      const mockApiResponse = { success: true };
      vi.mocked(apiClient.apiClient).mockResolvedValue(mockApiResponse);

      let response;
      await act(async () => {
        response = await result.current.authenticatedFetch(endpoint, options);
      });

      expect(apiClient.apiClient).toHaveBeenCalledWith(endpoint, mockToken, options);
      expect(response).toEqual(mockApiResponse);
    });

    it('throws error if no token is available', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false)); // Ensure initial loading is done

      await act(async () => {
        await expect(result.current.authenticatedFetch('/test')).rejects.toThrow('No authentication token available. Please log in.');
      });
    });

    it('logs out and re-throws AuthError if apiClient throws AuthError', async () => {
      const mockToken = 'auth-token-123';
       const mockUser: AuthUser = { id: 1, name: 'User', email: 'user@example.com', role: 'user', is_staff: false, groups:[] };
      localStorageMock.setItem('authToken', mockToken);
      localStorageMock.setItem('user', JSON.stringify(mockUser));
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); // For backend logout errors - This spy is not used in this test

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.token).toBe(mockToken));

      // Ensure backendLogoutApi (which is authApi.logoutApi in the mock) returns a promise
      // to prevent TypeError: undefined.catch is not a function in logout()
      vi.mocked(authApi.logoutApi).mockResolvedValue(undefined);

      // Constructing AuthError according to its actual definition (1 argument)
      // The mocked AuthError (MockAuthError) also takes 1 argument now.
      const authError = new apiClient.AuthError('Session expired');

      // Use mockImplementation for clarity that it's an async function throwing
      vi.mocked(apiClient.apiClient).mockImplementation(async () => {
        // console.log('Mocked apiClient (in test) is throwing AuthError:', authError);
        throw authError;
      });

      let caughtError;
      await act(async () => {
        try {
          await result.current.authenticatedFetch('/protected-route');
        } catch (e) {
          caughtError = e;
        }
      });

      expect(caughtError).toBe(authError);
      // Wait for state updates from logout to propagate
      await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
      expect(result.current.token).toBeNull();
      expect(localStorageMock.getItem('authToken')).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith('authenticatedFetch: AuthError instance caught. Logging out.', authError);
      consoleWarnSpy.mockRestore();
    });
  });
});
