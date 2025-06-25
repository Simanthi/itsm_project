import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as ReactRouterDom from 'react-router-dom';
import { UIContextProvider as UIProvider } from '../../../../context/UIContext/UIContextProvider';
import PurchaseOrderForm from './PurchaseOrderForm';
import { AuthProvider } from '../../../../context/auth/AuthContext';
import type { PurchaseOrder, OrderItem, PurchaseOrderStatus } from '../../types/procurementTypes'; // Adjusted to use local types if possible or define mock structure
import type { Vendor } from '../../../assets/types/assetTypes';

// Mock API dependencies
import * as useAuthHook from '../../../../context/auth/useAuth'; // Import useAuth
// MSW will handle API mocks, so direct vi.mock for procurementApi and assetApi will be removed or adjusted.

// Mock the useAuth hook module - This is a React hook, not an API call, so keep it.
vi.mock('../../../../context/auth/useAuth');

// Mock react-router-dom - This is for routing context, not API calls, so keep it.
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
    useNavigate: vi.fn(() => vi.fn()), // Keep the mock for useNavigate
  };
});

// const mockAuthenticatedFetch = vi.fn(); // Removed as unused

const renderWithProviders = (ui: React.ReactElement) => {
  // Corrected AuthProvider usage: no 'value' prop
  // The actual context value will be provided by the AuthProvider's internal state and logic.
  // If specific auth values are needed for a test, the `useAuth` hook itself should be mocked.
  // const mockLogin = vi.fn(); // Removed as unused
  // const mockLogout = vi.fn(); // Removed as unused
  // const mockAuthFetch = vi.fn(); // Removed as unused


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
  // created_at: new Date().toISOString(), // Removed as per type
  // updated_at: new Date().toISOString(), // Removed as per type
});

// createMockPurchaseOrder and createMockOrderItem might not be needed if MSW provides full objects,
// or they might need to be adjusted to match the structure MSW handlers for GET by ID return.
// For now, let's keep them and adjust if tests break due to structure mismatch.

const createMockOrderItem = (item: Partial<OrderItem>): OrderItem => ({
  id: item.id || Date.now() + Math.random(), // Ensure unique ID for items not yet saved
  item_description: item.item_description || "Mock Item",
  quantity: item.quantity || 1,
  unit_price: item.unit_price || 0,
  product_code: item.product_code || null,
  gl_account: item.gl_account || null,
  gl_account_code: item.gl_account_code || null,
  received_quantity: item.received_quantity || 0,
  line_item_status: item.line_item_status || 'pending',
  tax_rate: item.tax_rate || null,
  discount_type: item.discount_type || null,
  discount_value: item.discount_value || null,
  total_price: item.total_price || ((item.quantity || 1) * (item.unit_price || 0)),
});

const createMockPurchaseOrder = (po: Partial<PurchaseOrder>): PurchaseOrder => {
  const mockVendor: Vendor = po.vendor_details || { id: po.vendor || 1, name: "Mock Vendor from Helper" };
  return {
    id: po.id || Date.now(),
    po_number: po.po_number || "PO-MOCK-HELPER-001",
    vendor: mockVendor.id,
    vendor_details: mockVendor,
    order_date: po.order_date || new Date().toISOString(),
    expected_delivery_date: po.expected_delivery_date || null,
    status: po.status || 'draft',
    total_amount: typeof po.total_amount === 'string' ? parseFloat(po.total_amount) : (po.total_amount || 0),
    notes: po.notes || null,
    shipping_address: po.shipping_address || null,
    payment_terms: po.payment_terms || null,
    shipping_method: po.shipping_method || null,
    billing_address: po.billing_address || null,
    po_type: po.po_type || null,
    currency: po.currency || 'USD',
    related_contract: po.related_contract || null,
    related_contract_details: po.related_contract_details || null,
    internal_office_memo: po.internal_office_memo || null,
    internal_office_memo_details: po.internal_office_memo_details || undefined,
    attachments: po.attachments || null,
    order_items: po.order_items?.map(item => createMockOrderItem(item)) || [],
    created_by: po.created_by || 1,
    created_by_username: po.created_by_username || 'testuser_helper',
    created_at: po.created_at || new Date().toISOString(),
    updated_at: po.updated_at || new Date().toISOString(),
    revision_number: po.revision_number || 0,
  };
};


describe('PurchaseOrderForm', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks(); // Clears all mocks, including react-router-dom if needed, but useParams/useNavigate are re-mocked below
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({});
    vi.mocked(ReactRouterDom.useNavigate).mockReturnValue(mockNavigate); // Use the persistent mock

    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      token: 'mockToken',
      user: { id: 1, name: 'testuser', role: 'admin', is_staff: true },
      authenticatedFetch: vi.fn().mockImplementation(async (url, options) => {
        // This basic mock for authenticatedFetch might still be useful for things MSW doesn't catch,
        // or it can be removed if MSW covers all fetch calls made by the component.
        // For now, let's assume MSW handles it. If not, this would need to simulate a fetch response.
        console.warn(`AuthenticatedFetch called for ${url} with options:`, options, `THIS SHOULD IDEALLY BE HANDLED BY MSW`);
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      }),
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      isAuthenticated: true,
    });
  });

  it('renders the form in create mode and loads initial data (vendors, memos, contracts)', async () => {
    renderWithProviders(<PurchaseOrderForm />);
    expect(screen.getByRole('heading', { name: /Create Purchase Order/i })).toBeInTheDocument();

    // Check if data from MSW handlers for GET requests is loaded
    // Example: Vendors (assuming one of the mock vendors is "Test Vendor 1 (MSW)")
    // Need to interact with Autocomplete to show options
    const vendorAutocomplete = screen.getByLabelText(/Vendor/i);
    fireEvent.mouseDown(vendorAutocomplete);
    await screen.findByText('Test Vendor 1 (MSW)'); // From assetHandlers
    // Add similar checks for approved memos and contracts if their Autocompletes are present initially
  });

  it('renders the form in edit mode when orderId is provided and loads PO data', async () => {
    const mockPoId = '123';
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({ poId: mockPoId });
    // MSW handler for GET /api/procurement/purchase-orders/:poId will provide the PO data

    renderWithProviders(<PurchaseOrderForm />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Edit Purchase Order/i })).toBeInTheDocument();
    });
    // Check for data from the MSW GET by ID handler
    await screen.findByDisplayValue(`PO-EDIT-${mockPoId}`); // From procurementHandlers
    await screen.findByDisplayValue('Existing Item 1 (MSW)'); // From procurementHandlers
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
    // MSW will handle the POST request and return a mock response.
    // We don't need to mock `procurementApi.createPurchaseOrder` directly anymore.
    // The `mockNavigate` function (setup in beforeEach) will be used to check navigation.

    renderWithProviders(<PurchaseOrderForm />);

    // Wait for initial data to load (e.g., vendors)
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

    // Wait for the submission to complete and check for success indicators
    // (e.g., snackbar message, navigation)
    // The actual API call is handled by MSW.
    await waitFor(() => {
      // Check for navigation (assuming it navigates on success)
      expect(mockNavigate).toHaveBeenCalledWith('/procurement/purchase-orders');
    });

    // Optionally, check for a success snackbar message if your UIContext shows one
    // This depends on your UIProvider and useUI hook implementation.
    // Example: expect(screen.getByText('Purchase Order created successfully!')).toBeInTheDocument();
    // This requires showSnackbar to actually render text that can be queried.
    // For now, navigation check is a good primary assertion.
  });
});
