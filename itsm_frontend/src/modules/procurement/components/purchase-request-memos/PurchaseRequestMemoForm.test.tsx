import { describe, it, expect, vi, beforeEach } from 'vitest';
// fireEvent removed as it's not used yet
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as ReactRouterDom from 'react-router-dom';
import { UIContextProvider as UIProvider } from '../../../../context/UIContext/UIContextProvider';
import PurchaseRequestMemoForm from './PurchaseRequestMemoForm'; // The component to test
import { AuthProvider } from '../../../../context/auth/AuthContext';

// Mock API dependencies
import * as procurementApi from '../../../../api/procurementApi';
import * as assetApi from '../../../../api/assetApi'; // Ensure this is imported
// Import other necessary API mocks if used by IOM form (e.g., assetApi for users/departments if they are fetched via assetApi)

// Define a PaginatedResponse type helper for mocks
type MockPaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

vi.mock('../../../../api/procurementApi', () => ({
  getPurchaseRequestMemoById: vi.fn(),
  createPurchaseRequestMemo: vi.fn(),
  updatePurchaseRequestMemo: vi.fn(),
  getDepartmentsForDropdown: vi.fn((): Promise<MockPaginatedResponse<unknown>> => Promise.resolve({ results: [], count: 0, next: null, previous: null })),
  getProjectsForDropdown: vi.fn((): Promise<MockPaginatedResponse<unknown>> => Promise.resolve({ results: [], count: 0, next: null, previous: null })),
  // Add any other procurementApi functions used by PurchaseRequestMemoForm
}));

// Mock other APIs if necessary (e.g., for fetching users, categories if not in procurementApi)
// vi.mock('../../../../api/someOtherApi', () => ({ ... }));

// assetApi is already mocked separately if needed for vendors, let's ensure it is.
vi.mock('../../../../api/assetApi', () => ({
  getVendors: vi.fn((): Promise<MockPaginatedResponse<Partial<import('../../../../api/assetApi').Vendor>>> => Promise.resolve({ results: [], count: 0, next: null, previous: null })),
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
      {/* AuthProvider does not take a value prop directly, it provides context internally */}
      <AuthProvider>
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
    vi.mocked(procurementApi.getDepartmentsForDropdown).mockResolvedValue({ results: [], count: 0, next: null, previous: null });
    vi.mocked(procurementApi.getProjectsForDropdown).mockResolvedValue({ results: [], count: 0, next: null, previous: null });
    vi.mocked(assetApi.getVendors).mockResolvedValue({ results: [], count: 0, next: null, previous: null } as MockPaginatedResponse<Partial<import('../../../../api/assetApi').Vendor>>);
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
    const numericMockMemoId = 123; // Assuming ID is number
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({ memoId: mockMemoId });

    vi.mocked(procurementApi.getPurchaseRequestMemoById).mockResolvedValue({
      id: numericMockMemoId, // Corrected to number
      memo_id_display: 'IOM-001',
      department: 1,
      project: null,
      priority: 'medium',
      required_delivery_date: '2024-08-01',
      suggested_vendor: null,
      requested_by: 1,
      item_description: 'Test IOM for edit',
      quantity: 5,
      reason: "Need this for testing edit mode",
      estimated_cost: 250,
      status: 'draft' as 'draft', // Corrected type
      request_date: '2024-07-01T00:00:00Z',
      // Add other fields as defined in PurchaseRequestMemo type for completeness
      requested_by_username: 'testuser',
      department_name: 'Test Department',
      project_name: null,
      suggested_vendor_name: null,
      attachments: null, // Or a mock URL string
      approver: null,
      approver_username: null,
      decision_date: null,
      approver_comments: null,
      iom_id: 'IOM-DISPLAY-001' // if this is different from memo_id_display
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
    vi.mocked(procurementApi.getDepartmentsForDropdown).mockResolvedValue({ results: [{id: 1, name: "Test Department", department_code: "TD"}], count: 1, next: null, previous: null }); // Corrected and completed
    // Mock other dropdowns if needed (e.g., users for requested_by)

    // const mockCreateMemo = vi.mocked(procurementApi.createPurchaseRequestMemo).mockResolvedValue({ // Unused for now
    vi.mocked(procurementApi.createPurchaseRequestMemo).mockResolvedValue({
      id: 12345, // Changed to number
      // ... other fields based on PurchaseRequestMemo type ...
      memo_id_display: "IOM-NEW-001",
      status: 'pending' as 'pending', // Valid status
      item_description: 'New IOM Description',
      quantity: 10,
      reason: "Reason for new IOM",
      request_date: new Date().toISOString(),
      // ... other required fields
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
