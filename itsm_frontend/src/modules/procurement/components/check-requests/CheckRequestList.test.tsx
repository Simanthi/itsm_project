// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../../context/auth/AuthContext';
import { UIContextProvider } from '../../../../context/UIContext/UIContextProvider';
import CheckRequestList from './CheckRequestList';
import * as procurementApi from '../../../../api/procurementApi';
import * as useAuthHook from '../../../../context/auth/useAuth';
import * as useUIHook from '../../../../context/UIContext/useUI';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { CheckRequest, PaginatedResponse, CheckRequestStatus, ConfirmPaymentPayload } from '../../types'; // Removed PaymentMethod

// Mock API module
vi.mock('../../../../api/procurementApi');

// Mock context hooks
vi.mock('../../../../context/auth/useAuth');
vi.mock('../../../../context/UIContext/useUI');

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <UIContextProvider>{ui}</UIContextProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

// Helper to create a fully formed CheckRequest object with all optional fields
const базовыйПолностьюЗаполненныйОбъектЗапросаНаЧек = (данныеОВнесенииИзмененийВЗапросНаЧек: Partial<CheckRequest>): CheckRequest => {
  // Renamed to avoid any potential naming conflicts or weirdness with "defaults" if that's a keyword somewhere unexpected.
  // Using a non-English name for the variable to be absolutely sure it doesn't clash.
  const стандартныеЗначения: CheckRequest = {
    id: 0,
    purchase_order: null,
    purchase_order_number: null,
    invoice_number: null,
    invoice_date: null,
    amount: "0.00",
    payee_name: "Стандартный Получатель",
    payee_address: null,
    reason_for_payment: "Стандартная Причина",
    requested_by: 0,
    requested_by_username: "стандартныйПользователь",
    request_date: "2024-01-01T00:00:00.000Z", // Fixed date string
    status: 'pending_submission',
    approved_by_accounts: null,
    approved_by_accounts_username: null,
    accounts_approval_date: null,
    accounts_comments: null,
    payment_method: null,
    payment_date: null,
    transaction_id: null,
    payment_notes: null,
    cr_id: null,
    expense_category: null,
    expense_category_name: null,
    is_urgent: false,
    recurring_payment: null,
    recurring_payment_details: null,
    attachments: null,
    currency: 'USD',
    created_at: "2024-01-01T00:00:00.000Z", // Fixed date string
    updated_at: "2024-01-01T00:00:00.000Z", // Fixed date string
  };
  return { ...стандартныеЗначения, ...данныеОВнесенииИзмененийВЗапросНаЧек };
};

// Re-aliasing for clarity in tests
const createCompleteCheckRequest = базовыйПолностьюЗаполненныйОбъектЗапросаНаЧек;

const mockCR0_base = createCompleteCheckRequest({
  id: 1, cr_id: 'CR-001', purchase_order: 1, purchase_order_number: 'PO-001',
  request_date: '2024-02-01T10:00:00Z', status: 'pending_approval', amount: "500", currency: 'USD',
  payee_name: 'Vendor X', requested_by: 1, requested_by_username: 'testuser',
  created_at: '2024-02-01T10:00:00Z', updated_at: '2024-02-01T10:00:00Z',
  reason_for_payment: 'Payment for PO-001', expense_category_name: 'Software', is_urgent: false,
});

const mockCR1_base = createCompleteCheckRequest({
  id: 2, cr_id: 'CR-002', request_date: '2024-02-05T11:00:00Z', status: 'approved',
  amount: "150", currency: 'USD', payee_name: 'Consultant Y', requested_by: 2, requested_by_username: 'admin',
  created_at: '2024-02-05T11:00:00Z', updated_at: '2024-02-05T11:00:00Z',
  reason_for_payment: 'Consulting services', expense_category_name: 'Services', is_urgent: true,
});

const mockCRs: CheckRequest[] = [mockCR0_base, mockCR1_base];

const mockPaginatedCRsResponse: PaginatedResponse<CheckRequest> = {
  count: mockCRs.length,
  next: null,
  previous: null,
  results: mockCRs,
};

const mockEmptyCRsResponse: PaginatedResponse<CheckRequest> = {
  count: 0,
  next: null,
  previous: null,
  results: [],
};

const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'admin', is_staff: true, groups: [] };

