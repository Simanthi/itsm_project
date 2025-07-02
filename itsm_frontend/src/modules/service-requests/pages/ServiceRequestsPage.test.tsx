// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../context/auth/AuthContext';
import { UIContextProvider } from '../../../context/UIContext/UIContextProvider';
import { ServiceRequestProvider } from '../context/ServiceRequestProvider'; // Import the specific context
import ServiceRequestsPage from './ServiceRequestsPage';
import * as serviceRequestApi from '../../../api/serviceRequestApi'; // Specific API for service requests
import * as useAuthHook from '../../../context/auth/useAuth';
import * as useUIHook from '../../../context/UIContext/useUI';
import type { ServiceRequest, PaginatedResponse } from '../types/ServiceRequestTypes';

// Mock API module
vi.mock('../../../api/serviceRequestApi');

// Mock context hooks
vi.mock('../../../context/auth/useAuth');
vi.mock('../../../context/UIContext/useUI');
// vi.mock('../context/ServiceRequestContext'); // Not mocking the context itself, but will use the real Provider

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderServiceRequestsPage = () => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <UIContextProvider>
          <ServiceRequestProvider> {/* Wrap with ServiceRequestProvider */}
            <ServiceRequestsPage />
          </ServiceRequestProvider>
        </UIContextProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

const mockServiceRequests: ServiceRequest[] = [
  {
    id: 1,
    request_id: 'SR-001',
    title: 'Printer not working',
    description: 'The office printer on the 2nd floor is jammed.',
    status: 'open',
    priority: 'high',
    category: { id: 1, name: 'Hardware Issue', description: '' },
    reported_by: { id: 1, username: 'jdoe', email: 'jdoe@example.com', first_name: 'John', last_name: 'Doe' },
    assigned_to: null,
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-03-01T10:00:00Z',
    resolution_notes: null,
    resolved_at: null,
    attachments: [],
    related_cis: [],
    sla_due_date: '2024-03-05T10:00:00Z',
  },
  {
    id: 2,
    request_id: 'SR-002',
    title: 'Software access needed',
    description: 'Need access to the new accounting software.',
    status: 'in_progress',
    priority: 'medium',
    category: { id: 2, name: 'Software Request', description: '' },
    reported_by: { id: 2, username: 'asmith', email: 'asmith@example.com', first_name: 'Alice', last_name: 'Smith' },
    assigned_to: { id: 3, username: 'techguy', email: 'tech@example.com', first_name: 'Tech', last_name: 'Guy' },
    created_at: '2024-03-02T11:00:00Z',
    updated_at: '2024-03-02T11:30:00Z',
    resolution_notes: null,
    resolved_at: null,
    attachments: [],
    related_cis: [],
    sla_due_date: '2024-03-08T11:00:00Z',
  },
];

const mockPaginatedSRsResponse: PaginatedResponse<ServiceRequest> = {
  count: mockServiceRequests.length,
  next: null,
  previous: null,
  results: mockServiceRequests,
};

const mockEmptySRsResponse: PaginatedResponse<ServiceRequest> = {
  count: 0,
  next: null,
  previous: null,
  results: [],
};

const mockUser = { id: 1, name: 'Test User', role: 'admin', is_staff: true, groups: [] };

describe('ServiceRequestsPage.tsx', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      token: 'mockToken',
      user: mockUser,
      authenticatedFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      isAuthenticated: true,
    });

    vi.mocked(useUIHook.useUI).mockReturnValue({
      showSnackbar: vi.fn(),
      showConfirmDialog: vi.fn(),
      hideConfirmDialog: vi.fn(),
      isConfirmDialogVisible: false,
      confirmDialogConfig: null,
    });

    vi.mocked(serviceRequestApi.getServiceRequests).mockResolvedValue(mockPaginatedSRsResponse);
  });

  it('renders the main title and create button', async () => {
    renderServiceRequestsPage();
    expect(await screen.findByRole('heading', { name: /Service Requests/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create New Request/i })).toBeInTheDocument();
  });

  it('renders table headers correctly', async () => {
    renderServiceRequestsPage();
    // Wait for data to load as headers are part of DataGrid which renders after data fetch
    await waitFor(() => expect(serviceRequestApi.getServiceRequests).toHaveBeenCalledTimes(1));

    expect(screen.getByText('Request ID')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Requested By')).toBeInTheDocument(); // Changed from Reported By
    expect(screen.getByText('Assigned To')).toBeInTheDocument();
    expect(screen.getByText('Created At')).toBeInTheDocument();
    expect(screen.getByText('Last Updated')).toBeInTheDocument(); // Added
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('displays service requests in the table', async () => {
    renderServiceRequestsPage();
    await waitFor(() => {
      expect(screen.getByText(mockServiceRequests[0].request_id!)).toBeInTheDocument();
      expect(screen.getByText(mockServiceRequests[0].title)).toBeInTheDocument();
      expect(screen.getByText(mockServiceRequests[1].request_id!)).toBeInTheDocument();
      expect(screen.getByText(mockServiceRequests[1].title)).toBeInTheDocument();
    });
  });

  it('displays "No service requests found." when no requests are available', async () => {
    vi.mocked(serviceRequestApi.getServiceRequests).mockResolvedValue(mockEmptySRsResponse);
    renderServiceRequestsPage();
    await waitFor(() => {
      expect(screen.getByText(/No service requests found/i)).toBeInTheDocument();
    });
  });

  it('displays loading state initially', async () => {
    vi.mocked(serviceRequestApi.getServiceRequests).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve(mockPaginatedSRsResponse), 100))
    );
    renderServiceRequestsPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('handles error when fetching service requests fails', async () => {
    const errorMessage = 'API Error Fetching Service Requests';
    vi.mocked(serviceRequestApi.getServiceRequests).mockRejectedValueOnce(new Error(errorMessage));
    renderServiceRequestsPage();
    expect(await screen.findByText(new RegExp(errorMessage, "i"))).toBeInTheDocument();
  });

  it('navigates to create new service request form when "Create New Request" is clicked', async () => {
    const user = userEvent.setup();
    renderServiceRequestsPage();
    const createButton = screen.getByRole('button', { name: /Create New Request/i });
    await user.click(createButton);
    expect(mockNavigate).toHaveBeenCalledWith('/service-requests/new'); // Or the correct path
  });

  it('navigates to view service request details when view icon is clicked', async () => {
    const user = userEvent.setup();
    renderServiceRequestsPage();
    // DataGrid actions are often buttons with aria-label or specific test ids might be needed if not directly named
    // The action item in ServiceRequestsPage has label="View"
    const viewButtons = await screen.findAllByRole('button', { name: /View/i });
    expect(viewButtons[0]).toBeInTheDocument(); // Assuming at least one row with a view button

    await user.click(viewButtons[0]);
    // The component navigates using request_id (e.g., "SR-001"), not the numeric id.
    expect(mockNavigate).toHaveBeenCalledWith(`/service-requests/view/${mockServiceRequests[0].request_id}`);
  });
});
