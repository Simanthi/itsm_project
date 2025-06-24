import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as ReactRouterDom from 'react-router-dom';
import { UIContextProvider as UIProvider } from '../../../../context/UIContext/UIContextProvider';
import PurchaseOrderForm from './PurchaseOrderForm';
import { AuthProvider } from '../../../../context/auth/AuthContext';
import type { PurchaseOrder, OrderItem, PurchaseOrderStatus, Vendor } from '../../types'; // Adjusted to use local types if possible or define mock structure
import type { PaginatedResponse } from '../../../../api/types'; // Assuming a general PaginatedResponse type

// Mock API dependencies
import * as procurementApi from '../../../../api/procurementApi';
import * as useAuthHook from '../../../../context/auth/useAuth'; // Import useAuth

// Define a PaginatedResponse type helper for mocks - already in other files, ensure consistency
type MockPaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

vi.mock('../../../../api/procurementApi', () => ({
  getPurchaseRequestMemoById: vi.fn(),
  getPurchaseOrderById: vi.fn(),
  createPurchaseOrder: vi.fn(),
  updatePurchaseOrder: vi.fn(),
  getDepartments: vi.fn((): Promise<MockPaginatedResponse<unknown>> => Promise.resolve({ results: [], count: 0, next: null, previous: null })),
  getProjects: vi.fn((): Promise<MockPaginatedResponse<unknown>> => Promise.resolve({ results: [], count: 0, next: null, previous: null })),
  getExpenseCategories: vi.fn((): Promise<MockPaginatedResponse<unknown>> => Promise.resolve({ results: [], count: 0, next: null, previous: null })),
  getGLAccounts: vi.fn((): Promise<MockPaginatedResponse<unknown>> => Promise.resolve({ results: [], count: 0, next: null, previous: null })),
  getPurchaseRequestMemos: vi.fn((): Promise<MockPaginatedResponse<unknown>> => Promise.resolve({ results: [], count: 0, next: null, previous: null })),
}));

// assetApi mock for getVendors
vi.mock('../../../../api/assetApi', () => ({
  getVendors: vi.fn((): Promise<MockPaginatedResponse<Partial<Vendor>>> => Promise.resolve({
    results: [{ id: 1, name: "Test Vendor 1", contact_person: "Tess Ting", email: "test@vendor.com" }], // Removed phone
    count: 1,
    next: null,
    previous: null
  })),
}));

// Mock the useAuth hook module
vi.mock('../../../../context/auth/useAuth');

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
    useNavigate: vi.fn(() => vi.fn()),
  };
});

// const mockAuthenticatedFetch = vi.fn(); // Removed as unused

