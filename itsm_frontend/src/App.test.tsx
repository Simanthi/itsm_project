// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import App from './App'; // Assuming App.tsx is in src/
import { AuthProvider } from './context/auth/AuthContext';
import * as useAuthHook from './context/auth/useAuth';
import { UIContextProvider } from './context/UIContext/UIContextProvider';

// Mock child components that are not the focus of App.tsx routing logic
vi.mock('./pages/HomePage', () => ({ default: () => <div>HomePageMock</div> }));
vi.mock('./modules/auth/LoginPage', () => ({ default: () => <div>LoginPageMock</div> }));
vi.mock('./modules/assets/pages/AssetsPage', () => ({ default: () => <div>AssetsPageMock</div> }));
vi.mock('./pages/NotFoundPage', () => ({ default: () => <div>NotFoundPageMock</div> }));
// Mock other major route components if App.tsx directly references them or for more complex routing tests
vi.mock('./modules/service-requests/pages/ServiceRequestsPage', () => ({ default: () => <div>ServiceRequestsPageMock</div>}));
vi.mock('./modules/incidents/IncidentManagementPage', () => ({ default: () => <div>IncidentManagementPageMock</div>}));
vi.mock('./modules/changes/pages/ChangeManagementPage', () => ({ default: () => <div>ChangeManagementPageMock</div>}));
vi.mock('./modules/configs/pages/ConfigurationManagementPage', () => ({ default: () => <div>ConfigurationManagementPageMock</div>}));
vi.mock('./modules/procurement/pages/ProcurementDashboardPage', () => ({ default: () => <div>ProcurementDashboardPageMock</div>}));
vi.mock('./modules/reports/ReportsAnalyticsPage', () => ({ default: () => <div>ReportsAnalyticsPageMock</div>}));
vi.mock('./modules/security-access/SecurityAccessPage', () => ({ default: () => <div>SecurityAccessPageMock</div>}));
vi.mock('./modules/workflows/pages/MyApprovalsPage', () => ({ default: () => <div>MyApprovalsPageMock</div>}));
vi.mock('./modules/iomTemplateAdmin/pages/IomTemplateListPage', () => ({ default: () => <div>IomTemplateListPageMock</div>}));
vi.mock('./modules/genericIom/pages/GenericIomListPage', () => ({ default: () => <div>GenericIomListPageMock</div>}));


// Mock useAuth
const mockUseAuth = vi.spyOn(useAuthHook, 'useAuth');

const renderApp = (initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <UIContextProvider>
        <AuthProvider> {/* AuthProvider is needed as App component might use useAuth directly or indirectly */}
          <App />
        </AuthProvider>
      </UIContextProvider>
    </MemoryRouter>
  );
};


describe('App.tsx Routing and Authentication', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders LoginPage for "/" when not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      authenticatedFetch: vi.fn(),
    });
    renderApp(['/']);
    // App.tsx redirects from '/' to '/home' or '/login'.
    // If not authenticated, '/home' (protected) should redirect to login.
    await waitFor(() => expect(screen.getByText('LoginPageMock')).toBeInTheDocument());
  });

  it('renders HomePage for "/" when authenticated', async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1, name: 'Test User', role: 'user', is_staff: false, groups:[] },
      token: 'fake-token',
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      authenticatedFetch: vi.fn(),
    });
    renderApp(['/']);
     // App.tsx redirects from '/' to '/home'. If authenticated, HomePageMock should render.
    await waitFor(() => expect(screen.getByText('HomePageMock')).toBeInTheDocument());
  });

  it('renders LoginPage for "/login" route', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null, token: null, loading: false, login: vi.fn(), logout: vi.fn(), authenticatedFetch: vi.fn() });
    renderApp(['/login']);
    await waitFor(() => expect(screen.getByText('LoginPageMock')).toBeInTheDocument());
  });

  it('redirects to LoginPage for a protected route when not authenticated', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null, token: null, loading: false, login: vi.fn(), logout: vi.fn(), authenticatedFetch: vi.fn() });
    renderApp(['/assets']); // Example protected route
    await waitFor(() => expect(screen.getByText('LoginPageMock')).toBeInTheDocument());
  });

  it('renders the protected route component when authenticated', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, user: { id: 1, name: 'Test User', role: 'user', is_staff: false, groups:[] }, token: 'fake-token', loading: false, login: vi.fn(), logout: vi.fn(), authenticatedFetch: vi.fn() });
    renderApp(['/assets']); // Example protected route
    await waitFor(() => expect(screen.getByText('AssetsPageMock')).toBeInTheDocument());
  });

  it('renders NotFoundPage for an unknown route', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, user: null, token: null, loading: false, login: vi.fn(), logout: vi.fn(), authenticatedFetch: vi.fn() });
    renderApp(['/some/unknown/route']);
    await waitFor(() => expect(screen.getByText('NotFoundPageMock')).toBeInTheDocument());
  });
});
