// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../../context/auth/AuthContext';
import { UIContextProvider } from '../../../context/UIContext/UIContextProvider';
import { ServiceRequestProvider } from '../context/ServiceRequestProvider';
import ServiceRequestForm from './ServiceRequestForm';
import * as serviceRequestApi from '../../../api/serviceRequestApi';
import * as assetApi from '../../../api/assetApi'; // For categories
import * as useAuthHook from '../../../context/auth/useAuth';
import * as useUIHook from '../../../context/UIContext/useUI';
import type { ServiceRequest, ServiceCategory, PaginatedResponse } from '../types/ServiceRequestTypes';
import type { User } from '../../../types/UserTypes';

// Mock API modules
vi.mock('../../../api/serviceRequestApi');
vi.mock('../../../api/assetApi'); // For getAssetCategories

// Mock context hooks
vi.mock('../../../context/auth/useAuth');
vi.mock('../../../context/UIContext/useUI');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ requestId: undefined }), // Default to create mode
  };
});
const mockUseParams = vi.spyOn(require('react-router-dom'), 'useParams');


const mockUser: User = { id: 1, username: 'testuser', email: 'test@example.com', first_name: 'Test', last_name: 'User', role: 'user', is_staff: false, groups: [] };
const mockCategories: PaginatedResponse<ServiceCategory> = {
  count: 2, next: null, previous: null,
  results: [
    { id: 1, name: 'Hardware Issue', description: 'PC, Printer, etc.' },
    { id: 2, name: 'Software Access', description: 'Request new software or access to existing.' },
  ]
};

const renderForm = (requestId?: string) => {
  mockUseParams.mockReturnValue({ requestId });
  return render(
    <MemoryRouter initialEntries={requestId ? [`/service-requests/edit/${requestId}`] : ['/service-requests/new']}>
      <AuthProvider>
        <UIContextProvider>
          <ServiceRequestProvider>
            <Routes>
              <Route path="/service-requests/new" element={<ServiceRequestForm />} />
              <Route path="/service-requests/edit/:requestId" element={<ServiceRequestForm />} />
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
      user: mockUser,
      authenticatedFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
      login: vi.fn(),logout: vi.fn(), loading: false, isAuthenticated: true,
    });
    vi.mocked(useUIHook.useUI).mockReturnValue({
      showSnackbar: vi.fn(), showConfirmDialog: vi.fn(), hideConfirmDialog: vi.fn(),
      isConfirmDialogVisible: false, confirmDialogConfig: null,
    });
    vi.mocked(assetApi.getAssetCategories).mockResolvedValue(mockCategories);
    vi.mocked(serviceRequestApi.createServiceRequest).mockResolvedValue({ id: 123, request_id: 'SR-NEW-123' } as ServiceRequest);
    vi.mocked(serviceRequestApi.updateServiceRequest).mockResolvedValue({ id: 1, request_id: 'SR-001' } as ServiceRequest);
  });

  it('renders in create mode with empty fields and loads categories', async () => {
    renderForm();
    expect(screen.getByRole('heading', { name: /Create Service Request/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/i)).toHaveValue('');
    expect(screen.getByLabelText(/Description/i)).toHaveValue('');
    expect(screen.getByLabelText(/Category/i)).toBeInTheDocument(); // Select field
    expect(screen.getByLabelText(/Priority/i)).toBeInTheDocument(); // Select field

    await waitFor(() => expect(assetApi.getAssetCategories).toHaveBeenCalled());
    // Check if categories are populated in the select (example)
    // This requires knowing how MUI Select populates options.
    // await userEvent.click(screen.getByLabelText(/Category/i));
    // expect(await screen.findByText(mockCategories.results[0].name)).toBeInTheDocument();
  });

  it('loads service request data in edit mode', async () => {
    const mockExistingSR: ServiceRequest = {
      ...mockServiceRequests[0], // from a shared mock or define here
      id: 1,
      request_id: 'SR-EDIT-001',
      title: 'Existing Title',
      description: 'Existing Description',
      category: mockCategories.results[0], // { id: 1, name: 'Hardware Issue' }
      priority: 'high',
    };
    vi.mocked(serviceRequestApi.getServiceRequest).mockResolvedValue(mockExistingSR);

    renderForm('SR-EDIT-001');

    expect(await screen.findByRole('heading', { name: /Edit Service Request SR-EDIT-001/i })).toBeInTheDocument();
    await waitFor(() => expect(serviceRequestApi.getServiceRequest).toHaveBeenCalledWith(expect.any(Function), 'SR-EDIT-001'));

    expect(screen.getByLabelText(/Title/i)).toHaveValue(mockExistingSR.title);
    expect(screen.getByLabelText(/Description/i)).toHaveValue(mockExistingSR.description);
    // For MUI Select, checking the displayed value is more complex.
    // We'll check if the correct category ID is part of the form state eventually.
    // For now, ensure the form loads.
    expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Priority/i)).toHaveTextContent(/High/i); // MUI Select renders the label of the selected value
  });

  it('validates required fields (title, description, category) on submit', async () => {
    renderForm();
    const user = userEvent.setup();
    const submitButton = screen.getByRole('button', { name: /Submit Request/i }); // Or "Save Changes"

    await user.click(submitButton);

    await waitFor(async () => {
      expect(await screen.findByText(/Title is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/Description is required/i)).toBeInTheDocument();
      expect(await screen.findByText(/Category is required/i)).toBeInTheDocument();
    });
    expect(serviceRequestApi.createServiceRequest).not.toHaveBeenCalled();
  });

  // Add more tests: successful create, successful update, API error handling etc.

});
