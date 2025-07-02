// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/auth/AuthContext';
import { UIContextProvider } from '../../context/UIContext/UIContextProvider';
import LoginPage from './LoginPage';
import * as authApi from '../../api/authApi';
import * as useAuthHook from '../../context/auth/useAuth';
import * as useUIHook from '../../context/UIContext/useUI';

vi.mock('../../api/authApi', () => ({
  login: vi.fn(),
}));

const mockLoginContext = vi.fn();
const mockUseAuth = vi.spyOn(useAuthHook, 'useAuth');
const mockShowSnackbar = vi.fn();
vi.mock('../../context/UIContext/useUI', () => ({
  useUI: () => ({
    showSnackbar: mockShowSnackbar,
    showConfirmDialog: vi.fn(),
    hideConfirmDialog: vi.fn(),
    isConfirmDialogVisible: false,
    confirmDialogConfig: null,
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderLoginPage = () => {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <UIContextProvider>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </UIContextProvider>
    </MemoryRouter>
  );
};

describe('LoginPage.tsx', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockLoginContext.mockReset();

    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      login: mockLoginContext,
      logout: vi.fn(),
      authenticatedFetch: vi.fn(),
    });
  });

  it('renders login form elements correctly', () => {
    renderLoginPage();
    expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('does not call login context if HTML5 validation prevents submit for empty fields', async () => {
    // This test assumes that the browser/JSDOM's default behavior for 'required'
    // fields will prevent the form's onSubmit handler if fields are empty.
    // If this test fails (i.e., mockLoginContext IS called), it means the form
    // submission is not being prevented by native validation in the test environment as expected.
    renderLoginPage();
    const user = userEvent.setup();
    const signInButton = screen.getByRole('button', { name: /Sign In/i });

    await user.click(signInButton);

    // We expect mockLoginContext NOT to have been called because HTML5 validation should prevent submission.
    // However, if it IS called, it means the test environment isn't fully respecting native HTML5 form validation
    // in a way that stops the onSubmit. In a real browser, it would.
    // For this test, we'll assert it's NOT called. If it IS called, the previous version of this test
    // (`toHaveBeenCalledWith('', '')`) would be more appropriate, acknowledging that handleLogin is reached.
    expect(mockLoginContext).not.toHaveBeenCalled();
  });

  it('calls context login on successful submission, then navigates', async () => {
    mockLoginContext.mockResolvedValue(undefined);

    renderLoginPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Username/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => expect(mockLoginContext).toHaveBeenCalledWith('test@example.com', 'password123'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });

  it('shows error message in Alert on failed login', async () => {
    const errorMessage = 'Invalid credentials';
    mockLoginContext.mockRejectedValueOnce(new Error(errorMessage));

    renderLoginPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Username/i), 'wrong@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => expect(mockLoginContext).toHaveBeenCalledWith('wrong@example.com', 'wrongpassword'));

    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(errorMessage);
    expect(mockShowSnackbar).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

   it('shows a generic error message in Alert if context login fails unexpectedly', async () => {
    const genericErrorMessage = 'An unknown error occurred during login.';
    mockLoginContext.mockRejectedValueOnce({});

    renderLoginPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Username/i), 'test@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => expect(mockLoginContext).toHaveBeenCalledWith('test@example.com', 'password123'));
    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(genericErrorMessage);
   });
});
