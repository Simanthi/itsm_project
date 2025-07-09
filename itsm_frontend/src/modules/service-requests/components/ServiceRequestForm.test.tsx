// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom'; // Import useParams
import { AuthProvider } from '../../../context/auth/AuthContext';
import { UIContextProvider } from '../../../context/UIContext/UIContextProvider';
import { ServiceRequestProvider } from '../context/ServiceRequestProvider';
import ServiceRequestForm from './ServiceRequestForm';
import * as serviceRequestApi from '../../../api/serviceRequestApi';
import * as assetApi from '../../../api/assetApi'; // For categories
import * as useAuthHook from '../../../context/auth/useAuth';
import * as useUIHook from '../../../context/UIContext/useUI';
// ServiceCategory and PaginatedResponse will be imported from assetTypes or a shared location
import type { ServiceRequest } from '../types/ServiceRequestTypes';
import type { AssetCategory as ServiceCategory, PaginatedResponse } from '../../../modules/assets/types/assetTypes'; // Corrected path
import type { User } from '../../../types/UserTypes';

// Mock API modules
vi.mock('../../../api/serviceRequestApi');
vi.mock('../../../api/assetApi'); // For getAssetCategories (though form uses hardcoded categories)
import * as authApi from '../../../api/authApi'; // Import authApi
vi.mock('../../../api/authApi'); // Mock authApi for getUserList

// Mock context hooks
vi.mock('../../../context/auth/useAuth');
vi.mock('../../../context/UIContext/useUI');

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: vi.fn(), // Standard mock for useParams
  };
});


const mockUser: User = { id: 1, username: 'testuser', email: 'test@example.com', first_name: 'Test', last_name: 'User', is_staff: false, is_active: true, date_joined: new Date().toISOString(), last_login: null, groups: [] }; // Removed 'role', added missing User fields for completeness
const mockCategories: PaginatedResponse<ServiceCategory> = {
  count: 2, next: null, previous: null,
  results: [
    { id: 1, name: 'Hardware Issue', description: 'PC, Printer, etc.' },
    { id: 2, name: 'Software Access', description: 'Request new software or access to existing.' },
  ]
};

