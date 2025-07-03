import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // Added within
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import * as ReactRouterDom from 'react-router-dom';
import { UIContextProvider as UIProvider } from '../../../../context/UIContext/UIContextProvider';
import PurchaseOrderForm from './PurchaseOrderForm';
import { AuthProvider } from '../../../../context/auth/AuthContext';
// Unused type imports removed: PurchaseOrder, OrderItem, Vendor

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
import { server } from '../../../../mocks/server'; // Import MSW server
import { assetHandlers } from '../../../../mocks/handlers/assetHandlers'; // Import specific handlers
import { procurementHandlers } from '../../../../mocks/handlers/procurementHandlers'; // Import specific handlers


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

// Mock helper functions are no longer needed as MSW provides the data.
// const createMockOrderItem = (item: Partial<OrderItem>): OrderItem => ({...});
// const createMockPurchaseOrder = (po: Partial<PurchaseOrder>): PurchaseOrder => ({...});


describe('PurchaseOrderForm', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks(); // Clears all mocks, including react-router-dom if needed, but useParams/useNavigate are re-mocked below
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({});
    vi.mocked(ReactRouterDom.useNavigate).mockReturnValue(mockNavigate); // Use the persistent mock

    // Explicitly use MSW handlers for this test suite
    server.use(...assetHandlers, ...procurementHandlers);

    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      token: 'mockToken',
      user: { id: 1, name: 'testuser', email: 'testuser@example.com', role: 'admin', is_staff: true, groups: [] },
      // Ensure this uses the global window.fetch that MSW can intercept
      authenticatedFetch: vi.fn(async (url, options?: RequestInit) => { // Added RequestInit type for options
        console.log(`[TEST MOCK authFetch] Calling URL: ${url} with options:`, options);
        const rawResponse = await window.fetch(url, options);
        if (!rawResponse.ok) {
          const errorBody = await rawResponse.text();
          console.error(`[TEST MOCK authFetch] API Error ${rawResponse.status}: ${errorBody} for URL: ${url}`);
          throw new Error(`API Error: ${rawResponse.status} Body: ${errorBody}`);
        }
        // Check if the response is empty before trying to parse JSON
        const textContent = await rawResponse.text();
        if (textContent) {
          try {
            return JSON.parse(textContent); // Parse the JSON before returning
          } catch (e) {
            console.error(`[TEST MOCK authFetch] Failed to parse JSON: ${textContent} for URL: ${url}`, e);
            throw new Error(`Failed to parse JSON response from ${url}`);
          }
        }
        return null; // Or undefined, or handle as appropriate for empty responses
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
    const user = userEvent.setup();

    // Wait for form to be generally ready (e.g., vendor dropdown populated)
    const vendorAutocomplete = screen.getByLabelText(/Vendor/i);
    fireEvent.mouseDown(vendorAutocomplete); // Open dropdown
    await screen.findByText('Test Vendor 1 (MSW)'); // Wait for an option
    fireEvent.keyDown(vendorAutocomplete, { key: 'Escape' }); // Close dropdown

    const formElement = await screen.findByRole('form', { name: /Create Purchase Order Form/i }); // Keep this to ensure form initially renders
    const submitButton = screen.getByRole('button', { name: /Create Purchase Order/i });

    // Clear Vendor (if possible, or ensure it's not selected)
    // For Autocomplete, clearing might involve finding the clear button if it exists,
    // or ensuring no selection is made. For this test, we'll assume vendor is not yet selected.
    // If vendor is pre-selected or required to clear, this part needs adjustment.
    // For now, we will rely on the default state of Autocomplete being null/empty for vendor.

    // Clear Order Date
    const orderDateInput = within(formElement).getAllByLabelText(/Date/i).find(input => input.getAttribute('name') === 'order_date');
    if (orderDateInput) {
        fireEvent.change(orderDateInput, { target: { value: '' } });
    }

    await user.click(submitButton);

    const expectedErrorMessage = /Vendor and Order Date are required./i;
    // Expect the error message to appear on the screen
    // (it will be in an Alert, potentially replacing the form if `error && !isSubmitting` causes an early return)
    await waitFor(() => {
      // Ensure the text is present (it is, in two places)
      const errorMessages = screen.getAllByText(expectedErrorMessage);
      expect(errorMessages.length).toBeGreaterThanOrEqual(1);

      // Now find the specific alert that is severity="error" and contains this text
      const errorAlert = errorMessages.find(el => {
        const alertRoot = el.closest('[role="alert"]');
        // MUI Alert with severity="error" usually has class 'MuiAlert-standardError'
        return alertRoot && alertRoot.classList.contains('MuiAlert-standardError');
      });
      expect(errorAlert).toBeInTheDocument(); // Check that we found our specific alert

    }, { timeout: 5000 });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('validates order items on submit', async () => {
    renderWithProviders(<PurchaseOrderForm />);
    const user = userEvent.setup();

    // Fill required header fields
    const vendorAutocomplete = screen.getByLabelText(/Vendor/i);
    fireEvent.mouseDown(vendorAutocomplete);
    await screen.findByText('Test Vendor 1 (MSW)');
    fireEvent.click(screen.getByText('Test Vendor 1 (MSW)'));

    const orderDateInput = screen.getAllByLabelText(/Date/i).find(input => input.getAttribute('name') === 'order_date');
    if (orderDateInput) {
      fireEvent.change(orderDateInput, { target: { value: '2024-08-01' } });
    }

    const formElement = await screen.findByRole('form', { name: /Create Purchase Order Form/i });
    const submitButton = screen.getByRole('button', { name: /Create Purchase Order/i });

    // Test Case 1: Empty item description
    let itemDescriptionInputs = within(formElement).getAllByRole('textbox').filter(input => input.getAttribute('name') === 'item_description');
    fireEvent.change(itemDescriptionInputs[0], { target: { value: '' } }); // Empty description

    let quantityInputs = within(formElement).getAllByRole('spinbutton').filter(input => input.getAttribute('name') === 'quantity');
    fireEvent.change(quantityInputs[0], { target: { value: '1' } });

    let unitPriceInputs = within(formElement).getAllByRole('spinbutton').filter(input => input.getAttribute('name') === 'unit_price');
    fireEvent.change(unitPriceInputs[0], { target: { value: '10' } });

    await user.click(submitButton);

    const expectedItemErrorMessage = /All order items must have a description, valid quantity, and valid unit price./i;
    await waitFor(() => {
      expect(screen.getByText(expectedItemErrorMessage)).toBeInTheDocument();
    });
    const alert1 = screen.getByText(expectedItemErrorMessage).closest('[role="alert"]');
    expect(alert1).toBeInTheDocument();
    expect(alert1).toHaveClass('MuiAlert-standardError');
    expect(mockNavigate).not.toHaveBeenCalled();


    // Test Case 2: Invalid quantity (e.g., 0)
    // Reset item description to valid, make quantity invalid
    itemDescriptionInputs = within(formElement).getAllByRole('textbox').filter(input => input.getAttribute('name') === 'item_description');
    fireEvent.change(itemDescriptionInputs[0], { target: { value: 'Valid Item' } });

    quantityInputs = within(formElement).getAllByRole('spinbutton').filter(input => input.getAttribute('name') === 'quantity');
    fireEvent.change(quantityInputs[0], { target: { value: '0' } }); // Invalid quantity

    await user.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText(expectedItemErrorMessage)).toBeInTheDocument();
    });
    const alert2 = screen.getByText(expectedItemErrorMessage).closest('[role="alert"]');
    expect(alert2).toBeInTheDocument();
    expect(alert2).toHaveClass('MuiAlert-standardError');
    expect(mockNavigate).not.toHaveBeenCalled(); // Corrected assertion


    // Test Case 3: Invalid unit price (e.g., -1)
    // Reset quantity to valid, make unit price invalid
    quantityInputs = within(formElement).getAllByRole('spinbutton').filter(input => input.getAttribute('name') === 'quantity');
    fireEvent.change(quantityInputs[0], { target: { value: '1' } });

    unitPriceInputs = within(formElement).getAllByRole('spinbutton').filter(input => input.getAttribute('name') === 'unit_price');
    fireEvent.change(unitPriceInputs[0], { target: { value: '-10' } }); // Invalid unit price

    await user.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText(expectedItemErrorMessage)).toBeInTheDocument();
    });
    const alert3 = screen.getByText(expectedItemErrorMessage).closest('[role="alert"]');
    expect(alert3).toBeInTheDocument();
    expect(alert3).toHaveClass('MuiAlert-standardError');
    expect(mockNavigate).not.toHaveBeenCalled(); // Corrected assertion
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
      // Expecting the vendor name from the MSW assetHandler
      expect(screen.getByText('Test Vendor 1 (MSW)')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Test Vendor 1 (MSW)'));

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
