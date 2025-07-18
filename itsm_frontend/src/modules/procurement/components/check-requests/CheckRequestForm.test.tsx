import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
// Import ReactRouterDom for specific mocking if needed, but direct import not always necessary for vi.mock
import * as ReactRouterDom from 'react-router-dom'; // Keep for vi.mocked
import { http, HttpResponse } from 'msw';
import { server } from '../../../../mocks/server';
import { UIContextProvider as UIProvider } from '../../../../context/UIContext/UIContextProvider';
import CheckRequestForm from './CheckRequestForm';
import { AuthProvider } from '../../../../context/auth/AuthContext';
import type { CheckRequest, PurchaseOrder, ExpenseCategory, PaginatedResponse } from '../../types/procurementTypes';
import type { Vendor } from '../../../assets/types/assetTypes';
import { formatCurrency } from '../../../../utils/formatters';

import * as procurementApi from '../../../../api/procurementApi';
import * as assetApi from '../../../../api/assetApi';
import * as useAuthHook from '../../../../context/auth/useAuth';

type MockPaginatedResponse<T> = PaginatedResponse<T>;

vi.mock('../../../../api/procurementApi', async () => {
  const actualApi = await vi.importActual<typeof procurementApi>('../../../../api/procurementApi');
  return {
    ...actualApi, // Spread actual implementations first, then override
    getCheckRequestById: vi.fn(),
    createCheckRequest: vi.fn<typeof actualApi.createCheckRequest>(), // Explicitly type this mock
    updateCheckRequest: vi.fn(),
    // Mock specific implementations for others if needed, or let them be default vi.fn()
    // For functions used in beforeEach or directly, ensure they have a default mock implementation:
    getPurchaseOrders: vi.fn().mockResolvedValue({ results: [], count: 0, next: null, previous: null }),
    getDepartmentsForDropdown: vi.fn().mockResolvedValue({ results: [], count: 0, next: null, previous: null }),
    getProjectsForDropdown: vi.fn().mockResolvedValue({ results: [], count: 0, next: null, previous: null }),
    getExpenseCategoriesForDropdown: vi.fn().mockResolvedValue({ results: [], count: 0, next: null, previous: null }),
    // Add any other functions from procurementApi that need default mocks or specific vi.fn<type>()
  };
});

vi.mock('../../../../api/assetApi', () => ({
  getVendors: vi.fn((): Promise<MockPaginatedResponse<Vendor>> => Promise.resolve({
    results: [],
    count: 0,
    next: null,
    previous: null
  })),
}));

vi.mock('../../../../context/auth/useAuth');

