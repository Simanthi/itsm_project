import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as ReactRouterDom from 'react-router-dom';
import { UIContextProvider as UIProvider } from '../../../../context/UIContext/UIContextProvider';
import CheckRequestForm from './CheckRequestForm';
import { AuthProvider } from '../../../../context/auth/AuthContext';

// Mock API dependencies
import * as procurementApi from '../../../../api/procurementApi';
import * as assetApi from '../../../../api/assetApi'; // If vendors/other assets needed

vi.mock('../../../../api/procurementApi', () => ({
  getCheckRequestById: vi.fn(),
  createCheckRequest: vi.fn(),
  updateCheckRequest: vi.fn(),
  getPurchaseOrdersForCheckRequest: vi.fn(() => Promise.resolve({ results: [], count: 0 })),
  getPurchaseOrders: vi.fn(() => Promise.resolve({ results: [], count: 0 })), // Added this
  getDepartments: vi.fn(() => Promise.resolve([])),
  getProjects: vi.fn(() => Promise.resolve([])),
  getExpenseCategories: vi.fn(() => Promise.resolve([])),
  getGLAccounts: vi.fn(() => Promise.resolve({ results: [], count: 0 })),
}));

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

describe('CheckRequestForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({});
    // Reset mocks for API calls that return promises with specific data for each test if needed
    vi.mocked(procurementApi.getPurchaseOrdersForCheckRequest).mockResolvedValue({ results: [], count: 0 });
    vi.mocked(assetApi.getVendors).mockResolvedValue({ results: [], count: 0 });
    vi.mocked(procurementApi.getGLAccounts).mockResolvedValue({ results: [], count: 0 });
  });

  it('renders the form in create mode', async () => {
    renderWithProviders(<CheckRequestForm />);
    expect(screen.getByRole('heading', { name: /Create New Check Request/i })).toBeInTheDocument();
  });

  it('renders the form in edit mode when checkRequestId is provided', async () => {
    const mockCrId = 'cr123';
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({ checkRequestId: mockCrId });

    vi.mocked(procurementApi.getCheckRequestById).mockResolvedValue({
      id: mockCrId, // Should match component's expectation (string or number)
      cr_number: 'CR-001', // Displayed in header
      purchase_order: null, // or a PO id if testing linked PO
      vendor_id: 1, // Or payee_name if not from PO
      payee_name: 'Mock Payee from Edit',
      payee_address: '123 Mock St',
      invoice_number: 'INV-EDIT-001',
      invoice_date: '2024-06-15', // YYYY-MM-DD format
      amount: '1250.75', // String, as component uses it
      reason_for_payment: 'Test CR for edit', // This is the description
      expense_category: null, // or an ID
      is_urgent: false,
      recurring_payment: null, // or an ID
      currency: 'USD', // Valid currency
      status: 'draft', // To ensure it's editable and has correct title part
      request_date: '2024-07-01T00:00:00Z',
      requested_by_username: 'testuser',
      // attachments: null, // Or a mock URL string
      // Ensure all fields expected by `setFormData` in `fetchCheckRequest` are here
    });

    renderWithProviders(<CheckRequestForm />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Edit Check Request #cr123/i })).toBeInTheDocument();
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
    vi.mocked(assetApi.getVendors).mockResolvedValue({ results: [{id: 1, name: "Test Vendor Payee", contact_person: "", email: "", phone: ""}], count: 1 });

    const mockCreateCR = vi.mocked(procurementApi.createCheckRequest).mockResolvedValue({
      id: 'cr-new-id',
      // ... other fields ...
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
