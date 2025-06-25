import { describe, it, expect, vi, beforeEach } from 'vitest';
// fireEvent removed as it's not used yet
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as ReactRouterDom from 'react-router-dom';
import { UIContextProvider as UIProvider } from '../../../../context/UIContext/UIContextProvider';
import CheckRequestForm from './CheckRequestForm';
import { AuthProvider } from '../../../../context/auth/AuthContext';
import type { CheckRequest, Vendor, PurchaseOrder, Department, Project, ExpenseCategory, PaginatedResponse } from '../../types/procurementTypes';

// Mock API dependencies
import * as procurementApi from '../../../../api/procurementApi';
import * as assetApi from '../../../../api/assetApi';
import * as useAuthHook from '../../../../context/auth/useAuth';

// Define a PaginatedResponse type helper for mocks
type MockPaginatedResponse<T> = PaginatedResponse<T>; // Use the actual PaginatedResponse type

vi.mock('../../../../api/procurementApi', () => ({
  getCheckRequestById: vi.fn(),
  createCheckRequest: vi.fn(),
  updateCheckRequest: vi.fn(),
  getPurchaseOrders: vi.fn((): Promise<MockPaginatedResponse<PurchaseOrder>> => Promise.resolve({ results: [], count: 0, next: null, previous: null })),
  getDepartmentsForDropdown: vi.fn((): Promise<MockPaginatedResponse<Department>> => Promise.resolve({ results: [], count: 0, next: null, previous: null })),
  getProjectsForDropdown: vi.fn((): Promise<MockPaginatedResponse<Project>> => Promise.resolve({ results: [], count: 0, next: null, previous: null })),
  getExpenseCategoriesForDropdown: vi.fn((): Promise<MockPaginatedResponse<ExpenseCategory>> => Promise.resolve({ results: [], count: 0, next: null, previous: null })),
}));

vi.mock('../../../../api/assetApi', () => ({
  getVendors: vi.fn((): Promise<MockPaginatedResponse<Vendor>> => Promise.resolve({
    results: [],
    count: 0,
    next: null,
    previous: null
  })),
}));

vi.mock('../../../../context/auth/useAuth');

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
    useNavigate: vi.fn(() => vi.fn()),
  };
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
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
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: { id: 1, name: 'testuser', email: 'test@example.com', role: 'admin', is_staff: true },
      authenticatedFetch: vi.fn(), // This specific mock for authenticatedFetch inside useAuth is fine
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      isAuthenticated: true,
    });
    // Reset mocks for API calls
    vi.mocked(procurementApi.getPurchaseOrders).mockResolvedValue({ results: [], count: 0, next: null, previous: null });
    vi.mocked(assetApi.getVendors).mockResolvedValue({ results: [], count: 0, next: null, previous: null } as MockPaginatedResponse<Vendor>);
    vi.mocked(procurementApi.getDepartmentsForDropdown).mockResolvedValue({ results: [], count: 0, next: null, previous: null });
    vi.mocked(procurementApi.getProjectsForDropdown).mockResolvedValue({ results: [], count: 0, next: null, previous: null });
    vi.mocked(procurementApi.getExpenseCategoriesForDropdown).mockResolvedValue({ results: [], count: 0, next: null, previous: null });
  });

  it('renders the form in create mode', async () => {
    renderWithProviders(<CheckRequestForm />);
    expect(screen.getByRole('heading', { name: /Create New Check Request/i })).toBeInTheDocument();
  });

  it('renders the form in edit mode when checkRequestId is provided', async () => {
    const mockCrIdString = 'cr123';
    const numericMockCrId = 123;
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({ checkRequestId: mockCrIdString });

    const mockCheckRequest: CheckRequest = {
      id: numericMockCrId,
      cr_id: `CR-${numericMockCrId}`,
      purchase_order: null,
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
      status: 'pending_submission' as const, // Use 'as const' for literal type
      request_date: '2024-07-01T00:00:00Z',
      requested_by: 1,
      requested_by_username: 'testuser',
      attachments: null,
      department: null,
      department_name: null,
      project: null,
      project_name: null,
      approved_by_accounts: null,
      approved_by_accounts_username: null,
      accounts_approval_date: null,
      accounts_comments: null,
      payment_method: null,
      payment_date: null,
      transaction_id: null,
      payment_notes: null,
      // created_at: new Date().toISOString(), // Removed as per type
      // updated_at: new Date().toISOString(), // Removed as per type
    };
    vi.mocked(procurementApi.getCheckRequestById).mockResolvedValue(mockCheckRequest);

    renderWithProviders(<CheckRequestForm />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: `Edit Check Request #${numericMockCrId}` })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test CR for edit')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Mock Payee from Edit')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1250.75')).toBeInTheDocument();
      expect(screen.getByDisplayValue('INV-EDIT-001')).toBeInTheDocument();
    });
  });

  it('validates required fields on submit', async () => {
    renderWithProviders(<CheckRequestForm />);
    // Placeholder
  });

  it('submits the form successfully in create mode', async () => {
    const minimalVendor: Vendor = {
      id: 1,
      name: "Test Vendor Payee",
      contact_person: "",
      email: "payee@example.com",
      address: "",
      vendor_code: "V001",
      payment_terms: "",
      // Ensure all non-optional fields from Vendor type are present
      is_active: true,
      category: null, // Example if category can be null or provide a valid category ID/object
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null, // Or a user ID
      updated_by: null, // Or a user ID
    };
    vi.mocked(assetApi.getVendors).mockResolvedValue({
      results: [minimalVendor],
      count: 1,
      next: null,
      previous: null
    });

    const createdCR: CheckRequest = { // Use full CheckRequest type
      id: 12345,
      cr_id: "CR-NEW-001", // This is a display ID, backend might generate it.
      status: 'pending_approval' as const,
      amount: "500.00",
      request_date: new Date().toISOString(),
      payee_name: "Test Vendor Payee",
      purchase_order: null,
      reason_for_payment: "test",
      requested_by: 1,
      // created_at: new Date().toISOString(), // Removed as per type
      // updated_at: new Date().toISOString(), // Removed as per type
      requested_by_username: "test",
      invoice_number: null,
      invoice_date: null,
      payee_address: null,
      expense_category: null,
      is_urgent: false,
      recurring_payment: null,
      currency: 'USD',
      attachments: null,
      department: null,
      department_name: null,
      project: null,
      project_name: null,
      approved_by_accounts: null,
      approved_by_accounts_username: null,
      accounts_approval_date: null,
      accounts_comments: null,
      payment_method: null,
      payment_date: null,
      transaction_id: null,
      payment_notes: null,
    };
    vi.mocked(procurementApi.createCheckRequest).mockResolvedValue(createdCR);

    renderWithProviders(<CheckRequestForm />);

    // Placeholder for actual form filling and submission
    // fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: '500' } });
    // fireEvent.click(screen.getByRole('button', { name: /Create Request/i }));
    // await waitFor(() => {
    //   expect(procurementApi.createCheckRequest).toHaveBeenCalled();
    // });
  });
});
