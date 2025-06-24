import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as ReactRouterDom from 'react-router-dom';
import { UIContextProvider as UIProvider } from '../../../../context/UIContext/UIContextProvider';
import PurchaseOrderForm from './PurchaseOrderForm';
import { AuthProvider } from '../../../../context/auth/AuthContext';

// Mock dependencies
import * as procurementApi from '../../../../api/procurementApi';
// import * as assetApi from '../../../../api/assetApi'; // Unused import

vi.mock('../../../../api/procurementApi', () => ({
  getPurchaseRequestMemoById: vi.fn(),
  getPurchaseOrderById: vi.fn(), // This will be correctly typed by vi.mocked(procurementApi.getPurchaseOrderById) later
  createPurchaseOrder: vi.fn(), // This will be correctly typed by vi.mocked(procurementApi.createPurchaseOrder) later
  updatePurchaseOrder: vi.fn(),
  getDepartments: vi.fn(() => Promise.resolve([])),
  getProjects: vi.fn(() => Promise.resolve([])),
  getExpenseCategories: vi.fn(() => Promise.resolve([])),
  // getVendors: vi.fn is removed as it's handled by assetApi mock
  getGLAccounts: vi.fn(() => Promise.resolve([])),
  getPurchaseRequestMemos: vi.fn(() => Promise.resolve({ results: [], count: 0 })),
}));