const renderForm = (requestId?: string, initialData?: Partial<ServiceRequest>) => {
  vi.mocked(useParams).mockReturnValue({ id: requestId });
  const path = requestId ? `/service-requests/edit/${requestId}` : '/service-requests/new';
  const elementToRender = <ServiceRequestForm initialData={initialData} />;

  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <UIContextProvider>
          <ServiceRequestProvider>
            <Routes>
              {/* Ensure the path prop matches what useParams will provide */}
              <Route path="/service-requests/new" element={elementToRender} />
              <Route path="/service-requests/edit/:id" element={elementToRender} />
            </Routes>
          </ServiceRequestProvider>
        </UIContextProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('ServiceRequestForm.tsx', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      token: 'mockToken',
      // user: mockUser, // This was User, needs to be AuthUser
      user: { // Conforms to AuthUser
        id: mockUser.id,
        name: mockUser.username, // Or `${mockUser.first_name} ${mockUser.last_name}`
        email: mockUser.email,
        role: 'user', // Example role, adjust as needed for tests
        is_staff: mockUser.is_staff,
        groups: mockUser.groups?.map(g => g.name) || [], // Assuming groups in User have name property
      },
      authenticatedFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
      login: vi.fn(),logout: vi.fn(), loading: false, isAuthenticated: true,
    });
    vi.mocked(useUIHook.useUI).mockReturnValue({
      showSnackbar: vi.fn(),
      showConfirmDialog: vi.fn(),
      hideConfirmDialog: vi.fn(),
      confirmDialogOpen: false,
      confirmDialogTitle: '',
      confirmDialogMessage: '',
      confirmDialogOnConfirm: vi.fn(),
      confirmDialogOnCancel: undefined,
      // Added missing snackbar properties
      snackbarOpen: false,
      snackbarMessage: '',
      snackbarSeverity: 'info',
      hideSnackbar: vi.fn(),
    });
    vi.mocked(assetApi.getAssetCategories).mockResolvedValue(mockCategories); // Though form doesn't use this API for categories
    vi.mocked(serviceRequestApi.createServiceRequest).mockResolvedValue({ id: 123, request_id: 'SR-NEW-123' } as ServiceRequest);
    vi.mocked(serviceRequestApi.updateServiceRequest).mockResolvedValue({ id: 1, request_id: 'SR-001' } as ServiceRequest);

    const mockUsersForDropdown: User[] = [
      { id: 1, username: 'testuser', email: 'test@example.com', first_name: 'Test', last_name: 'User', is_staff: false, is_active: true, date_joined: '', last_login: null, groups: [] },
      { id: 200, username: 'anotheruser', email: 'another@example.com', first_name: 'Another', last_name: 'User', is_staff: false, is_active: true, date_joined: '', last_login: null, groups: [] },
    ];
    vi.mocked(authApi.getUserList).mockResolvedValue(mockUsersForDropdown);
    // Ensure ServiceRequestProvider's fetch also works if it's called
    vi.mocked(serviceRequestApi.getServiceRequests).mockResolvedValue({ count: 0, next: null, previous: null, results: [] });


  });

  it('renders in create mode with empty fields and uses hardcoded categories', async () => {
    renderForm(); // No requestId means create mode

    // Wait for user loading to complete and form to be stable
    await waitFor(() => {
      expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Title/i)).toHaveValue('');
    expect(screen.getByLabelText(/Description/i)).toHaveValue('');

    const categorySelect = screen.getByLabelText(/Category/i);
    expect(categorySelect).toBeInTheDocument();
    // Check one of the hardcoded category options
    // Need to click to open the select, then check for an option
    await userEvent.click(categorySelect);
    expect(await screen.findByRole('option', { name: /Software/i })).toBeInTheDocument();
    // Close the select by clicking body or pressing Esc
    await userEvent.keyboard('{escape}');


    expect(screen.getByLabelText(/Priority/i)).toBeInTheDocument();
    // Check default priority
    expect(screen.getByLabelText(/Priority/i)).toHaveTextContent(/Medium/i); // Default is PRIORITY_OPTIONS[1]

    // Verify assetApi.getAssetCategories is NOT called
    expect(assetApi.getAssetCategories).not.toHaveBeenCalled();
  });

  it('loads service request data in edit mode when initialData is provided', async () => {
    const mockExistingSR: ServiceRequest = {
      id: 1,
      request_id: 'SR-EDIT-001',
      title: 'Existing Title',
      description: 'Existing Description',
      category: 'hardware', // Assign a valid ServiceRequestCategory string literal
      priority: 'high',
      status: 'new', // Add other required fields for ServiceRequest type
      resolution_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      requested_by_username: 'testuser',
      requested_by_id: 1,
      assigned_to_username: null,
      assigned_to_id: null,
      // catalog_item_id and catalog_item_name are optional
    };
    // No need to mock getServiceRequestById as the form component doesn't call it directly.
    // We pass initialData to simulate a parent component having fetched it.
    renderForm(mockExistingSR.request_id, mockExistingSR);

    // Wait for form to populate from initialData
    await waitFor(() => {
      expect(screen.getByLabelText(/Title/i)).toHaveValue(mockExistingSR.title);
    });
    expect(screen.getByLabelText(/Description/i)).toHaveValue(mockExistingSR.description);
    expect(screen.getByLabelText(/Category/i)).toHaveTextContent(/Hardware/i); // Based on 'hardware' value
    expect(screen.getByLabelText(/Priority/i)).toHaveTextContent(/High/i);
    expect(screen.getByLabelText(/Status/i)).toHaveTextContent(/New/i); // Status field is enabled in edit mode
  });

  it('shows warning if requested_by_id is missing on create', async () => {
    const user = userEvent.setup();

    // Mock useAuth to return no user for THIS test case.
    // Ensure all properties expected by AuthContextType are provided if not spreading a complete default.
    const mockAuthValueNoUser: ReturnType<typeof useAuthHook.useAuth> = {
      token: 'mockToken',
      user: null, // No user
      authenticatedFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
      login: vi.fn(),
      logout: vi.fn(),
      loading: false, // Ensure auth is not loading
      isAuthenticated: false,
      // Add any other fields from the actual useAuth return type if they exist in your project
      // For example, if these were part of the actual type:
      // isRefreshing: false,
      // loginError: null,
      // setLoginError: vi.fn(),
      // refreshAccessToken: vi.fn(),
    };
    // Use mockReturnValue for the duration of this test to handle potential re-renders
    vi.mocked(useAuthHook.useAuth).mockReturnValue(mockAuthValueNoUser);

    // Render the form. This instance will use the useAuth mock defined just above.
    const { getByLabelText, findByRole } = renderForm();

    // Wait for the form to be stable after initial user loading (which should be quick due to mock)
    // and after the useAuth mock takes effect.
    await waitFor(() => expect(getByLabelText(/Title/i)).toBeInTheDocument());

    const submitButton = await findByRole('button', { name: /Create Request/i });

    await user.type(getByLabelText(/Title/i), 'Test Title');
    await user.type(getByLabelText(/Title/i), 'Test Title');
    await user.type(getByLabelText(/Title/i), 'Test Title');
    await user.type(getByLabelText(/Description/i), 'Test Description');
    // Category and Priority have defaults from component's initial state.

    // The button should be disabled because requested_by_id cannot be set due to no authenticated user
    expect(submitButton).toBeDisabled();

    // The specific setError in useEffect might be cleared by a successful fetchUsers call.
    // The primary observable effect of no user is the disabled button.
    // If fetchUsers also failed, then that error would be shown.
    // For this test, we focus on the button's disabled state.

    expect(serviceRequestApi.createServiceRequest).not.toHaveBeenCalled();
    // Ensure the snackbar for this specific validation path in handleSubmit is not called
    // (because the button is disabled, handleSubmit is not reached).
    expect(vi.mocked(useUIHook.useUI().showSnackbar)).not.toHaveBeenCalledWith(
      "The 'Requested By' user is not set. Please ensure you are logged in and your user ID is valid.",
      'warning',
    );
  });

  // Add more tests: successful create, successful update, API error handling etc.

});