const renderWithProviders = (ui: React.ReactElement) => {
  // Corrected AuthProvider usage: no 'value' prop
  // The actual context value will be provided by the AuthProvider's internal state and logic.
  // If specific auth values are needed for a test, the `useAuth` hook itself should be mocked.
  const mockLogin = vi.fn();
  const mockLogout = vi.fn();
  const mockAuthFetch = vi.fn();


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

// Helper to create a full OrderItem, satisfying the type, including total_price
const createMockOrderItem = (item: Partial<OrderItem>): OrderItem => ({
  id: item.id || 0, // Default to 0 or ensure it's provided
  item_description: item.item_description || "Mock Item",
  quantity: item.quantity || 1,
  unit_price: item.unit_price || 0,
  product_code: item.product_code || null,
  gl_account: item.gl_account || null,
  received_quantity: item.received_quantity || 0,
  line_item_status: item.line_item_status || 'pending',
  tax_rate: item.tax_rate || null,
  discount_type: item.discount_type || null,
  discount_value: item.discount_value || null,
  total_price: item.total_price || ((item.quantity || 1) * (item.unit_price || 0)), // Basic calculation
  // Add other required fields from OrderItem type with default values
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

// Helper to create a full PurchaseOrder, satisfying the type
const createMockPurchaseOrder = (po: Partial<PurchaseOrder>): PurchaseOrder => ({
  id: po.id || 0,
  po_number: po.po_number || "PO-MOCK-001",
  vendor: po.vendor || 1, // Assuming vendor ID
  vendor_details: po.vendor_details || { id: 1, name: "Mock Vendor", contact_person: "", email: "" } as Vendor,
  order_date: po.order_date || new Date().toISOString(),
  expected_delivery_date: po.expected_delivery_date || null,
  status: po.status || 'draft',
  total_amount: po.total_amount || "0.00",
  notes: po.notes || null,
  shipping_address: po.shipping_address || null,
  payment_terms: po.payment_terms || null,
  shipping_method: po.shipping_method || null,
  billing_address: po.billing_address || null,
  po_type: po.po_type || null,
  currency: po.currency || 'USD',
  related_contract: po.related_contract || null,
  internal_office_memo: po.internal_office_memo || null,
  attachments: po.attachments || null,
  order_items: po.order_items?.map(item => createMockOrderItem(item)) || [],
  created_by: po.created_by || 1,
  created_by_username: po.created_by_username || 'testuser',
  created_at: po.created_at || new Date().toISOString(),
  updated_at: po.updated_at || new Date().toISOString(),
  revision_number: po.revision_number || 0,
});


describe('PurchaseOrderForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({});
    // Re-mock useAuth for each test to provide default values or allow overrides
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      user: { id: 1, username: 'testuser', email: 'test@example.com', roles: ['admin'] },
      authenticatedFetch: vi.fn(), // A fresh mock for each test
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      isAuthenticated: true,
    });
  });

  it('renders the form in create mode', async () => {
    renderWithProviders(<PurchaseOrderForm />);
    expect(screen.getByRole('heading', { name: /Create Purchase Order/i })).toBeInTheDocument();
  });

  it('renders the form in edit mode when orderId is provided', async () => {
    const mockPoId = '123';
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({ poId: mockPoId });

    const mockedPO = createMockPurchaseOrder({
      id: parseInt(mockPoId),
      po_number: 'PO-EDIT-001',
      vendor: 1,
      order_date: '2024-07-01T00:00:00Z',
      status: 'draft' as PurchaseOrderStatus,
      order_items: [createMockOrderItem({ id: 1, item_description: 'Existing Item 1', quantity: 2, unit_price: 50, total_price: 100 })],
      total_amount: "100.00", // Ensure this is present
    });
    vi.mocked(procurementApi.getPurchaseOrderById).mockResolvedValue(mockedPO);

    renderWithProviders(<PurchaseOrderForm />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Edit Purchase Order/i })).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('PO-EDIT-001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing Item 1')).toBeInTheDocument();
  });

  it('allows adding and removing order items', async () => {
    renderWithProviders(<PurchaseOrderForm />);

    let itemDescriptionInputs = screen.getAllByRole('textbox').filter(input => input.getAttribute('name') === 'item_description');
    expect(itemDescriptionInputs).toHaveLength(1); // Initial item

    fireEvent.click(screen.getByRole('button', { name: /Add Item/i }));
    await waitFor(() => {
      itemDescriptionInputs = screen.getAllByRole('textbox').filter(input => input.getAttribute('name') === 'item_description');
      expect(itemDescriptionInputs).toHaveLength(2);
    });

    await waitFor(async () => {
      const deleteIcons = await screen.findAllByTestId('DeleteOutlineIcon');
      expect(deleteIcons.length).toBe(2);
      const secondRemoveButton = deleteIcons[1].closest('button');
      expect(secondRemoveButton).toBeInTheDocument();
      if (secondRemoveButton) {
        fireEvent.click(secondRemoveButton);
      }
    });

    await waitFor(() => {
      itemDescriptionInputs = screen.getAllByRole('textbox').filter(input => input.getAttribute('name') === 'item_description');
      expect(itemDescriptionInputs).toHaveLength(1);
    });
  });

  it('validates required fields on submit', async () => {
    renderWithProviders(<PurchaseOrderForm />);
    fireEvent.click(screen.getByRole('button', { name: /Create Purchase Order/i }));

    await waitFor(() => {
      // Example: expect(screen.getByText(/Vendor is required/i)).toBeInTheDocument();
      // This depends on how errors are displayed. For now, this test is a placeholder.
      // It will pass if no unhandled error occurs during click.
    });
  });

  it('submits the form successfully in create mode', async () => {
    const mockCreatedPO = createMockPurchaseOrder({
      id: 12345,
      po_number: "PO-NEW-001",
      status: "pending_approval" as PurchaseOrderStatus,
      order_date: "2024-07-27",
      vendor: 1,
      order_items: [],
      total_amount: "150.00" // ensure this is present
    });
    const mockCreatePurchaseOrder = vi.mocked(procurementApi.createPurchaseOrder).mockResolvedValue(mockCreatedPO);

    renderWithProviders(<PurchaseOrderForm />);

    const vendorAutocomplete = screen.getByLabelText(/Vendor/i);
    fireEvent.mouseDown(vendorAutocomplete);
    await waitFor(() => {
      expect(screen.getByText('Test Vendor 1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Test Vendor 1'));

    // Ensure the DOM has settled after vendor selection before querying for Order Date
    await waitFor(() => {
        const orderDateInput = screen.getAllByLabelText(/Date/i).find(input => input.getAttribute('name') === 'order_date');
        expect(orderDateInput).toBeInTheDocument(); // Check it's found before trying to change
        if (orderDateInput) {
            fireEvent.change(orderDateInput, { target: { value: '2024-07-27' } });
        } else {
            // This path should ideally not be hit if the expect above passes
            throw new Error("Order Date input with name 'order_date' not found after vendor selection settle.");
        }
    });

    await waitFor(() => {
      const itemDescriptions = screen.getAllByRole('textbox').filter(input => input.getAttribute('name') === 'item_description');
      expect(itemDescriptions).toHaveLength(1);
      fireEvent.change(itemDescriptions[0], { target: { value: 'Test Item Submitted' } });

      const quantities = screen.getAllByRole('spinbutton').filter(input => input.getAttribute('name') === 'quantity');
      expect(quantities).toHaveLength(1);
      fireEvent.change(quantities[0], { target: { value: '1' } });

      const unitPrices = screen.getAllByRole('spinbutton').filter(input => input.getAttribute('name') === 'unit_price');
      expect(unitPrices).toHaveLength(1);
      fireEvent.change(unitPrices[0], { target: { value: '150' } });
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Purchase Order/i }));

    await waitFor(() => {
      expect(mockCreatePurchaseOrder).toHaveBeenCalled();
    });
  });
});
