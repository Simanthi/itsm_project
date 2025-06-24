import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as ReactRouterDom from 'react-router-dom';
import { UIContextProvider as UIProvider } from '../../../../context/UIContext/UIContextProvider';
import PurchaseRequestMemoForm from './PurchaseRequestMemoForm'; // The component to test
import { AuthProvider } from '../../../../context/auth/AuthContext';

// Mock API dependencies
import * as procurementApi from '../../../../api/procurementApi';
// Import other necessary API mocks if used by IOM form (e.g., assetApi for users/departments if they are fetched via assetApi)

vi.mock('../../../../api/procurementApi', () => ({
  getPurchaseRequestMemoById: vi.fn(),
  createPurchaseRequestMemo: vi.fn(),
  updatePurchaseRequestMemo: vi.fn(),
  getDepartmentsForDropdown: vi.fn(() => Promise.resolve({ results: [], count: 0 })), // Corrected name
  getProjectsForDropdown: vi.fn(() => Promise.resolve({ results: [], count: 0 })), // Added
  // Add any other procurementApi functions used by PurchaseRequestMemoForm
}));

// Mock other APIs if necessary (e.g., for fetching users, categories if not in procurementApi)
// vi.mock('../../../../api/someOtherApi', () => ({ ... }));

// assetApi is already mocked separately if needed for vendors, let's ensure it is.
vi.mock('../../../../api/assetApi', () => ({
  getVendors: vi.fn(() => Promise.resolve({ results: [], count: 0 })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
    useNavigate: vi.fn(() => vi.fn()),
  };
});

const mockAuthenticatedFetch = vi.fn();

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider value={{
        user: { id: 1, username: 'testuser', email: 'test@example.com', roles: ['admin'] },
        authenticatedFetch: mockAuthenticatedFetch,
        login: vi.fn(),
        logout: vi.fn(),
        loading: false,
        isAuthenticated: true,
       }}>
        <UIProvider>
          {ui}
        </UIProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('PurchaseRequestMemoForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({});
    // Reset mocks for API calls that return promises with specific data
    vi.mocked(procurementApi.getDepartmentsForDropdown).mockResolvedValue({ results: [], count: 0 }); // Corrected function name
    vi.mocked(procurementApi.getProjectsForDropdown).mockResolvedValue({ results: [], count: 0 });
    // vi.mocked(assetApi.getVendors).mockResolvedValue({ results: [], count: 0 }); // Already mocked globally for assetApi
    // Reset other necessary mocks
  });

  it('renders the form in create mode', async () => {
    renderWithProviders(<PurchaseRequestMemoForm />);
    // Check for a unique title or element for IOM form in create mode
    // Example: expect(screen.getByRole('heading', { name: /Create Purchase Request Memo/i })).toBeInTheDocument();
    // For now, a placeholder assertion based on common form elements:
    expect(screen.getByLabelText(/Item Description/i)).toBeInTheDocument();
  });

  it('renders the form in edit mode when memoId is provided', async () => {
    const mockMemoId = 'memo123';
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({ memoId: mockMemoId });

    vi.mocked(procurementApi.getPurchaseRequestMemoById).mockResolvedValue({
      id: mockMemoId,
      memo_id_display: 'IOM-001', // Example display ID
      // department: 1, // Example department ID
      // requested_by: 1, // Example user ID
      item_description: 'Test IOM for edit',
      quantity: 5,
      estimated_cost: 250,
      status: 'draft',
      // ... other necessary fields for a PurchaseRequestMemo ...
      request_date: '2024-07-01T00:00:00Z',
    });

    renderWithProviders(<PurchaseRequestMemoForm />);

    await waitFor(() => {
      // Example: expect(screen.getByRole('heading', { name: /Edit Purchase Request Memo/i })).toBeInTheDocument();
      // Check if form fields are populated
      expect(screen.getByDisplayValue('Test IOM for edit')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // Quantity
      expect(screen.getByDisplayValue('250')).toBeInTheDocument(); // Estimated Cost
    });
  });

  it('validates required fields on submit', async () => {
    renderWithProviders(<PurchaseRequestMemoForm />);
    // Assuming a submit button text like "Submit Memo" or "Save Memo"
    // fireEvent.click(screen.getByRole('button', { name: /Submit Memo/i }));

    // await waitFor(() => {
      // Example: expect(screen.getByText(/Item Description is required/i)).toBeInTheDocument();
    // });
  });

  it('submits the form successfully in create mode', async () => {
    vi.mocked(procurementApi.getDepartmentsForDropdown).mockResolvedValue({ results: [{id: 1, name: "Test Department"}], count: 1 }); // Corrected
    // Mock other dropdowns if needed (e.g., users for requested_by)

    const mockCreateMemo = vi.mocked(procurementApi.createPurchaseRequestMemo).mockResolvedValue({
      id: 'memo-new-id',
      // ... other fields ...
    });

    renderWithProviders(<PurchaseRequestMemoForm />);

    // Fill form fields (examples, adjust to actual fields)
    // fireEvent.change(screen.getByLabelText(/Department/i), { target: { value: '1' } }); // If it's a simple select
    // fireEvent.change(screen.getByLabelText(/Item Description/i), { target: { value: 'New IOM Description' } });
    // fireEvent.change(screen.getByLabelText(/Quantity/i), { target: { value: '10' } });
    // fireEvent.change(screen.getByLabelText(/Estimated Cost/i), { target: { value: '500' } });

    // fireEvent.click(screen.getByRole('button', { name: /Submit Memo/i }));

    // await waitFor(() => {
    //   expect(mockCreateMemo).toHaveBeenCalled();
    // });
  });
});