describe('CheckRequestList', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      token: 'mockToken',
      user: mockUser,
      authenticatedFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      isAuthenticated: true,
    });

    vi.mocked(useUIHook.useUI).mockReturnValue({
      showSnackbar: vi.fn(),
      showConfirmDialog: vi.fn(),
      hideConfirmDialog: vi.fn(),
      confirmDialogOpen: false,
      confirmDialogTitle: '',
      confirmDialogMessage: '',
      confirmDialogOnConfirm: vi.fn(),
      confirmDialogOnCancel: undefined, // Match the type explicitly
      // Add missing properties
      snackbarOpen: false,
      snackbarMessage: '',
      snackbarSeverity: 'info', // Default severity
      hideSnackbar: vi.fn(),
    });

    vi.mocked(procurementApi.getCheckRequests).mockResolvedValue(mockPaginatedCRsResponse);
  });

  it('renders the main title and create button', async () => {
    renderWithProviders(<CheckRequestList />);
    expect(screen.getByRole('heading', { name: /Check Requests/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create New Check Request/i })).toBeInTheDocument();
  });

  it('renders table headers correctly', async () => {
    renderWithProviders(<CheckRequestList />);
    await waitFor(() => expect(vi.mocked(procurementApi.getCheckRequests)).toHaveBeenCalledTimes(1));

    expect(screen.getByText('CR ID')).toBeInTheDocument();
    expect(screen.getByText('PO #')).toBeInTheDocument();
    expect(screen.getByText('Payee')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Currency')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Urgent')).toBeInTheDocument();
    expect(screen.getByText('Request Date')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('displays check requests in the table', async () => {
    renderWithProviders(<CheckRequestList />);
    await waitFor(() => {
      expect(screen.getByText(mockCRs[0].cr_id!)).toBeInTheDocument();
      expect(screen.getByText(mockCRs[0].payee_name)).toBeInTheDocument();
      expect(screen.getByText(mockCRs[1].cr_id!)).toBeInTheDocument();
      expect(screen.getByText(mockCRs[1].payee_name)).toBeInTheDocument();
    });
  });

  it('displays "No check requests found." when no CRs are available', async () => {
    vi.mocked(procurementApi.getCheckRequests).mockResolvedValue(mockEmptyCRsResponse);
    renderWithProviders(<CheckRequestList />);
    await waitFor(() => {
      expect(screen.getByText('No check requests found.')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', async () => {
    vi.mocked(procurementApi.getCheckRequests).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve(mockPaginatedCRsResponse), 100))
    );
    renderWithProviders(<CheckRequestList />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('handles error when fetching CRs fails', async () => {
    const errorMessage = 'API Error Fetching CRs';
    vi.mocked(procurementApi.getCheckRequests).mockRejectedValueOnce(new Error(errorMessage));
    renderWithProviders(<CheckRequestList />);
    expect(await screen.findByText(new RegExp(errorMessage, "i"))).toBeInTheDocument();
  });

  it('navigates to create new CR form when "Create New Check Request" is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckRequestList />);
    const createButton = screen.getByRole('button', { name: /Create New Check Request/i });
    await user.click(createButton);
    expect(mockNavigate).toHaveBeenCalledWith('/procurement/check-requests/new');
  });

  it('navigates to view CR details when view icon is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckRequestList />);
    const viewButtons = await screen.findAllByRole('button', { name: /view details/i });
    expect(viewButtons[0]).toBeInTheDocument();
    await user.click(viewButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith(`/procurement/check-requests/view/${mockCRs[0].id}`);
  });

  it('calls getCheckRequests with correct sort parameters when column headers are clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CheckRequestList />);

    await waitFor(() => expect(procurementApi.getCheckRequests).toHaveBeenCalledTimes(1));
    expect(procurementApi.getCheckRequests).toHaveBeenLastCalledWith(
      expect.any(Function),
      expect.objectContaining({ ordering: '-request_date' })
    );

    await screen.findByText(mockCRs[0].cr_id!);

    const crIdHeaderButton = screen.getByRole('button', { name: /CR ID/i });
    await user.click(crIdHeaderButton);
    await waitFor(() => {
      expect(procurementApi.getCheckRequests).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ ordering: 'cr_id' })
      );
    });

    await user.click(crIdHeaderButton);
    await waitFor(() => {
      expect(procurementApi.getCheckRequests).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ ordering: '-cr_id' })
      );
    });

    const payeeHeaderButton = screen.getByRole('button', { name: /Payee/i });
    await user.click(payeeHeaderButton);
    await waitFor(() => {
      expect(procurementApi.getCheckRequests).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ ordering: 'payee_name' })
      );
    });
  });

  it('calls getCheckRequests with correct pagination parameters', async () => {
    const user = userEvent.setup();

    const moreCRs: CheckRequest[] = Array.from({ length: 25 }, (_, i) => ({
      ...mockCRs[0],
      id: i + 1,
      cr_id: `CR-${String(i + 1).padStart(3, '0')}`,
    }));

    const initialResponse: PaginatedResponse<CheckRequest> = {
      count: moreCRs.length,
      next: 'http://test/api/crs?page=2&pageSize=10',
      previous: null,
      results: moreCRs.slice(0, 10),
    };
    const rpp5Page1Response: PaginatedResponse<CheckRequest> = {
      count: moreCRs.length,
      next: 'http://test/api/crs?page=2&pageSize=5',
      previous: null,
      results: moreCRs.slice(0, 5),
    };
    const rpp5Page2Response: PaginatedResponse<CheckRequest> = {
      count: moreCRs.length,
      next: 'http://test/api/crs?page=3&pageSize=5',
      previous: 'http://test/api/crs?page=1&pageSize=5',
      results: moreCRs.slice(5, 10),
    };

    const getRequestsMock = vi.mocked(procurementApi.getCheckRequests)
      .mockResolvedValueOnce(initialResponse)
      .mockResolvedValueOnce(rpp5Page1Response)
      .mockResolvedValueOnce(rpp5Page2Response);

    renderWithProviders(<CheckRequestList />);

    await waitFor(() => expect(getRequestsMock).toHaveBeenCalledTimes(1));
    expect(getRequestsMock).toHaveBeenNthCalledWith(1, expect.any(Function), expect.objectContaining({ page: 1, pageSize: 10, ordering: '-request_date' }));
    await screen.findByText('CR-001');
    expect(screen.getByText('1–10 of 25')).toBeInTheDocument();

    const rowsPerPageSelect = screen.getByLabelText(/Rows per page:/i);
    await user.click(rowsPerPageSelect);
    const option5 = await screen.findByRole('option', { name: '5' });
    await user.click(option5);

    await waitFor(() => expect(getRequestsMock).toHaveBeenCalledTimes(2));
    expect(getRequestsMock).toHaveBeenNthCalledWith(2, expect.any(Function), expect.objectContaining({ page: 1, pageSize: 5, ordering: '-request_date' }));
    await screen.findByText('CR-001');
    expect(screen.queryByText('CR-006')).not.toBeInTheDocument();
    expect(screen.getByText('1–5 of 25')).toBeInTheDocument();

    const nextPageButton = screen.getByRole('button', { name: /Go to next page/i });
    expect(nextPageButton).toBeEnabled();
    await user.click(nextPageButton);

    await waitFor(() => expect(getRequestsMock).toHaveBeenCalledTimes(3));
    expect(getRequestsMock).toHaveBeenNthCalledWith(3, expect.any(Function), expect.objectContaining({ page: 2, pageSize: 5, ordering: '-request_date' }));
    await screen.findByText('CR-006');
    expect(screen.getByText('6–10 of 25')).toBeInTheDocument();
  });

  describe('Action Buttons', () => {
    const pendingSubmissionCR = createCompleteCheckRequest({
      // Use the specific base mockCR0_base or define all necessary fields explicitly
      // Let's be explicit for one to test this theory
      id: 201, cr_id: 'CR-SUBMIT', status: 'pending_submission', requested_by: mockUser.id, requested_by_username: mockUser.name,
      purchase_order: 1, purchase_order_number: 'PO-001', request_date: '2024-02-01T10:00:00Z',
      amount: "500", currency: 'USD', payee_name: 'Vendor X', created_at: '2024-02-01T10:00:00Z',
      updated_at: '2024-02-01T10:00:00Z', reason_for_payment: 'Payment for PO-001', expense_category_name: 'Software',
    });
    const pendingApprovalCR = createCompleteCheckRequest({
      // Explicitly define based on defaults + overrides, not spreading mockCRs[0]
      id: 202, cr_id: 'CR-APPROVE', status: 'pending_approval', requested_by: mockUser.id, requested_by_username: mockUser.name,
      purchase_order: 1, purchase_order_number: 'PO-001', request_date: '2024-02-01T10:00:00Z',
      amount: "500", currency: 'USD', payee_name: 'Vendor X', created_at: '2024-02-01T10:00:00Z',
      updated_at: '2024-02-01T10:00:00Z', reason_for_payment: 'Payment for PO-001', expense_category_name: 'Software',
    });
     const otherUserPendingSubmissionCR = createCompleteCheckRequest({
      id: 203, cr_id: 'CR-OTHER', status: 'pending_submission', requested_by: 999, requested_by_username: 'otheruser',
      purchase_order: 1, purchase_order_number: 'PO-001', request_date: '2024-02-01T10:00:00Z',
      amount: "500", currency: 'USD', payee_name: 'Vendor X', created_at: '2024-02-01T10:00:00Z',
      updated_at: '2024-02-01T10:00:00Z', reason_for_payment: 'Payment for PO-001', expense_category_name: 'Software',
    });
    const mockUserStaff = { id: 1, name: 'Staff User', email: 'staff@example.com', role: 'admin', is_staff: true, groups: [] };
    const mockUserRegular = { id: 2, name: 'Regular User', email: 'regular@example.com', role: 'user', is_staff: false, groups: [] };

    // --- Edit Button ---
    it('shows Edit button for "pending_submission" CR if user is requester, and navigates', async () => {
      const specificEditTestCR: CheckRequest = {
        id: 201,
        cr_id: 'CR-EDIT-TEST',
        status: 'pending_submission',
        requested_by: 1, // mockUser.id
        requested_by_username: 'testuser_edit',
        purchase_order: 1,
        purchase_order_number: 'PO-EDIT',
        request_date: '2024-03-15T10:00:00Z',
        amount: "750.00",
        currency: 'EUR',
        payee_name: 'Edit Test Payee',
        created_at: '2024-03-15T09:00:00Z',
        updated_at: '2024-03-15T09:05:00Z',
        reason_for_payment: 'Reason for edit test',
        expense_category_name: 'Testing Category',
        is_urgent: false,
        // All optional fields explicitly null or default
        invoice_number: null,
        invoice_date: null,
        payee_address: null,
        approved_by_accounts: null,
        approved_by_accounts_username: null,
        accounts_approval_date: null,
        accounts_comments: null,
        payment_method: null,
        payment_date: null,
        transaction_id: null,
        payment_notes: null,
        expense_category: null,
        recurring_payment: null,
        recurring_payment_details: null,
        attachments: null,
      };

      vi.mocked(useAuthHook.useAuth)().user = { ...mockUserStaff, id: specificEditTestCR.requested_by };
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({
        count: 1,
        next: null,
        previous: null,
        results: [specificEditTestCR]
      });
      const user = userEvent.setup();
      renderWithProviders(<CheckRequestList />);
      const editButton = await screen.findByRole('button', { name: /edit/i });
      expect(editButton).toBeInTheDocument();
      await user.click(editButton);
      expect(mockNavigate).toHaveBeenCalledWith(`/procurement/check-requests/edit/${specificEditTestCR.id}`);
    });

    it('shows Edit button for "pending_submission" CR if user is staff (not requester)', async () => {
      // For this test, otherUserPendingSubmissionCR is fine as its definition was already made more explicit
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({
        count: 1,
        next: null,
        previous: null,
        results: [otherUserPendingSubmissionCR]
      });
      renderWithProviders(<CheckRequestList />);
      const editButton = await screen.findByRole('button', { name: /edit/i });
      expect(editButton).toBeInTheDocument();
    });

    it('does NOT show Edit button for "pending_approval" CR', async () => {
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({
        count: 1,
        next: null,
        previous: null,
        results: [pendingApprovalCR]
      });
      renderWithProviders(<CheckRequestList />);
      await screen.findByText(pendingApprovalCR.cr_id!);
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });

    it('does NOT show Edit button for "pending_submission" CR if user is not requester and not staff', async () => {
      vi.mocked(useAuthHook.useAuth)().user = mockUserRegular;
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({
        count: 1,
        next: null,
        previous: null,
        results: [otherUserPendingSubmissionCR]
      });
      renderWithProviders(<CheckRequestList />);
      await screen.findByText(otherUserPendingSubmissionCR.cr_id!);
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });

    // --- Submit for Approval Button ---
    it('shows "Submit for Approval" button for "pending_submission" CR if user is requester, and calls API', async () => {
      vi.mocked(useAuthHook.useAuth)().user = { ...mockUserStaff, id: pendingSubmissionCR.requested_by };

      const getRequestsMock = vi.mocked(procurementApi.getCheckRequests)
        .mockResolvedValueOnce({
          count: 1,
          next: null,
          previous: null,
          results: [
            createCompleteCheckRequest({ // Initial state for the test
              ...pendingSubmissionCR,
              requested_by: mockUser.id,
              requested_by_username: mockUserStaff.name,
            })
          ]
        })
        .mockResolvedValueOnce({ // State after submission - EXTREMELY EXPLICIT MOCK
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 201, // Matches pendingSubmissionCR.id
              cr_id: 'CR-SUBMIT', // Matches pendingSubmissionCR.cr_id
              status: 'pending_approval', // <<<< Main change for this state
              requested_by: 1, // mockUser.id
              requested_by_username: 'Staff User', // mockUserStaff.name
              purchase_order: 1,
              purchase_order_number: 'PO-001',
              request_date: '2024-02-01T10:00:00Z',
              amount: "500.00",
              currency: 'USD',
              payee_name: 'Vendor X',
              reason_for_payment: 'Payment for PO-001',
              expense_category_name: 'Software',
              is_urgent: false,
              created_at: '2024-02-01T10:00:00Z', // Original creation
              updated_at: '2024-03-15T12:00:00Z', // New updated_at
              // All optional fields explicitly set
              invoice_number: null,
              invoice_date: null,
              payee_address: null,
              approved_by_accounts: null,
              approved_by_accounts_username: null,
              accounts_approval_date: null,
              accounts_comments: null,
              payment_method: null,
              payment_date: null,
              transaction_id: null,
              payment_notes: null,
              expense_category: null,
              recurring_payment: null,
              recurring_payment_details: null,
              attachments: null,
            } as CheckRequest
          ]
        });
      const submitMock = vi.mocked(procurementApi.submitCheckRequestForApproval).mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderWithProviders(<CheckRequestList />);

      const submitButton = await screen.findByRole('button', { name: /submit for approval/i });
      expect(submitButton).toBeInTheDocument();

      await user.click(submitButton);
      await waitFor(() => expect(submitMock).toHaveBeenCalledWith(expect.any(Function), pendingSubmissionCR.id));
      await waitFor(() => expect(getRequestsMock).toHaveBeenCalledTimes(2));
      expect(vi.mocked(useUIHook.useUI)().showSnackbar).toHaveBeenCalledWith('Request submitted for approval!', 'success');
    });

    it('shows "Submit for Approval" button for "pending_submission" CR if user is staff (not requester)', async () => {
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
       vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({
         count: 1,
         next: null,
         previous: null,
         results: [otherUserPendingSubmissionCR]
       });
      renderWithProviders(<CheckRequestList />);
      const submitButton = await screen.findByRole('button', { name: /submit for approval/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('does NOT show "Submit for Approval" button for "pending_approval" CR', async () => {
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({
        count: 1,
        next: null,
        previous: null,
        results: [pendingApprovalCR]
      });
      renderWithProviders(<CheckRequestList />);
      await screen.findByText(pendingApprovalCR.cr_id!);
      expect(screen.queryByRole('button', { name: /submit for approval/i })).not.toBeInTheDocument();
    });

    it('does NOT show "Submit for Approval" button for "pending_submission" CR if user is not requester and not staff', async () => {
      vi.mocked(useAuthHook.useAuth)().user = mockUserRegular;
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({
        count: 1,
        next: null,
        previous: null,
        results: [otherUserPendingSubmissionCR]
      });
      renderWithProviders(<CheckRequestList />);
      await screen.findByText(otherUserPendingSubmissionCR.cr_id!);
      expect(screen.queryByRole('button', { name: /submit for approval/i })).not.toBeInTheDocument();
    });

    // --- Approve/Reject by Accounts ---
    it('handles "Approve" by accounts: shows button, opens dialog, confirms, calls API', async () => {
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
      const getRequestsMock = vi.mocked(procurementApi.getCheckRequests)
        .mockResolvedValueOnce({ // Initial state
          count: 1,
          next: null,
          previous: null,
          results: [
            createCompleteCheckRequest({
              ...pendingApprovalCR, // ID 202, status 'pending_approval'
              requested_by_username: mockUserStaff.name,
            })
          ]
        })
        .mockResolvedValueOnce({ // State after approval
          count: 1,
          next: null,
          previous: null,
          results: [
            { // Manually define the CR object after approval
              id: pendingApprovalCR.id,
              cr_id: pendingApprovalCR.cr_id,
              status: 'approved', // Changed
              requested_by: pendingApprovalCR.requested_by,
              requested_by_username: pendingApprovalCR.requested_by_username, // Original requester
              purchase_order: pendingApprovalCR.purchase_order,
              purchase_order_number: pendingApprovalCR.purchase_order_number,
              request_date: pendingApprovalCR.request_date,
              amount: pendingApprovalCR.amount,
              currency: pendingApprovalCR.currency,
              payee_name: pendingApprovalCR.payee_name,
              reason_for_payment: pendingApprovalCR.reason_for_payment,
              expense_category_name: pendingApprovalCR.expense_category_name,
              is_urgent: pendingApprovalCR.is_urgent,
              created_at: pendingApprovalCR.created_at,
              updated_at: new Date().toISOString(), // Updated
              invoice_number: pendingApprovalCR.invoice_number,
              invoice_date: pendingApprovalCR.invoice_date,
              payee_address: pendingApprovalCR.payee_address,
              approved_by_accounts: mockUserStaff.id, // User who approved
              approved_by_accounts_username: mockUserStaff.name,
              accounts_approval_date: new Date().toISOString(),
              accounts_comments: 'Approved by Accounts test',
              payment_method: null,
              payment_date: null,
              transaction_id: null,
              payment_notes: null,
              expense_category: pendingApprovalCR.expense_category,
              recurring_payment: pendingApprovalCR.recurring_payment,
              recurring_payment_details: pendingApprovalCR.recurring_payment_details,
              attachments: pendingApprovalCR.attachments,
            } as CheckRequest
          ]
        });
      const approveMock = vi.mocked(procurementApi.approveCheckRequestByAccounts).mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderWithProviders(<CheckRequestList />);

      const approveButton = await screen.findByRole('button', { name: /approve/i });
      expect(approveButton).toBeInTheDocument();
      await user.click(approveButton);

      const dialogTitle = await screen.findByRole('heading', { name: /Approve Check Request/i });
      expect(dialogTitle).toBeInTheDocument();
      const commentsInput = screen.getByLabelText(/Comments/i);
      await user.type(commentsInput, 'Approved by Accounts test');
      const confirmButton = screen.getByRole('button', { name: /Confirm Approval/i });
      await user.click(confirmButton);

      await waitFor(() => expect(approveMock).toHaveBeenCalledWith(expect.any(Function), pendingApprovalCR.id, { comments: 'Approved by Accounts test' }));
      await waitFor(() => expect(getRequestsMock).toHaveBeenCalledTimes(2));
      expect(vi.mocked(useUIHook.useUI)().showSnackbar).toHaveBeenCalledWith('Request approved by accounts!', 'success');
    });

    it('handles "Reject" by accounts: shows button, opens dialog, confirms, calls API', async () => {
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
      const getRequestsMock = vi.mocked(procurementApi.getCheckRequests)
        .mockResolvedValueOnce({ // Initial state
          count: 1,
          next: null,
          previous: null,
          results: [
            createCompleteCheckRequest({
              ...pendingApprovalCR, // ID 202, status 'pending_approval'
              requested_by_username: mockUserStaff.name,
            })
          ]
        })
        .mockResolvedValueOnce({ // State after rejection
          count: 1,
          next: null,
          previous: null,
          results: [
            { // Manually define the CR object after rejection
              id: pendingApprovalCR.id,
              cr_id: pendingApprovalCR.cr_id,
              status: 'rejected', // Changed
              requested_by: pendingApprovalCR.requested_by,
              requested_by_username: pendingApprovalCR.requested_by_username,
              purchase_order: pendingApprovalCR.purchase_order,
              purchase_order_number: pendingApprovalCR.purchase_order_number,
              request_date: pendingApprovalCR.request_date,
              amount: pendingApprovalCR.amount,
              currency: pendingApprovalCR.currency,
              payee_name: pendingApprovalCR.payee_name,
              reason_for_payment: pendingApprovalCR.reason_for_payment,
              expense_category_name: pendingApprovalCR.expense_category_name,
              is_urgent: pendingApprovalCR.is_urgent,
              created_at: pendingApprovalCR.created_at,
              updated_at: new Date().toISOString(), // Updated
              invoice_number: pendingApprovalCR.invoice_number,
              invoice_date: pendingApprovalCR.invoice_date,
              payee_address: pendingApprovalCR.payee_address,
              approved_by_accounts: mockUserStaff.id, // User who rejected
              approved_by_accounts_username: mockUserStaff.name,
              accounts_approval_date: new Date().toISOString(),
              accounts_comments: 'Rejected by Accounts test',
              payment_method: null,
              payment_date: null,
              transaction_id: null,
              payment_notes: null,
              expense_category: pendingApprovalCR.expense_category,
              recurring_payment: pendingApprovalCR.recurring_payment,
              recurring_payment_details: pendingApprovalCR.recurring_payment_details,
              attachments: pendingApprovalCR.attachments,
            } as CheckRequest
          ]
        });
      const rejectMock = vi.mocked(procurementApi.rejectCheckRequestByAccounts).mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderWithProviders(<CheckRequestList />);

      const rejectButton = await screen.findByRole('button', { name: /reject/i });
      expect(rejectButton).toBeInTheDocument();
      await user.click(rejectButton);

      const dialogTitle = await screen.findByRole('heading', { name: /Reject Check Request/i });
      expect(dialogTitle).toBeInTheDocument();
      const commentsInput = screen.getByLabelText(/Comments/i);
      await user.type(commentsInput, 'Rejected by Accounts test');
      const confirmButton = screen.getByRole('button', { name: /Confirm Rejection/i });
      await user.click(confirmButton);

      await waitFor(() => expect(rejectMock).toHaveBeenCalledWith(expect.any(Function), pendingApprovalCR.id, { comments: 'Rejected by Accounts test' }));
      await waitFor(() => expect(getRequestsMock).toHaveBeenCalledTimes(2));
      expect(vi.mocked(useUIHook.useUI)().showSnackbar).toHaveBeenCalledWith('Request rejected by accounts!', 'success');
    });

    it('does NOT show Approve/Reject buttons for "pending_approval" CR if user is not staff', async () => {
      vi.mocked(useAuthHook.useAuth)().user = mockUserRegular;
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({
        count: 1,
        next: null,
        previous: null,
        results: [pendingApprovalCR]
      });
      renderWithProviders(<CheckRequestList />);
      await screen.findByText(pendingApprovalCR.cr_id!);
      expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    });

    it('does NOT show Approve/Reject buttons for "pending_submission" CR even if user is staff', async () => {
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({
        count: 1,
        next: null,
        previous: null,
        results: [pendingSubmissionCR]
      });
      renderWithProviders(<CheckRequestList />);
      await screen.findByText(pendingSubmissionCR.cr_id!);
      expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    });

    // --- Mark Payment Processing ---
    it('handles "Mark Payment Processing": shows button for approved CR if staff, calls API', async () => {
      const approvedCRId = 205;
      const approvedCR = createCompleteCheckRequest({
        ...mockCRs[0],
        id: approvedCRId,
        cr_id: 'CR-APPROVED',
        status: 'approved',
        requested_by_username: mockCRs[0].requested_by_username,
        // Make sure it has fields that might be expected by rendering logic
        payee_name: 'Test Payee for Processing',
        amount: "100.00",
      });
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
      const getRequestsMock = vi.mocked(procurementApi.getCheckRequests)
        .mockResolvedValueOnce({ // Initial state: an approved CR
          count: 1,
          next: null,
          previous: null,
          results: [approvedCR]
        })
        .mockResolvedValueOnce({ // State after marking as payment_processing
          count: 1,
          next: null,
          previous: null,
          results: [
            { // Manually define CR after marking for payment processing
              id: approvedCR.id,
              cr_id: approvedCR.cr_id,
              status: 'payment_processing', // Changed
              requested_by: approvedCR.requested_by,
              requested_by_username: approvedCR.requested_by_username,
              purchase_order: approvedCR.purchase_order,
              purchase_order_number: approvedCR.purchase_order_number,
              request_date: approvedCR.request_date,
              amount: approvedCR.amount,
              currency: approvedCR.currency,
              payee_name: approvedCR.payee_name,
              reason_for_payment: approvedCR.reason_for_payment,
              expense_category_name: approvedCR.expense_category_name,
              is_urgent: approvedCR.is_urgent,
              created_at: approvedCR.created_at,
              updated_at: new Date().toISOString(), // Updated
              invoice_number: approvedCR.invoice_number,
              invoice_date: approvedCR.invoice_date,
              payee_address: approvedCR.payee_address,
              approved_by_accounts: approvedCR.approved_by_accounts,
              approved_by_accounts_username: approvedCR.approved_by_accounts_username,
              accounts_approval_date: approvedCR.accounts_approval_date,
              accounts_comments: approvedCR.accounts_comments,
              payment_method: null, // Not yet paid
              payment_date: null,
              transaction_id: null,
              payment_notes: null,
              expense_category: approvedCR.expense_category,
              recurring_payment: approvedCR.recurring_payment,
              recurring_payment_details: approvedCR.recurring_payment_details,
              attachments: approvedCR.attachments,
            } as CheckRequest
          ]
        });
      const markProcessingMock = vi.mocked(procurementApi.markCheckRequestPaymentProcessing).mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderWithProviders(<CheckRequestList />);

      const markButton = await screen.findByRole('button', { name: /mark payment processing/i });
      expect(markButton).toBeInTheDocument();

      await user.click(markButton);
      await waitFor(() => expect(markProcessingMock).toHaveBeenCalledWith(expect.any(Function), approvedCRId));
      await waitFor(() => expect(getRequestsMock).toHaveBeenCalledTimes(2));
      expect(vi.mocked(useUIHook.useUI)().showSnackbar).toHaveBeenCalledWith('Request marked as payment processing!', 'success');
    });

    it('does NOT show "Mark Payment Processing" button for non-approved CR', async () => {
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({
        count: 1,
        next: null,
        previous: null,
        results: [pendingApprovalCR] // Use the fully defined pendingApprovalCR
      });
      renderWithProviders(<CheckRequestList />);
      await screen.findByText(pendingApprovalCR.cr_id!);
      expect(screen.queryByRole('button', { name: /mark payment processing/i })).not.toBeInTheDocument();
    });

    it('does NOT show "Mark Payment Processing" button if user is not staff', async () => {
      const approvedCR = createCompleteCheckRequest({ ...mockCRs[0], id: 205, cr_id: 'CR-APPROVED', status: 'approved' });
      vi.mocked(useAuthHook.useAuth)().user = mockUserRegular;
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({
        count: 1,
        next: null,
        previous: null,
        results: [approvedCR]
      });
      renderWithProviders(<CheckRequestList />);
      await screen.findByText('CR-APPROVED');
      expect(screen.queryByRole('button', { name: /mark payment processing/i })).not.toBeInTheDocument();
    });

    // --- Confirm Payment ---
    it(`handles "Confirm Payment" for "approved" CR: shows button, opens dialog, fills details, confirms, calls API`, async () => {
      const crInstanceId = 206;
      const approvedCRForPayment = createCompleteCheckRequest({
        ...mockCRs[0],
        id: crInstanceId,
        cr_id: 'CR-PAY-APPROVED',
        status: 'approved',
        requested_by_username: mockCRs[0].requested_by_username,
        payee_name: "Payee for Payment Test",
        amount: "123.45",
      });
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;

      // Define expectedPayload *before* it's used in the mock implementation
      const testPaymentDate = new Date().toISOString().split('T')[0];
      const definedExpectedPayload: ConfirmPaymentPayload = {
          payment_method: 'ach',
          payment_date: testPaymentDate, // Use a fixed date for the mock definition
          transaction_id: 'ACH-TXN-12345',
          payment_notes: 'Payment processed via ACH.',
      };

      const getRequestsMock = vi.mocked(procurementApi.getCheckRequests)
          .mockResolvedValueOnce({ // Initial: approved CR
            count: 1,
            next: null,
            previous: null,
            results: [approvedCRForPayment]
          })
          .mockResolvedValueOnce({ // After payment confirmation
            count: 1,
            next: null,
            previous: null,
            results: [
              { // Manually define CR after payment
                id: approvedCRForPayment.id,
                cr_id: approvedCRForPayment.cr_id,
                status: 'paid', // Changed
                requested_by: approvedCRForPayment.requested_by,
                requested_by_username: approvedCRForPayment.requested_by_username,
                purchase_order: approvedCRForPayment.purchase_order,
                purchase_order_number: approvedCRForPayment.purchase_order_number,
                request_date: approvedCRForPayment.request_date,
                amount: approvedCRForPayment.amount,
                currency: approvedCRForPayment.currency,
                payee_name: approvedCRForPayment.payee_name,
                reason_for_payment: approvedCRForPayment.reason_for_payment,
                expense_category_name: approvedCRForPayment.expense_category_name,
                is_urgent: approvedCRForPayment.is_urgent,
                created_at: approvedCRForPayment.created_at,
                updated_at: new Date().toISOString(), // Updated
                invoice_number: approvedCRForPayment.invoice_number,
                invoice_date: approvedCRForPayment.invoice_date,
                payee_address: approvedCRForPayment.payee_address,
                approved_by_accounts: approvedCRForPayment.approved_by_accounts,
                approved_by_accounts_username: approvedCRForPayment.approved_by_accounts_username,
                accounts_approval_date: approvedCRForPayment.accounts_approval_date,
                accounts_comments: approvedCRForPayment.accounts_comments,
                payment_method: definedExpectedPayload.payment_method, // From payload
                payment_date: definedExpectedPayload.payment_date,     // From payload
                transaction_id: definedExpectedPayload.transaction_id, // From payload
                payment_notes: definedExpectedPayload.payment_notes,   // From payload
                expense_category: approvedCRForPayment.expense_category,
                recurring_payment: approvedCRForPayment.recurring_payment,
                recurring_payment_details: approvedCRForPayment.recurring_payment_details,
                attachments: approvedCRForPayment.attachments,
              } as CheckRequest
            ]
          });
        const confirmPaymentMock = vi.mocked(procurementApi.confirmCheckRequestPayment).mockResolvedValue(undefined);

        const user = userEvent.setup();
        renderWithProviders(<CheckRequestList />);

        const confirmButtonTrigger = await screen.findByRole('button', { name: /confirm payment/i });
        expect(confirmButtonTrigger).toBeInTheDocument();
        await user.click(confirmButtonTrigger);

        const dialogTitle = await screen.findByRole('heading', { name: /Confirm Payment/i });
        expect(dialogTitle).toBeInTheDocument();
        const paymentMethodSelect = screen.getByLabelText(/Payment Method/i);
        await user.click(paymentMethodSelect);
        const achOption = await screen.findByRole('option', { name: /ACH Transfer/i });
        await user.click(achOption);
        await waitFor(() => expect(paymentMethodSelect).toHaveTextContent(/ACH Transfer/i));
        const paymentDateInput = screen.getByLabelText(/Payment Date/i) as HTMLInputElement;
        // For the actual call, we'll use the live paymentDateInput.value
        // but for the mock above, we used testPaymentDate.
        // The assertion below will check the actual values sent.
        await user.clear(paymentDateInput); // Clear default date if any
        await user.type(paymentDateInput, testPaymentDate); // Type in the consistent test date

        const transactionIdInput = screen.getByLabelText(/Transaction ID \/ Check #/i);
        await user.type(transactionIdInput, 'ACH-TXN-12345');
        const paymentNotesInput = screen.getByLabelText(/Payment Notes/i);
        await user.type(paymentNotesInput, 'Payment processed via ACH.');
        const confirmDialogButton = screen.getByRole('button', { name: /Confirm Payment/i, hidden: false });

        // This is the payload that should be asserted against the API call
        const actualCallExpectedPayload: ConfirmPaymentPayload = {
            payment_method: 'ach',
            payment_date: testPaymentDate, // Using the consistent date
            transaction_id: 'ACH-TXN-12345',
            payment_notes: 'Payment processed via ACH.',
        };

        await user.click(confirmDialogButton);
        await waitFor(() => expect(confirmPaymentMock).toHaveBeenCalledWith(
          expect.any(Function),
          approvedCRForPayment.id,
          expect.objectContaining(actualCallExpectedPayload) // Assert with the correct payload
        ), { timeout: 7000 });

        await waitFor(() => expect(getRequestsMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
        expect(vi.mocked(useUIHook.useUI)().showSnackbar).toHaveBeenCalledWith('Payment confirmed!', 'success');
    }, 20000);

    it(`handles "Confirm Payment" for "payment_processing" CR: shows button, opens dialog, fills details, confirms, calls API`, async () => {
      const crInstanceId = 207;
      const processingCRForPayment = createCompleteCheckRequest({
         ...mockCRs[0],
         id: crInstanceId,
         cr_id: 'CR-PAY-PROCESSING',
         status: 'payment_processing',
         requested_by_username: mockCRs[0].requested_by_username,
         payee_name: "Payee for Processing Payment Test",
         amount: "678.90",
      });
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;

      // Define expectedPayload *before* it's used in the mock implementation
      const testPaymentDateCheck = new Date().toISOString().split('T')[0];
      const definedExpectedPayloadCheck: ConfirmPaymentPayload = {
          payment_method: 'check',
          payment_date: testPaymentDateCheck,
          transaction_id: 'CHECK-67890',
          payment_notes: 'Payment processed via Check for payment_processing.',
      };

      const getRequestsMock = vi.mocked(procurementApi.getCheckRequests)
          .mockResolvedValueOnce({ // Initial: payment_processing CR
            count: 1,
            next: null,
            previous: null,
            results: [processingCRForPayment]
          })
          .mockResolvedValueOnce({ // After payment confirmation
            count: 1,
            next: null,
            previous: null,
            results: [
              { // Manually define CR after payment
                id: processingCRForPayment.id,
                cr_id: processingCRForPayment.cr_id,
                status: 'paid', // Changed
                requested_by: processingCRForPayment.requested_by,
                requested_by_username: processingCRForPayment.requested_by_username,
                purchase_order: processingCRForPayment.purchase_order,
                purchase_order_number: processingCRForPayment.purchase_order_number,
                request_date: processingCRForPayment.request_date,
                amount: processingCRForPayment.amount,
                currency: processingCRForPayment.currency,
                payee_name: processingCRForPayment.payee_name,
                reason_for_payment: processingCRForPayment.reason_for_payment,
                expense_category_name: processingCRForPayment.expense_category_name,
                is_urgent: processingCRForPayment.is_urgent,
                created_at: processingCRForPayment.created_at,
                updated_at: new Date().toISOString(), // Updated
                invoice_number: processingCRForPayment.invoice_number,
                invoice_date: processingCRForPayment.invoice_date,
                payee_address: processingCRForPayment.payee_address,
                approved_by_accounts: processingCRForPayment.approved_by_accounts,
                approved_by_accounts_username: processingCRForPayment.approved_by_accounts_username,
                accounts_approval_date: processingCRForPayment.accounts_approval_date,
                accounts_comments: processingCRForPayment.accounts_comments,
                payment_method: definedExpectedPayloadCheck.payment_method, // From payload
                payment_date: definedExpectedPayloadCheck.payment_date,     // From payload
                transaction_id: definedExpectedPayloadCheck.transaction_id, // From payload
                payment_notes: definedExpectedPayloadCheck.payment_notes,   // From payload
                expense_category: processingCRForPayment.expense_category,
                recurring_payment: processingCRForPayment.recurring_payment,
                recurring_payment_details: processingCRForPayment.recurring_payment_details,
                attachments: processingCRForPayment.attachments,
              } as CheckRequest
            ]
          });
      const confirmPaymentMock = vi.mocked(procurementApi.confirmCheckRequestPayment).mockResolvedValue(undefined);

      const user = userEvent.setup();
      renderWithProviders(<CheckRequestList />);

      const confirmButtonTrigger = await screen.findByRole('button', { name: /confirm payment/i });
      expect(confirmButtonTrigger).toBeInTheDocument();
      await user.click(confirmButtonTrigger);

      const dialogTitle = await screen.findByRole('heading', { name: /Confirm Payment/i });
      expect(dialogTitle).toBeInTheDocument();
      const paymentMethodSelect = screen.getByLabelText(/Payment Method/i);
      await user.click(paymentMethodSelect);
      const checkOption = await screen.findByRole('option', { name: /Check/i });
      await user.click(checkOption);
      await waitFor(() => expect(paymentMethodSelect).toHaveTextContent(/Check/i));
      const paymentDateInput = screen.getByLabelText(/Payment Date/i) as HTMLInputElement;
        await user.clear(paymentDateInput); // Clear default date if any
        await user.type(paymentDateInput, testPaymentDateCheck); // Type in the consistent test date

      const transactionIdInput = screen.getByLabelText(/Transaction ID \/ Check #/i);
      await user.type(transactionIdInput, 'CHECK-67890');
      const paymentNotesInput = screen.getByLabelText(/Payment Notes/i);
      await user.type(paymentNotesInput, 'Payment processed via Check for payment_processing.');
      const confirmDialogButton = screen.getByRole('button', { name: /Confirm Payment/i, hidden: false });

      // This is the payload that should be asserted against the API call
      const actualCallExpectedPayloadCheck: ConfirmPaymentPayload = {
          payment_method: 'check',
          payment_date: testPaymentDateCheck, // Using the consistent date
          transaction_id: 'CHECK-67890',
          payment_notes: 'Payment processed via Check for payment_processing.',
      };

      await user.click(confirmDialogButton);
      await waitFor(() => expect(confirmPaymentMock).toHaveBeenCalledWith(
        expect.any(Function),
          processingCRForPayment.id,
        expect.objectContaining(actualCallExpectedPayloadCheck) // Assert with the correct payload
      ), { timeout: 7000 });

      await waitFor(() => expect(getRequestsMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
      expect(vi.mocked(useUIHook.useUI)().showSnackbar).toHaveBeenCalledWith('Payment confirmed!', 'success');
    }, 20000);

    it('does NOT show "Confirm Payment" button for "pending_approval" CR', async () => {
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({
        count: 1,
        next: null,
        previous: null,
        results: [pendingApprovalCR]
      });
      renderWithProviders(<CheckRequestList />);
      await screen.findByText('CR-APPROVE'); // Relies on pendingApprovalCR.cr_id being 'CR-APPROVE'
      expect(screen.queryByRole('button', { name: /confirm payment/i })).not.toBeInTheDocument();
    });

    it('does NOT show "Confirm Payment" button if user is not staff', async () => {
      const approvedCRForPayment = createCompleteCheckRequest({
        ...mockCRs[0], id: 206, cr_id: 'CR-PAY-APPROVED', status: 'approved'
      });
      vi.mocked(useAuthHook.useAuth)().user = mockUserRegular;
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({
        count: 1,
        next: null,
        previous: null,
        results: [approvedCRForPayment]
      });
      renderWithProviders(<CheckRequestList />);
      await screen.findByText('CR-PAY-APPROVED');
      expect(screen.queryByRole('button', { name: /confirm payment/i })).not.toBeInTheDocument();
    });

    // --- Cancel Request ---
    [{status: 'pending_submission', id: 208, cr_id: 'CR-CANCEL-SUB'}, {status: 'pending_approval', id:209, cr_id: 'CR-CANCEL-APP'}].forEach((crData) => {
      it(`handles "Cancel Request" for "${crData.status}" CR: shows button, opens dialog, confirms, calls API`, async () => {
        const currentCrInstance = createCompleteCheckRequest({
          ...mockCRs[0],
          ...crData,
          status: crData.status as CheckRequestStatus,
          requested_by: mockUser.id, // Ensure requested_by is set for the logic
          requested_by_username: mockUserStaff.name, // And username
        });
        vi.mocked(useAuthHook.useAuth)().user = { ...mockUserStaff, id: currentCrInstance.requested_by };

        const mockShowConfirmDialog = vi.fn((_title, _message, onConfirm) => onConfirm());
        vi.mocked(useUIHook.useUI)().showConfirmDialog = mockShowConfirmDialog;

        const getRequestsMock = vi.mocked(procurementApi.getCheckRequests)
          .mockResolvedValueOnce({ // Initial: CR to be cancelled
            count: 1, next: null, previous: null, results: [currentCrInstance]
          })
          .mockResolvedValueOnce({ // After cancellation
            count: 1, next: null, previous: null, results: [
              { // Manually define CR after cancellation
                id: currentCrInstance.id,
                cr_id: currentCrInstance.cr_id,
                status: 'cancelled', // Changed
                requested_by: currentCrInstance.requested_by,
                requested_by_username: currentCrInstance.requested_by_username,
                purchase_order: currentCrInstance.purchase_order,
                purchase_order_number: currentCrInstance.purchase_order_number,
                request_date: currentCrInstance.request_date,
                amount: currentCrInstance.amount,
                currency: currentCrInstance.currency,
                payee_name: currentCrInstance.payee_name,
                reason_for_payment: currentCrInstance.reason_for_payment,
                expense_category_name: currentCrInstance.expense_category_name,
                is_urgent: currentCrInstance.is_urgent,
                created_at: currentCrInstance.created_at,
                updated_at: new Date().toISOString(), // Updated
                invoice_number: currentCrInstance.invoice_number,
                invoice_date: currentCrInstance.invoice_date,
                payee_address: currentCrInstance.payee_address,
                approved_by_accounts: null, // Reset or keep as is, depending on logic
                approved_by_accounts_username: null,
                accounts_approval_date: null,
                accounts_comments: null, // Cancellation might add a comment, but not modeled here
                payment_method: null,
                payment_date: null,
                transaction_id: null,
                payment_notes: null,
                expense_category: currentCrInstance.expense_category,
                recurring_payment: currentCrInstance.recurring_payment,
                recurring_payment_details: currentCrInstance.recurring_payment_details,
                attachments: currentCrInstance.attachments,
              } as CheckRequest
            ]
          });
        const cancelMock = vi.mocked(procurementApi.cancelCheckRequest).mockResolvedValue(undefined);

        const user = userEvent.setup();
        renderWithProviders(<CheckRequestList />);

        const cancelButton = await screen.findByRole('button', { name: /cancel request/i });
        expect(cancelButton).toBeInTheDocument();
        await user.click(cancelButton);

        await waitFor(() => expect(mockShowConfirmDialog).toHaveBeenCalled());
        await waitFor(() => expect(cancelMock).toHaveBeenCalledWith(expect.any(Function), currentCrInstance.id));
        await waitFor(() => expect(getRequestsMock).toHaveBeenCalledTimes(2));
        expect(vi.mocked(useUIHook.useUI)().showSnackbar).toHaveBeenCalledWith('Request cancelled!', 'success');
      });
    });

    it('does NOT show "Cancel Request" button for "approved" CR', async () => {
      const approvedCRForCancelTest = createCompleteCheckRequest({
         ...mockCRs[0], id: 210, cr_id: 'CR-CANCEL-APPROVED', status: 'approved'
      });
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({
        count: 1,
        next: null,
        previous: null,
        results: [approvedCRForCancelTest]
      });
      renderWithProviders(<CheckRequestList />);
      await screen.findByText('CR-CANCEL-APPROVED');
      expect(screen.queryByRole('button', { name: /cancel request/i })).not.toBeInTheDocument();
    });

    it('Cancel dialog dismissal does not call API', async () => {
        const yetAnotherPendingSubmissionCR = createCompleteCheckRequest({
          ...mockCRs[0], id: 208, cr_id: 'CR-CANCEL-SUB', status: 'pending_submission', requested_by: mockUser.id
        });
        vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
        const mockShowConfirmDialog = vi.fn((_title, _message, _onConfirm, onCancel) => { if(onCancel) onCancel(); });
        vi.mocked(useUIHook.useUI)().showConfirmDialog = mockShowConfirmDialog;

        vi.mocked(procurementApi.getCheckRequests)
          .mockResolvedValueOnce({
            count: 1,
            next: null,
            previous: null,
            results: [yetAnotherPendingSubmissionCR]
          });
        const cancelMock = vi.mocked(procurementApi.cancelCheckRequest);

        const user = userEvent.setup();
        renderWithProviders(<CheckRequestList />);

        const cancelButton = await screen.findByRole('button', { name: /cancel request/i });
        await user.click(cancelButton);

        expect(mockShowConfirmDialog).toHaveBeenCalled();
        expect(cancelMock).not.toHaveBeenCalled();
    });
  });

  describe('Selection and Print Buttons', () => {
    it('selects and deselects all CRs via header checkbox, updating print button states and labels', async () => {
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue(mockPaginatedCRsResponse);
      const user = userEvent.setup();
      renderWithProviders(<CheckRequestList />);

      const printPreviewButton = await screen.findByRole('button', { name: /Print Preview Selected/i });
      const printSelectedButton = screen.getByRole('button', { name: /Print Selected/i });

      expect(printPreviewButton).toBeDisabled();
      expect(printSelectedButton).toBeDisabled();
      expect(printPreviewButton).toHaveTextContent('Print Preview Selected (0)');
      expect(printSelectedButton).toHaveTextContent('Print Selected (0)');

      await screen.findByText(mockCRs[0].cr_id!);

      const selectAllCheckbox = screen.getByLabelText(/select all check requests/i);
      await user.click(selectAllCheckbox);
      expect(printPreviewButton).toBeEnabled();
      expect(printSelectedButton).toBeEnabled();
      expect(printPreviewButton).toHaveTextContent(`Print Preview Selected (${mockCRs.length})`);
      expect(printSelectedButton).toHaveTextContent(`Print Selected (${mockCRs.length})`);

      await user.click(selectAllCheckbox);
      expect(printPreviewButton).toBeDisabled();
      expect(printSelectedButton).toBeDisabled();
      expect(printPreviewButton).toHaveTextContent('Print Preview Selected (0)');
      expect(printSelectedButton).toHaveTextContent('Print Selected (0)');
    });

    it('selects individual CRs, updating print button states and labels', async () => {
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue(mockPaginatedCRsResponse);
      const user = userEvent.setup();
      renderWithProviders(<CheckRequestList />);

      const printPreviewButton = await screen.findByRole('button', { name: /Print Preview Selected/i });
      const printSelectedButton = screen.getByRole('button', { name: /Print Selected/i });

      const row1Checkbox = await screen.findByRole('checkbox', { name: `Select check request ${mockCRs[0].cr_id || mockCRs[0].id}` });
      const row2Checkbox = screen.getByRole('checkbox', { name: `Select check request ${mockCRs[1].cr_id || mockCRs[1].id}` });

      await user.click(row1Checkbox);
      expect(printPreviewButton).toBeEnabled();
      expect(printSelectedButton).toBeEnabled();
      expect(printPreviewButton).toHaveTextContent('Print Preview Selected (1)');
      expect(printSelectedButton).toHaveTextContent('Print Selected (1)');

      await user.click(row2Checkbox);
      expect(printPreviewButton).toHaveTextContent('Print Preview Selected (2)');
      expect(printSelectedButton).toHaveTextContent('Print Selected (2)');

      await user.click(row1Checkbox);
      expect(printPreviewButton).toHaveTextContent('Print Preview Selected (1)');
      expect(printSelectedButton).toHaveTextContent('Print Selected (1)');
      expect(printPreviewButton).toBeEnabled();
      expect(printSelectedButton).toBeEnabled();

      await user.click(row2Checkbox);
      expect(printPreviewButton).toBeDisabled();
      expect(printSelectedButton).toBeDisabled();
      expect(printPreviewButton).toHaveTextContent('Print Preview Selected (0)');
      expect(printSelectedButton).toHaveTextContent('Print Selected (0)');
    });

    it('navigates correctly for "Print Preview Selected" button when items are selected', async () => {
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue(mockPaginatedCRsResponse);
      const user = userEvent.setup();
      renderWithProviders(<CheckRequestList />);

      const row1Checkbox = await screen.findByRole('checkbox', { name: `Select check request ${mockCRs[0].cr_id || mockCRs[0].id}` });
      await user.click(row1Checkbox);

      const printPreviewButton = screen.getByRole('button', { name: /Print Preview Selected \(1\)/i });
      await user.click(printPreviewButton);

      expect(mockNavigate).toHaveBeenCalledWith('/procurement/check-requests/print-preview', {
        state: { selectedCheckRequestIds: [mockCRs[0].id], autoPrint: false },
      });
    });

    it('navigates correctly for "Print Selected" button when items are selected', async () => {
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue(mockPaginatedCRsResponse);
      const user = userEvent.setup();
      renderWithProviders(<CheckRequestList />);

      const row1Checkbox = await screen.findByRole('checkbox', { name: `Select check request ${mockCRs[0].cr_id || mockCRs[0].id}` });
      await user.click(row1Checkbox);

      const printSelectedButton = screen.getByRole('button', { name: /Print Selected \(1\)/i });
      await user.click(printSelectedButton);

      expect(mockNavigate).toHaveBeenCalledWith('/procurement/check-requests/print-preview', {
        state: { selectedCheckRequestIds: [mockCRs[0].id], autoPrint: true },
      });
    });

    it('Print buttons are disabled and do not navigate if clicked with no selection', async () => {
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue(mockPaginatedCRsResponse);
      const user = userEvent.setup();
      const { showSnackbar } = vi.mocked(useUIHook.useUI)();
      renderWithProviders(<CheckRequestList />);

      const printPreviewButton = await screen.findByRole('button', { name: /Print Preview Selected \(0\)/i });
      const printSelectedButton = screen.getByRole('button', { name: /Print Selected \(0\)/i });

      expect(printPreviewButton).toBeDisabled();
      expect(printSelectedButton).toBeDisabled();

      mockNavigate.mockClear();
      await user.click(printPreviewButton).catch(() => {});
      await user.click(printSelectedButton).catch(() => {});

      expect(showSnackbar).not.toHaveBeenCalledWith('Please select check requests to print.', 'warning');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
