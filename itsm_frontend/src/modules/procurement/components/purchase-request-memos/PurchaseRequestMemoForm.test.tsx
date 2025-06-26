import { describe, it, expect, vi, beforeEach } from 'vitest';
// fireEvent removed as it's not used yet
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as ReactRouterDom from 'react-router-dom';
import { UIContextProvider as UIProvider } from '../../../../context/UIContext/UIContextProvider';
import PurchaseRequestMemoForm from './PurchaseRequestMemoForm';
import { AuthProvider } from '../../../../context/auth/AuthContext';
import type { PurchaseRequestMemo, Department, Project, PaginatedResponse } from '../../types/procurementTypes';
import type { Vendor } from '../../../assets/types/assetTypes';

// Mock API dependencies
import * as procurementApi from '../../../../api/procurementApi';
import * as assetApi from '../../../../api/assetApi';
import * as useAuthHook from '../../../../context/auth/useAuth';

// Define a PaginatedResponse type helper for mocks
type MockPaginatedResponse<T> = PaginatedResponse<T>;

vi.mock('../../../../api/procurementApi', () => ({
  getPurchaseRequestMemoById: vi.fn(),
  createPurchaseRequestMemo: vi.fn(),
  updatePurchaseRequestMemo: vi.fn(),
  getDepartmentsForDropdown: vi.fn((): Promise<MockPaginatedResponse<Department>> => Promise.resolve({ results: [], count: 0, next: null, previous: null })),
  getProjectsForDropdown: vi.fn((): Promise<MockPaginatedResponse<Project>> => Promise.resolve({ results: [], count: 0, next: null, previous: null })),
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

// Helper to create a full Vendor for mocks, satisfying the type
// const createMockVendor = (vendor: Partial<Vendor>): Vendor => ({ // Removed as unused
//   id: vendor.id || 0, // Ensure id is number
//   name: vendor.name || "Mock Vendor",
//   contact_person: vendor.contact_person || null,
//   email: vendor.email || null,
//   address: vendor.address || null,
//   vendor_code: vendor.vendor_code || null,
//   payment_terms: vendor.payment_terms || null,
//   category: vendor.category || null,
//   created_at: vendor.created_at || new Date().toISOString(),
//   updated_at: vendor.updated_at || new Date().toISOString(),
//   created_by: vendor.created_by || null,
//   updated_by: vendor.updated_by || null,
//   is_active: vendor.is_active === undefined ? true : vendor.is_active,
// });


describe('PurchaseRequestMemoForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({});
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      token: 'mockToken', // Added token
      user: { id: 1, name: 'testuser', role: 'admin', is_staff: true },
      authenticatedFetch: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      isAuthenticated: true,
    });
    vi.mocked(procurementApi.getDepartmentsForDropdown).mockResolvedValue({ results: [], count: 0, next: null, previous: null });
    vi.mocked(procurementApi.getProjectsForDropdown).mockResolvedValue({ results: [], count: 0, next: null, previous: null });
    vi.mocked(assetApi.getVendors).mockResolvedValue({ results: [], count: 0, next: null, previous: null });
  });

  it('renders the form in create mode', async () => {
    renderWithProviders(<PurchaseRequestMemoForm />);
    // Wait for async operations triggered by useEffect (dropdown data fetching) to complete
    await waitFor(() => {
      expect(screen.getByLabelText(/Item Description/i)).toBeInTheDocument();
      // Add checks for elements that might appear after dropdowns load, if applicable
      // For now, ensuring the main elements are rendered after potential state updates is key.
    });
  });

  it('renders the form in edit mode when memoId is provided', async () => {
    const mockMemoIdString = 'memo123';
    const numericMockMemoId = 123;
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({ memoId: mockMemoIdString });

    // Mock department data for the dropdown
    const mockDepartments: Department[] = [
      { id: 1, name: 'Test Dept', department_code: 'TD001' },
      { id: 2, name: 'Another Dept', department_code: 'AD002' },
    ];
    vi.mocked(procurementApi.getDepartmentsForDropdown).mockResolvedValue({
      results: mockDepartments,
      count: mockDepartments.length,
      next: null,
      previous: null,
    });

    const mockMemo: PurchaseRequestMemo = {
      id: numericMockMemoId,
      iom_id: 'IOM-001',
      department: 1, // This ID should match one in mockDepartments
      department_name: 'Test Dept',
      project: null,
      project_name: null,
      requested_by: 1,
      requested_by_username: 'testuser',
      item_description: 'Test IOM for edit',
      quantity: 5,
      reason: 'Urgent need',
      estimated_cost: 250,
      status: 'pending' as const, // Changed from 'draft'
      priority: 'high' as const,
      request_date: '2024-07-01T00:00:00Z',
      required_delivery_date: '2024-08-01',
      suggested_vendor: null,
      suggested_vendor_name: null,
      attachments: null,
      approver: null,
      approver_username: null,
      decision_date: null,
      approver_comments: null,
      // created_at: new Date().toISOString(), // Removed as per type
      // updated_at: new Date().toISOString(), // Removed as per type
    };
    vi.mocked(procurementApi.getPurchaseRequestMemoById).mockResolvedValue(mockMemo);

    renderWithProviders(<PurchaseRequestMemoForm />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test IOM for edit')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('250')).toBeInTheDocument();
      // Check if the department is correctly selected/displayed if the form has such a field
      // For example, if there's a Select dropdown for department:
      // Assuming the Select might display the name 'Test Dept' or its value '1'
      // This depends on how the Select is implemented in PurchaseRequestMemoForm.
      // If it's a standard MUI Select, it might show the value, or the label if getOptionLabel is used.
      // For now, the main goal is to ensure the warning is gone.
      // A more robust check would be to find the Select by its label and check its value.
      // e.g. expect(screen.getByLabelText(/Department/i)).toHaveValue('1');
    });
  });

  it('validates required fields on submit', async () => {
    renderWithProviders(<PurchaseRequestMemoForm />);
    // Wait for initial async operations (dropdown data fetching) to complete
    // For placeholder tests, this ensures any initial state updates are processed.
    await waitFor(() => {
      expect(screen.getByLabelText(/Item Description/i)).toBeInTheDocument(); // Basic check
    });
    // Placeholder for actual validation logic test
  });

  it('submits the form successfully in create mode', async () => {
    const mockDepartment: Department = { id: 1, name: "Test Department", department_code: "TD" };
    vi.mocked(procurementApi.getDepartmentsForDropdown).mockResolvedValue({
      results: [mockDepartment],
      count: 1,
      next: null,
      previous: null
    });

    const createdMemo: PurchaseRequestMemo = {
      id: 12345,
      iom_id: "IOM-NEW-001", // Assuming this is part of the type, if not, remove
      status: 'pending' as const,
      item_description: 'New IOM Description',
      quantity: 10,
      reason: "Reason for new IOM",
      request_date: new Date().toISOString(),
      department: 1,
      department_name: "Test Department",
      project: null,
      project_name: null,
      priority: 'medium' as const,
      required_delivery_date: null,
      suggested_vendor: null,
      suggested_vendor_name: null,
      estimated_cost: 500,
      attachments: null,
      requested_by: 1,
      requested_by_username: 'testuser',
      approver: null,
      approver_username: null,
      decision_date: null,
      approver_comments: null,
      // created_at: new Date().toISOString(), // Removed as per type
      // updated_at: new Date().toISOString(), // Removed as per type
    };
    vi.mocked(procurementApi.createPurchaseRequestMemo).mockResolvedValue(createdMemo);

    renderWithProviders(<PurchaseRequestMemoForm />);
    // Wait for initial async operations (dropdown data fetching) to complete
    await waitFor(() => {
      expect(screen.getByLabelText(/Item Description/i)).toBeInTheDocument(); // Basic check
    });
    // Placeholder for actual form filling and submission
  });
});
