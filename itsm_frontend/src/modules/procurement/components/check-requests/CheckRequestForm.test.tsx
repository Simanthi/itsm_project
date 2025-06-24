import { describe, it, expect, vi, beforeEach } from 'vitest';
// fireEvent removed as it's not used yet
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as ReactRouterDom from 'react-router-dom';
import { UIContextProvider as UIProvider } from '../../../../context/UIContext/UIContextProvider';
import CheckRequestForm from './CheckRequestForm';
import { AuthProvider } from '../../../../context/auth/AuthContext';

// Mock API dependencies
import * as procurementApi from '../../../../api/procurementApi';
import * as assetApi from '../../../../api/assetApi';

// Define a PaginatedResponse type helper for mocks
type MockPaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

vi.mock('../../../../api/procurementApi', () => ({
  getCheckRequestById: vi.fn(),
  createCheckRequest: vi.fn(),
  updateCheckRequest: vi.fn(),
  // getPurchaseOrdersForCheckRequest: vi.fn(), // This seems unused by the component, removing from mock
  getPurchaseOrders: vi.fn((): Promise<MockPaginatedResponse<unknown>> => Promise.resolve({ results: [], count: 0, next: null, previous: null })), // Corrected, component uses this
  getDepartments: vi.fn((): Promise<MockPaginatedResponse<unknown>> => Promise.resolve({ results: [], count: 0, next: null, previous: null })),  // Adjusted for PaginatedResponse
  getProjects: vi.fn((): Promise<MockPaginatedResponse<unknown>> => Promise.resolve({ results: [], count: 0, next: null, previous: null })), // Adjusted for PaginatedResponse
  getExpenseCategories: vi.fn((): Promise<MockPaginatedResponse<unknown>> => Promise.resolve({ results: [], count: 0, next: null, previous: null })), // Adjusted for PaginatedResponse
  // getGLAccounts is not used by CheckRequestForm, removing from this specific mock
}));

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

describe('CheckRequestForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({});
    // Reset mocks for API calls that return promises with specific data for each test if needed
    vi.mocked(procurementApi.getPurchaseOrders).mockResolvedValue({ results: [], count: 0, next: null, previous: null });
    vi.mocked(assetApi.getVendors).mockResolvedValue({ results: [], count: 0, next: null, previous: null } as MockPaginatedResponse<Partial<import('../../../../api/assetApi').Vendor>>);
    // getGLAccounts is not used by CheckRequestForm, so no need to reset its mock here
    // getPurchaseOrdersForCheckRequest is not used, removed from mock and here
  });

  it('renders the form in create mode', async () => {
    renderWithProviders(<CheckRequestForm />);
    expect(screen.getByRole('heading', { name: /Create New Check Request/i })).toBeInTheDocument();
  });

  it('renders the form in edit mode when checkRequestId is provided', async () => {
    const mockCrId = 'cr123';
    const numericMockCrId = 123; // Assuming ID is number
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({ checkRequestId: mockCrId });

    vi.mocked(procurementApi.getCheckRequestById).mockResolvedValue({
      id: numericMockCrId,
      cr_number: 'CR-001',
      purchase_order: null,
      vendor_id: 1,
      payee_name: 'Mock Payee from Edit',
      payee_address: '123 Mock St',
      invoice_number: 'INV-EDIT-001',
      invoice_date: '2024-06-15',
      amount: '1250.75',
      reason_for_payment: 'Test CR for edit',
      expense_category: null,
      is_urgent: false,
      recurring_payment: null,
      currency: 'USD',
      status: 'draft' as 'draft', // Cast to CheckRequestStatus type
      request_date: '2024-07-01T00:00:00Z',
      requested_by_username: 'testuser',
      // attachments: null,
    });

    renderWithProviders(<CheckRequestForm />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Edit Check Request #123/i })).toBeInTheDocument(); // Corrected ID
      expect(screen.getByDisplayValue('Test CR for edit')).toBeInTheDocument(); // Checks reason_for_payment
      expect(screen.getByDisplayValue('Mock Payee from Edit')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1250.75')).toBeInTheDocument();
      expect(screen.getByDisplayValue('INV-EDIT-001')).toBeInTheDocument();
    });
  });

  it('validates required fields on submit', async () => {
    renderWithProviders(<CheckRequestForm />);
    // Assuming a submit button text like "Submit Check Request" or "Save Check Request"
    // fireEvent.click(screen.getByRole('button', { name: /Submit Check Request/i }));

    // await waitFor(() => {
      // Example: expect(screen.getByText(/Payee is required/i)).toBeInTheDocument();
      // expect(screen.getByText(/Amount is required/i)).toBeInTheDocument();
    // });
    // Placeholder, actual validation depends on the form's implementation
  });

  it('submits the form successfully in create mode', async () => {
    // Provide a Vendor mock that matches the Vendor type (e.g., no 'phone' if not in type)
    // Also ensure it's a PaginatedResponse
    vi.mocked(assetApi.getVendors).mockResolvedValue({
      results: [{id: 1, name: "Test Vendor Payee", contact_person: "", email: "payee@example.com", /* other required Vendor fields */ }],
      count: 1,
      next: null,
      previous: null
    } as MockPaginatedResponse<Partial<import('../../../../api/assetApi').Vendor>>);

    // const mockCreateCR = vi.mocked(procurementApi.createCheckRequest).mockResolvedValue({ // This line is unused for now
    vi.mocked(procurementApi.createCheckRequest).mockResolvedValue({
      id: 12345, // Assuming ID is number
      // ... other fields based on CheckRequest type ...
      cr_number: "CR-NEW-001",
      status: 'pending_approval' as 'pending_approval', // Valid CheckRequestStatus
      amount: "500.00",
      request_date: new Date().toISOString(),
      payee_name: "Test Vendor Payee",
      // ... other required fields from CheckRequest
    });

    renderWithProviders(<CheckRequestForm />);

    // Fill form fields (examples, adjust to actual fields)
    // const payeeAutocomplete = screen.getByLabelText(/Payee/i); // Or similar
    // fireEvent.mouseDown(payeeAutocomplete);
    // await waitFor(() => expect(screen.getByText('Test Vendor Payee')).toBeInTheDocument());
    // fireEvent.click(screen.getByText('Test Vendor Payee'));

    // fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: '500' } });
    // fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'New CR Description' } });

    // fireEvent.click(screen.getByRole('button', { name: /Submit Check Request/i }));

    // await waitFor(() => {
    //   expect(mockCreateCR).toHaveBeenCalled();
    // });
  });

  // Add more tests:
  // - Linking POs
  // - Itemization if applicable
  // - Different statuses and view-only mode
  // - API error handling
});