vi.mock('../../../../api/assetApi', () => ({
  getVendors: vi.fn(() => Promise.resolve({ results: [{id: 1, name: "Test Vendor 1", contact_person: "Tess Ting", email: "test@vendor.com", phone: "1234567890"}], count: 1 })),
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

describe('PurchaseOrderForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({});
  });

  it('renders the form in create mode', async () => {
    renderWithProviders(<PurchaseOrderForm />);
    expect(screen.getByRole('heading', { name: /Create Purchase Order/i })).toBeInTheDocument();
    // Add more assertions for create mode
  });

  it('renders the form in edit mode when orderId is provided', async () => {
    const mockPoId = '123';
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({ poId: mockPoId }); // Use poId to match component

    vi.mocked(procurementApi.getPurchaseOrderById).mockResolvedValue({
      id: parseInt(mockPoId), // Ensure ID is a number if API sends it as such
      po_number: 'PO-EDIT-001',
      vendor: 1, // Assuming vendor is an ID. If it's an object, adjust accordingly.
      internal_office_memo: null,
      order_date: '2024-07-01T00:00:00Z', // Full ISO string, component will split
      expected_delivery_date: '2024-07-15T00:00:00Z',
      status: 'draft', // To ensure "Edit Purchase Order" title
      shipping_address: '123 Edit St',
      notes: 'Editing this PO',
      payment_terms: 'Net 30',
      shipping_method: 'Courier',
      billing_address: '456 Bill St',
      po_type: 'goods',
      related_contract: null,
      currency: 'USD',
      attachments: null, // Or a mock URL string if testing display
      revision_number: 1,
      created_by_username: 'editorUser',
      created_at: '2024-07-01T10:00:00Z',
      order_items: [
        {
          id: 1,
          item_description: 'Existing Item 1',
          quantity: 2,
          unit_price: 50,
          product_code: 'E001',
          gl_account: 101, // Mock GL account ID
          received_quantity: 0,
          line_item_status: 'pending',
          tax_rate: 5,
          discount_type: 'fixed',
          discount_value: 0,
          total_price: 100, // Assuming (2 * 50) - 0 + (5% of 100) if tax is on item total before discount
        }
      ],
      // Add any other fields the component might expect from the API response
    });

    renderWithProviders(<PurchaseOrderForm />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Edit Purchase Order/i })).toBeInTheDocument();
    });
    // Add more assertions for edit mode: fields populated, etc.
  });

  it('allows adding and removing order items', async () => {
    renderWithProviders(<PurchaseOrderForm />);

    // Initial item
    let itemDescriptionInputs = screen.getAllByRole('textbox').filter(input => input.getAttribute('name') === 'item_description');
    expect(itemDescriptionInputs).toHaveLength(1);

    // Add item
    fireEvent.click(screen.getByRole('button', { name: /Add Item/i }));
    await waitFor(() => {
      itemDescriptionInputs = screen.getAllByRole('textbox').filter(input => input.getAttribute('name') === 'item_description');
      expect(itemDescriptionInputs).toHaveLength(2);
    });

    // Remove the second item (assuming remove button is specific or we target the last one)
    // This needs a way to target the correct remove button.
    // The IconButton has a DeleteOutlineIcon. MUI usually adds data-testid for icons.
    // Let's assume data-testid="DeleteOutlineIcon" for the icon.
    // There will be two such icons after adding an item. We want to click the one associated with the second item.
    await waitFor(async () => {
      const deleteIcons = await screen.findAllByTestId('DeleteOutlineIcon');
      expect(deleteIcons.length).toBe(2); // One for each item row (initial + added)

      // Find the parent button of the second icon to click it
      const secondRemoveButton = deleteIcons[1].closest('button');
      expect(secondRemoveButton).toBeInTheDocument();
      if (secondRemoveButton) {
        fireEvent.click(secondRemoveButton);
      }
    });

    // After removing the second item, only one should remain
    await waitFor(() => {
      itemDescriptionInputs = screen.getAllByRole('textbox').filter(input => input.getAttribute('name') === 'item_description');
      expect(itemDescriptionInputs).toHaveLength(1);
    });


    // To make sure the first item is still there (if only one was removed)
    itemDescriptionInputs = screen.getAllByRole('textbox').filter(input => input.getAttribute('name') === 'item_description');
    expect(itemDescriptionInputs).toHaveLength(1);
  });

  it('validates required fields on submit', async () => {
    renderWithProviders(<PurchaseOrderForm />);
    fireEvent.click(screen.getByRole('button', { name: /Create Purchase Order/i })); // Corrected button name

    // Example validation, adapt based on actual form fields
    await waitFor(() => {
      // This depends on how your form displays errors
      // For example, if using Material UI TextField with helperText for errors:
      // expect(screen.getByText(/Vendor is required/i)).toBeInTheDocument();
      // expect(screen.getByText(/Date is required/i)).toBeInTheDocument();
    });
    // Add more validation checks
  });

  it('submits the form successfully in create mode', async () => {
    const mockCreatePurchaseOrder = vi.mocked(procurementApi.createPurchaseOrder).mockResolvedValue({ // Corrected mock usage
      id: 12345, // Changed to number
      // ... other fields that PurchaseOrder type might expect upon creation
      po_number: "PO-NEW-001", // Example
      status: "pending_approval", // Example
      order_date: "2024-07-27",
      vendor: 1,
      order_items: [], // Simplified for this mock, adjust if component needs more
    });

    renderWithProviders(<PurchaseOrderForm />);

    // Fill form fields
    // Simulate selecting a vendor from Autocomplete
    const vendorAutocomplete = screen.getByLabelText(/Vendor/i);
    fireEvent.mouseDown(vendorAutocomplete); // Open dropdown
    // Wait for options to be available (due to mocked async getVendors)
    await waitFor(() => {
      expect(screen.getByText('Test Vendor 1')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Test Vendor 1'));

    // Assuming the first date input found by /Date/i is the "Order Date"
    // A better way would be a more specific label like "Order Date" or using name attribute
    const orderDateInput = screen.getAllByLabelText(/Date/i).find(input => input.getAttribute('name') === 'order_date');
    if (orderDateInput) {
      fireEvent.change(orderDateInput, { target: { value: '2024-07-27' } });
    } else {
      throw new Error("Order Date input not found");
    }
    // ... fill other required fields ...

    // Fill the initial item's details
    await waitFor(() => {
      // The form starts with one item row from initialOrderItemData
      const itemDescriptions = screen.getAllByRole('textbox').filter(input => input.getAttribute('name') === 'item_description');
      expect(itemDescriptions).toHaveLength(1);
      fireEvent.change(itemDescriptions[0], { target: { value: 'Test Item Submitted' } });

      const quantities = screen.getAllByRole('spinbutton').filter(input => input.getAttribute('name') === 'quantity');
      expect(quantities).toHaveLength(1);
      // initialOrderItemData already has quantity: 1, so no change needed unless testing different
      // fireEvent.change(quantities[0], { target: { value: '1' } });

      const unitPrices = screen.getAllByRole('spinbutton').filter(input => input.getAttribute('name') === 'unit_price');
      expect(unitPrices).toHaveLength(1);
      fireEvent.change(unitPrices[0], { target: { value: '150' } }); // Set a non-zero unit price
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Purchase Order/i }));

    await waitFor(() => {
      expect(mockCreatePurchaseOrder).toHaveBeenCalled();
      // Add assertions for the payload if necessary
      // expect(mockCreatePurchaseOrder).toHaveBeenCalledWith(expect.objectContaining({
      //   vendor_id: 1,
      //   // ...
      // }));
    });
    // Optionally check for navigation or snackbar message
  });

  // Add more tests:
  // - Submitting in edit mode
  // - Handling API errors (e.g., getPurchaseOrderById fails, create/update fails)
  // - Specific field validations (e.g., quantity > 0)
  // - Calculations (e.g., total amount for items)
  // - Linking to IOM (if applicable and testable here)
});