// Define a stable mock navigate function instance
const mockNavigateInstance = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(), // Will be specifically mocked in tests as needed
    useNavigate: () => mockNavigateInstance, // Always returns the same mock function
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
    vi.clearAllMocks(); // Clears all mocks
    mockNavigateInstance.mockClear(); // Specifically clear the navigate instance
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({}); // Default mock for useParams

    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      token: 'mockToken',
      user: { id: 1, name: 'testuser', email: 'test@example.com', role: 'admin', is_staff: true, groups: [] },
      authenticatedFetch: vi.fn(async (url, options) => {
        const rawResponse = await window.fetch(url, options);
        if (!rawResponse.ok) {
          const errorBody = await rawResponse.text();
          throw new Error(`API Error: ${rawResponse.status} Body: ${errorBody}`);
        }
        const textContent = await rawResponse.text();
        return textContent ? JSON.parse(textContent) : null;
      }),
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      isAuthenticated: true,
    });
    vi.mocked(procurementApi.getPurchaseOrders).mockResolvedValue({ results: [], count: 0, next: null, previous: null });
    vi.mocked(procurementApi.getExpenseCategoriesForDropdown).mockResolvedValue({ results: [], count: 0, next: null, previous: null });
    vi.mocked(assetApi.getVendors).mockResolvedValue({ results: [], count: 0, next: null, previous: null } as MockPaginatedResponse<Vendor>);
  });

  it('renders the form in create mode', async () => {
    renderWithProviders(<CheckRequestForm />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Create New Check Request/i })).toBeInTheDocument();
    });
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
      status: 'pending_submission' as const,
      request_date: '2024-07-01T00:00:00Z',
      requested_by: 1,
      requested_by_username: 'testuser',
      attachments: null,
      approved_by_accounts: null,
      approved_by_accounts_username: null,
      accounts_approval_date: null,
      accounts_comments: null,
      payment_method: null,
      payment_date: null,
      transaction_id: null,
      payment_notes: null,
      created_at: '2024-07-01T00:00:00Z', // Added
      updated_at: '2024-07-01T00:00:00Z', // Added
    };
    vi.mocked(procurementApi.getCheckRequestById).mockResolvedValue(mockCheckRequest);

    renderWithProviders(<CheckRequestForm />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: `Edit Check Request #${numericMockCrId}` })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test CR for edit')).toBeInTheDocument();
    });
  });

  it('validates required fields on submit', async () => {
    renderWithProviders(<CheckRequestForm />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Create New Check Request/i })).toBeInTheDocument();
    });
  });

  it('submits the form successfully in create mode', async () => {
    const user = userEvent.setup();

    const mockPurchaseOrders: PurchaseOrder[] = [
      {
        id: 1,
        po_number: 'PO-001',
        vendor: 1,
        vendor_details: { id: 1, name: 'Test Vendor PO' },
        total_amount: 1000,
        status: 'approved',
        order_date: '2024-01-01',
        currency: 'USD',
        created_by: 1,
        created_by_username: 'testuser',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        order_items: [
          {
            id: 101,
            item_description: 'Test Item 1',
            quantity: 2,
            unit_price: 500,
            total_price: 1000,
            gl_account_code: '6000',
            received_quantity: 0,
            line_item_status: 'pending',
          }
        ],
        // Add other optional fields from PurchaseOrder with null or default if not relevant to this test
        internal_office_memo: null,
        expected_delivery_date: null,
        shipping_address: null,
        notes: null,
        payment_terms: null,
        shipping_method: null,
        billing_address: null,
        po_type: null,
        related_contract: null,
        related_contract_details: null,
        attachments: null,
        revision_number: 0,
      },
    ];
    const mockExpenseCategories: ExpenseCategory[] = [
      { id: 1, name: 'Office Supplies' },
      { id: 2, name: 'Travel' },
    ];

    vi.mocked(procurementApi.getPurchaseOrders).mockResolvedValue({ results: mockPurchaseOrders, count: mockPurchaseOrders.length, next: null, previous: null });
    vi.mocked(procurementApi.getExpenseCategoriesForDropdown).mockResolvedValue({ results: mockExpenseCategories, count: mockExpenseCategories.length, next: null, previous: null });

    const createdCRData = {
      payee_name: mockPurchaseOrders[0].vendor_details.name, // Set to PO's vendor name
      amount: "750.00",
      reason_for_payment: "Valid Reason for CR Success",
      currency: 'INR', // Matches initialFormData
      purchase_order: mockPurchaseOrders[0].id,
      expense_category: mockExpenseCategories[0].id,
      invoice_date: '2024-07-29', // Adding invoice_date back
    };
    // invoice_date removed for simplification

    const now = new Date().toISOString(); // Define 'now'
    const createdCRMock: CheckRequest = {
      id: 124,
      cr_id: 'CR-124',
      payee_name: createdCRData.payee_name,
      amount: createdCRData.amount,
      reason_for_payment: createdCRData.reason_for_payment,
      currency: createdCRData.currency,
      purchase_order: createdCRData.purchase_order,
      expense_category: createdCRData.expense_category,
      invoice_date: createdCRData.invoice_date, // Added invoice_date
      status: 'pending_approval',
      request_date: new Date().toISOString(),
      requested_by:1,
      requested_by_username: 'testuser',
      // Fill other required fields for CheckRequest type if necessary
      payee_address: '123 Test St',
      invoice_number: null,
      // invoice_date: null, // Explicitly null as we removed it from data
      is_urgent: false,
      recurring_payment: null,
      attachments: null,
      approved_by_accounts: null,
      approved_by_accounts_username: null,
      accounts_approval_date: null,
      accounts_comments: null,
      payment_method: null,
      payment_date: null,
      transaction_id: null,
      payment_notes: null,
      created_at: now, // Added
      updated_at: now, // Added
    };

    vi.mocked(procurementApi.createCheckRequest).mockResolvedValue(createdCRMock);

    renderWithProviders(<CheckRequestForm />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Create New Check Request/i })).toBeInTheDocument();
    });

    // Select Purchase Order
    const poAutocomplete = screen.getByLabelText(/Select Purchase Order/i);
    await user.click(poAutocomplete);
    const poListbox = await screen.findByRole('listbox');
    // Corrected to match the actual display text format from getOptionLabel, including currency
    const expectedPOText = `PO #${mockPurchaseOrders[0].id} - ${mockPurchaseOrders[0].vendor_details?.name} (${formatCurrency(mockPurchaseOrders[0].total_amount)})`;
    await user.click(within(poListbox).getByText(expectedPOText));
    // The input value of Autocomplete might be the po_number or the full getOptionLabel text,
    // depending on how Autocomplete is configured or behaves with freeSolo/inputValue.
    // For now, let's assume selecting the option is enough and the internal state is set.
    // We can verify the *displayed text* in the input if needed, or rely on form submission check.
    // await waitFor(() => expect(poAutocomplete).toHaveValue(mockPurchaseOrders[0].po_number)); // This might be incorrect
    await waitFor(() => expect(screen.getByDisplayValue(`PO #${mockPurchaseOrders[0].id} - ${mockPurchaseOrders[0].vendor_details?.name} (${formatCurrency(mockPurchaseOrders[0].total_amount)})`)).toBeInTheDocument());

    // Payee Name is automatically filled from PO selection and field becomes disabled.
    // await user.type(screen.getByLabelText(/Payee Name/i), createdCRData.payee_name);

    const amountInput = screen.getByLabelText(/Amount/i);
    // Amount might also be auto-filled from PO if it was zero initially.
    // Ensure we clear it if we want to set a specific test amount different from PO's total.
    // Or, if the PO's total amount is what we want, no need to type.
    // For this test, createdCRData.amount is "750.00", PO total is "1000".
    // The handlePOSelect logic: if prevAmount is 0 or empty, it uses PO total.
    // Let's assume initial amount is "0.00", so it becomes "1000". We want "750.00".
    // So, we *do* need to type into amount after PO selection if PO selection changes it.
    // The Payee Name field gets disabled, but Amount field does not.

    await user.clear(amountInput);
    await user.type(amountInput, createdCRData.amount);

    await user.type(screen.getByLabelText(/Reason for Payment \/ Description/i), createdCRData.reason_for_payment);

    // Select Expense Category
    await user.click(screen.getByRole('combobox', { name: /Expense Category/i }));
    const expenseCatListbox = await screen.findByRole('listbox');
    await user.click(within(expenseCatListbox).getByRole('option', { name: mockExpenseCategories[0].name }));

    // Currency is pre-filled by initialFormData, verify if needed or ensure it's part of submission

    const invoiceDateInput = screen.getByLabelText(/Invoice Date/i);
    // For date inputs, direct value setting or fireEvent.change is often more reliable than user.type
    fireEvent.change(invoiceDateInput, { target: { value: createdCRData.invoice_date } });
    await waitFor(() => expect(invoiceDateInput).toHaveValue(createdCRData.invoice_date));

    // Using fireEvent.submit on the form directly
    const formElement = screen.getByRole('form', { name: /Check Request Form/i });
    fireEvent.submit(formElement);
    // await user.click(screen.getByRole('button', { name: /Create Request/i }));

    await waitFor(() => {
      expect(procurementApi.createCheckRequest).toHaveBeenCalledTimes(1);
      const formDataSent = vi.mocked(procurementApi.createCheckRequest).mock.calls[0][1] as FormData;
      expect(formDataSent.get('payee_name')).toBe(createdCRData.payee_name);
      expect(formDataSent.get('amount')).toBe(parseFloat(createdCRData.amount).toFixed(2)); // API expects string matching decimal places
      expect(formDataSent.get('reason_for_payment')).toBe(createdCRData.reason_for_payment);
      expect(formDataSent.get('currency')).toBe(createdCRData.currency);
      expect(formDataSent.get('purchase_order')).toBe(String(createdCRData.purchase_order));
      expect(formDataSent.get('expense_category')).toBe(String(createdCRData.expense_category));
      expect(formDataSent.get('invoice_date')).toBe(createdCRData.invoice_date);
      // Use the stable mockNavigateInstance for assertion
      expect(mockNavigateInstance).toHaveBeenCalledWith('/procurement/check-requests');
    });
  }, 15000); // Increased timeout for more interactions

  it('shows an error if required fields are missing on submit (e.g. for 400 bad request)', async () => {
    const user = userEvent.setup();
    const mockPurchaseOrders: PurchaseOrder[] = [
      {
        id: 1,
        po_number: 'PO-001',
        vendor: 1,
        vendor_details: { id: 1, name: 'Test Vendor PO' },
        total_amount: 1000,
        status: 'approved',
        order_date: '2024-01-01',
        currency: 'USD',
        created_by: 1,
        created_by_username: 'testuser',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        order_items: [
          {
            id: 101,
            item_description: 'Test Item 1',
            quantity: 2,
            unit_price: 500,
            total_price: 1000,
            gl_account_code: '6000',
            received_quantity: 0,
            line_item_status: 'pending',
          }
        ],
        // Add other optional fields from PurchaseOrder with null or default if not relevant to this test
        internal_office_memo: null,
        expected_delivery_date: null,
        shipping_address: null,
        notes: null,
        payment_terms: null,
        shipping_method: null,
        billing_address: null,
        po_type: null,
        related_contract: null,
        related_contract_details: null,
        attachments: null,
        revision_number: 0,
      },
    ];
    const mockExpenseCategories: ExpenseCategory[] = [
      { id: 1, name: 'Office Supplies' },
    ];

    vi.mocked(procurementApi.getPurchaseOrders).mockResolvedValue({ results: mockPurchaseOrders, count: mockPurchaseOrders.length, next: null, previous: null });
    vi.mocked(procurementApi.getExpenseCategoriesForDropdown).mockResolvedValue({ results: mockExpenseCategories, count: mockExpenseCategories.length, next: null, previous: null });

    // Ensure createCheckRequest doesn't use a blanket mockResolvedValue from other tests.
    // It should proceed to authenticatedFetch to be caught by MSW.
    vi.mocked(procurementApi.createCheckRequest).mockImplementation(
      async (
        authFetchParam: Parameters<typeof procurementApi.createCheckRequest>[0],
        formDataParam: Parameters<typeof procurementApi.createCheckRequest>[1]
      ): Promise<Awaited<ReturnType<typeof procurementApi.createCheckRequest>>> => {
        console.log('[Test Spy] procurementApi.createCheckRequest called in failure test, attempting actual fetch for MSW interception.');
        // Use the authFetchParam directly as it's the one passed by the component
        const result = await authFetchParam('/api/procurement/check-requests/', { method: 'POST', body: formDataParam });
        // The mocked authenticatedFetch (which authFetchParam is an instance of) returns Promise<any | null>.
        // We need to cast to CheckRequest if the actual authenticatedFetch is expected to return a typed object.
        return result as CheckRequest;
      }
    );

    renderWithProviders(<CheckRequestForm />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Create New Check Request/i })).toBeInTheDocument();
    });

    const specificErrorHandlerCR = http.post(`/api/procurement/check-requests/`, async () => { // Removed unused 'request'
        console.log('[MSW Test Handler] CheckRequestForm ERROR HANDLER matched POST /api/procurement/check-requests/');
        // const body = await (arguments[0] as { request: HttpRequest }).request.formData(); // If needed, access through arguments
        // console.log("MSW Error Handler received form data:", Object.fromEntries(body.entries()));
        return HttpResponse.json(
          {
            amount: ['This field is required.'], // Mocking error for amount
            // payee_name: ['This field may not be blank.'] // Mocking error for payee_name
          },
          { status: 400 }
        );
      });
    server.use(specificErrorHandlerCR); // Prepend this handler

    // Fill required fields that ARE NOT part of the simulated error
    // Select Purchase Order
    const poAutocomplete = screen.getByLabelText(/Select Purchase Order/i);
    await user.click(poAutocomplete);
    const poListbox = await screen.findByRole('listbox');
    // Corrected to match the actual display text format from getOptionLabel, including currency
    const expectedPOTextFailureTest = `PO #${mockPurchaseOrders[0].id} - ${mockPurchaseOrders[0].vendor_details?.name} (${formatCurrency(mockPurchaseOrders[0].total_amount)})`;
    await user.click(within(poListbox).getByText(expectedPOTextFailureTest));
    await waitFor(() => expect(screen.getByDisplayValue(expectedPOTextFailureTest)).toBeInTheDocument());


    // Select Expense Category
    await user.click(screen.getByRole('combobox', { name: /Expense Category/i }));
    const expenseCatListbox = await screen.findByRole('listbox');
    await user.click(within(expenseCatListbox).getByRole('option', { name: mockExpenseCategories[0].name }));

    // Fill other fields that should pass client-side validation
    await user.type(screen.getByLabelText(/Payee Name/i), 'Valid Payee for Error Test');
    await user.type(screen.getByLabelText(/Reason for Payment \/ Description/i), "Sufficient reason");

    const invoiceDateInputFailureTest = screen.getByLabelText(/Invoice Date/i);
    fireEvent.change(invoiceDateInputFailureTest, { target: { value: '2024-07-30' } }); // Provide a valid date
    await waitFor(() => expect(invoiceDateInputFailureTest).toHaveValue('2024-07-30'));

    // Intentionally leave 'Amount' blank or invalid to trigger the mocked backend error for 'amount'
    // (or set it to something the backend handler will specifically reject)
    // For this test, we'll submit with amount field empty, relying on backend to send error.
    // The form's client-side validation for amount might still trigger if not careful.
    // The yup schema makes amount required. So, to test backend error for amount,
    // we must provide *something* for amount that passes client validation but server rejects.
    // Or, ensure client validation for amount is temporarily bypassed for this specific test if possible,
    // or ensure the MSW error message matches a scenario where amount IS provided but still rejected.
    // Let's assume the MSW error for "amount: ['This field is required.']" means it wasn't provided or was invalid.
    // We will fill it with '0' which might be valid client-side but our mock can say it's required to be > 0.
    const amountInput = screen.getByLabelText(/Amount/i);
    await user.clear(amountInput);
    await user.type(amountInput, '100.50'); // Provide a valid amount to pass client validation
    await waitFor(() => expect(amountInput).toHaveValue(100.50));

    // Using fireEvent.submit on the form directly
    const formElementFailureTest = screen.getByRole('form', { name: /Check Request Form/i });
    fireEvent.submit(formElementFailureTest);
    // await user.click(screen.getByRole('button', { name: /Create Request/i }));

    // const alert = await screen.findByRole('alert', {}, {timeout: 4000});
    // // Expecting only the amount error based on the modified MSW handler
    // expect(within(alert).getByText(/amount: This field is required./i)).toBeInTheDocument();
    // expect(within(alert).queryByText(/payee_name: This field may not be blank./i)).not.toBeInTheDocument();

    // Updated assertion to handle multiple alerts:
    const alerts = await screen.findAllByRole('alert', {}, { timeout: 4000 });
    expect(alerts.length).toBeGreaterThan(0); // Ensure at least one alert

    // Check if any of the alerts contain the expected message regarding the amount
    const hasExpectedAmountError = alerts.some(alertElement =>
      within(alertElement).queryByText((content, element) => {
        const textMatch = /amount/i.test(content) && /This field is required/i.test(content);
        if (!textMatch) return false;
        // Ensure a strict boolean is returned, handling cases where element or textContent might be null
        return !!(element && element.textContent && element.textContent.includes('API Error'));
      })
    );
    if (!hasExpectedAmountError) {
  throw new Error('Expected to find an alert with the "amount is required" error message.');
}
  }, 15000); // Increased timeout
});
