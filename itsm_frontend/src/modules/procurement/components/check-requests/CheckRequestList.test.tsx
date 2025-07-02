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
import type { CheckRequest, PaginatedResponse } from '../../types';

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

const mockCRs: CheckRequest[] = [
  {
    id: 1, cr_id: 'CR-001', purchase_order: 1, purchase_order_number: 'PO-001', request_date: '2024-02-01T10:00:00Z', status: 'pending_approval', amount: "500", currency: 'USD', payee_name: 'Vendor X', requested_by_username: 'testuser', created_at: '2024-02-01T10:00:00Z', updated_at: '2024-02-01T10:00:00Z', reason_for_payment: 'Payment for PO-001', expense_category_name: 'Software', attachments: null, is_urgent: false,
  },
  {
    id: 2, cr_id: 'CR-002', purchase_order: null, purchase_order_number: null, request_date: '2024-02-05T11:00:00Z', status: 'approved', amount: "150", currency: 'USD', payee_name: 'Consultant Y', requested_by_username: 'admin', created_at: '2024-02-05T11:00:00Z', updated_at: '2024-02-05T11:00:00Z', reason_for_payment: 'Consulting services', expense_category_name: 'Services', attachments: null, is_urgent: true,
  },
];

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

const mockUser = { id: 1, name: 'Test User', role: 'admin', is_staff: true, groups: [] };

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
    const pendingSubmissionCR: CheckRequest = {
      ...mockCRs[0], id: 201, cr_id: 'CR-SUBMIT', status: 'pending_submission', requested_by: mockUser.id
    };
    const pendingApprovalCR: CheckRequest = {
      ...mockCRs[0], id: 202, cr_id: 'CR-APPROVE', status: 'pending_approval', requested_by: mockUser.id
    };
     const otherUserPendingSubmissionCR: CheckRequest = {
      ...mockCRs[0], id: 203, cr_id: 'CR-OTHER', status: 'pending_submission', requested_by: 999, requested_by_username: 'otheruser'
    };
    const mockUserStaff = { id: 1, name: 'Staff User', role: 'admin', is_staff: true, groups: [] };
    const mockUserRegular = { id: 2, name: 'Regular User', role: 'user', is_staff: false, groups: [] };

    // --- Edit Button ---
    it('shows Edit button for "pending_submission" CR if user is requester, and navigates', async () => {
      vi.mocked(useAuthHook.useAuth)().user = { ...mockUserStaff, id: pendingSubmissionCR.requested_by };
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({ count: 1, results: [pendingSubmissionCR] } as PaginatedResponse<CheckRequest>);
      const user = userEvent.setup();
      renderWithProviders(<CheckRequestList />);
      const editButton = await screen.findByRole('button', { name: /edit/i });
      expect(editButton).toBeInTheDocument();
      await user.click(editButton);
      expect(mockNavigate).toHaveBeenCalledWith(`/procurement/check-requests/edit/${pendingSubmissionCR.id}`);
    });

    it('shows Edit button for "pending_submission" CR if user is staff (not requester)', async () => {
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({ count: 1, results: [otherUserPendingSubmissionCR] } as PaginatedResponse<CheckRequest>);
      renderWithProviders(<CheckRequestList />);
      const editButton = await screen.findByRole('button', { name: /edit/i });
      expect(editButton).toBeInTheDocument();
    });

    it('does NOT show Edit button for "pending_approval" CR', async () => {
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({ count: 1, results: [pendingApprovalCR] } as PaginatedResponse<CheckRequest>);
      renderWithProviders(<CheckRequestList />);
      await screen.findByText(pendingApprovalCR.cr_id!);
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });

    it('does NOT show Edit button for "pending_submission" CR if user is not requester and not staff', async () => {
      vi.mocked(useAuthHook.useAuth)().user = mockUserRegular;
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({ count: 1, results: [otherUserPendingSubmissionCR] } as PaginatedResponse<CheckRequest>);
      renderWithProviders(<CheckRequestList />);
      await screen.findByText(otherUserPendingSubmissionCR.cr_id!);
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });

    // --- Submit for Approval Button ---
    it('shows "Submit for Approval" button for "pending_submission" CR if user is requester, and calls API', async () => {
      vi.mocked(useAuthHook.useAuth)().user = { ...mockUserStaff, id: pendingSubmissionCR.requested_by };
      const getRequestsMock = vi.mocked(procurementApi.getCheckRequests)
        .mockResolvedValueOnce({ count: 1, results: [pendingSubmissionCR] } as PaginatedResponse<CheckRequest>)
        .mockResolvedValueOnce({ count: 1, results: [{ ...pendingSubmissionCR, status: 'pending_approval' }] } as PaginatedResponse<CheckRequest>);
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
       vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({ count: 1, results: [otherUserPendingSubmissionCR] } as PaginatedResponse<CheckRequest>);
      renderWithProviders(<CheckRequestList />);
      const submitButton = await screen.findByRole('button', { name: /submit for approval/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('does NOT show "Submit for Approval" button for "pending_approval" CR', async () => {
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({ count: 1, results: [pendingApprovalCR] } as PaginatedResponse<CheckRequest>);
      renderWithProviders(<CheckRequestList />);
      await screen.findByText(pendingApprovalCR.cr_id!);
      expect(screen.queryByRole('button', { name: /submit for approval/i })).not.toBeInTheDocument();
    });

    it('does NOT show "Submit for Approval" button for "pending_submission" CR if user is not requester and not staff', async () => {
      vi.mocked(useAuthHook.useAuth)().user = mockUserRegular;
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({ count: 1, results: [otherUserPendingSubmissionCR] } as PaginatedResponse<CheckRequest>);
      renderWithProviders(<CheckRequestList />);
      await screen.findByText(otherUserPendingSubmissionCR.cr_id!);
      expect(screen.queryByRole('button', { name: /submit for approval/i })).not.toBeInTheDocument();
    });

    // --- Approve/Reject by Accounts ---
    it('handles "Approve" by accounts: shows button, opens dialog, confirms, calls API', async () => {
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
      const getRequestsMock = vi.mocked(procurementApi.getCheckRequests)
        .mockResolvedValueOnce({ count: 1, results: [pendingApprovalCR] } as PaginatedResponse<CheckRequest>)
        .mockResolvedValueOnce({ count: 1, results: [{ ...pendingApprovalCR, status: 'approved' }] } as PaginatedResponse<CheckRequest>);
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
        .mockResolvedValueOnce({ count: 1, results: [pendingApprovalCR] } as PaginatedResponse<CheckRequest>)
        .mockResolvedValueOnce({ count: 1, results: [{ ...pendingApprovalCR, status: 'rejected' }] } as PaginatedResponse<CheckRequest>);
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
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({ count: 1, results: [pendingApprovalCR] } as PaginatedResponse<CheckRequest>);
      renderWithProviders(<CheckRequestList />);
      await screen.findByText(pendingApprovalCR.cr_id!);
      expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    });

    it('does NOT show Approve/Reject buttons for "pending_submission" CR even if user is staff', async () => {
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({ count: 1, results: [pendingSubmissionCR] } as PaginatedResponse<CheckRequest>);
      renderWithProviders(<CheckRequestList />);
      await screen.findByText(pendingSubmissionCR.cr_id!);
      expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    });

    // --- Mark Payment Processing ---
    it('handles "Mark Payment Processing": shows button for approved CR if staff, calls API', async () => {
      const approvedCR: CheckRequest = { ...mockCRs[0], id: 205, cr_id: 'CR-APPROVED', status: 'approved' };
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
      const getRequestsMock = vi.mocked(procurementApi.getCheckRequests)
        .mockResolvedValueOnce({ count: 1, results: [approvedCR] } as PaginatedResponse<CheckRequest>)
        .mockResolvedValueOnce({ count: 1, results: [{ ...approvedCR, status: 'payment_processing' }] } as PaginatedResponse<CheckRequest>);
      const markProcessingMock = vi.mocked(procurementApi.markCheckRequestPaymentProcessing).mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderWithProviders(<CheckRequestList />);

      const markButton = await screen.findByRole('button', { name: /mark payment processing/i });
      expect(markButton).toBeInTheDocument();
      await user.click(markButton);

      await waitFor(() => expect(markProcessingMock).toHaveBeenCalledWith(expect.any(Function), approvedCR.id));
      await waitFor(() => expect(getRequestsMock).toHaveBeenCalledTimes(2));
      expect(vi.mocked(useUIHook.useUI)().showSnackbar).toHaveBeenCalledWith('Request marked as payment processing!', 'success');
    });

    it('does NOT show "Mark Payment Processing" button for non-approved CR', async () => {
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({ count: 1, results: [pendingApprovalCR] } as PaginatedResponse<CheckRequest>);
      renderWithProviders(<CheckRequestList />);
      await screen.findByText(pendingApprovalCR.cr_id!);
      expect(screen.queryByRole('button', { name: /mark payment processing/i })).not.toBeInTheDocument();
    });

    it('does NOT show "Mark Payment Processing" button if user is not staff', async () => {
      const approvedCR: CheckRequest = { ...mockCRs[0], id: 205, cr_id: 'CR-APPROVED', status: 'approved' };
      vi.mocked(useAuthHook.useAuth)().user = mockUserRegular;
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({ count: 1, results: [approvedCR] } as PaginatedResponse<CheckRequest>);
      renderWithProviders(<CheckRequestList />);
      await screen.findByText(approvedCR.cr_id!);
      expect(screen.queryByRole('button', { name: /mark payment processing/i })).not.toBeInTheDocument();
    });

    // --- Confirm Payment ---
    const approvedCRForPayment: CheckRequest = { ...mockCRs[0], id: 206, cr_id: 'CR-PAY-APPROVED', status: 'approved' };
    const processingCRForPayment: CheckRequest = { ...mockCRs[0], id: 207, cr_id: 'CR-PAY-PROCESSING', status: 'payment_processing' };

    // Test for "approved" status with increased timeout
    it(`handles "Confirm Payment" for "approved" CR: shows button, opens dialog, fills details, confirms, calls API`, async () => {
      const crInstance = approvedCRForPayment;
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
      const getRequestsMock = vi.mocked(procurementApi.getCheckRequests)
          .mockResolvedValueOnce({ count: 1, results: [crInstance] } as PaginatedResponse<CheckRequest>)
          .mockResolvedValueOnce({ count: 1, results: [{ ...crInstance, status: 'paid' }] } as PaginatedResponse<CheckRequest>);
        const confirmPaymentMock = vi.mocked(procurementApi.confirmCheckRequestPayment).mockResolvedValue(undefined);

        const user = userEvent.setup();
        renderWithProviders(<CheckRequestList />);

        const confirmButtonTrigger = await screen.findByRole('button', { name: /confirm payment/i });
        expect(confirmButtonTrigger).toBeInTheDocument();
        await user.click(confirmButtonTrigger);

        // Dialog interaction
        const dialogTitle = await screen.findByRole('heading', { name: /Confirm Payment/i });
        expect(dialogTitle).toBeInTheDocument();
        console.log("Confirm Payment dialog opened for approved CR");

        // Payment Method (Select)
        const paymentMethodSelect = screen.getByLabelText(/Payment Method/i);
        await user.click(paymentMethodSelect);
        const achOption = await screen.findByRole('option', { name: /ACH Transfer/i });
        console.log("ACH Option found for approved CR");
        await user.click(achOption);
        await waitFor(() => expect(paymentMethodSelect).toHaveTextContent(/ACH Transfer/i));
        console.log("Payment method selected: ACH Transfer for approved CR");

        const paymentDateInput = screen.getByLabelText(/Payment Date/i) as HTMLInputElement;
        expect(paymentDateInput.value).toBeTruthy();
        console.log("Payment date input found for approved CR, value:", paymentDateInput.value);

        const transactionIdInput = screen.getByLabelText(/Transaction ID \/ Check #/i);
        await user.type(transactionIdInput, 'ACH-TXN-12345');
        await waitFor(() => expect(transactionIdInput).toHaveValue('ACH-TXN-12345'));
        console.log("Transaction ID typed for approved CR");

        const paymentNotesInput = screen.getByLabelText(/Payment Notes/i);
        await user.type(paymentNotesInput, 'Payment processed via ACH.');
        await waitFor(() => expect(paymentNotesInput).toHaveValue('Payment processed via ACH.'));
        console.log("Payment notes typed for approved CR");

        const confirmDialogButton = screen.getByRole('button', { name: /Confirm Payment/i, hidden: false });
        console.log("Confirm dialog button found for approved CR");
        await user.click(confirmDialogButton);
        console.log("Confirm dialog button clicked for approved CR");

        const expectedPayload = {
            payment_method: 'ach',
            payment_date: paymentDateInput.value,
            transaction_id: 'ACH-TXN-12345',
            payment_notes: 'Payment processed via ACH.',
        };

        await waitFor(() => expect(confirmPaymentMock).toHaveBeenCalledWith(
          expect.any(Function),
          crInstance.id,
          expect.objectContaining(expectedPayload)
        ), { timeout: 7000 });
        console.log("confirmPaymentMock called for approved CR");

        await waitFor(() => expect(getRequestsMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
        console.log("getRequestsMock for refresh called for approved CR");

        expect(vi.mocked(useUIHook.useUI)().showSnackbar).toHaveBeenCalledWith('Payment confirmed!', 'success');
        console.log("Snackbar shown for approved CR");
    }, 20000);

    // Test for "payment_processing" status
    it(`handles "Confirm Payment" for "payment_processing" CR: shows button, opens dialog, fills details, confirms, calls API`, async () => {
      const crInstance = processingCRForPayment;
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
      const getRequestsMock = vi.mocked(procurementApi.getCheckRequests)
          .mockResolvedValueOnce({ count: 1, results: [crInstance] } as PaginatedResponse<CheckRequest>)
          .mockResolvedValueOnce({ count: 1, results: [{ ...crInstance, status: 'paid' }] } as PaginatedResponse<CheckRequest>);
      const confirmPaymentMock = vi.mocked(procurementApi.confirmCheckRequestPayment).mockResolvedValue(undefined);

      const user = userEvent.setup();
      renderWithProviders(<CheckRequestList />);

      const confirmButtonTrigger = await screen.findByRole('button', { name: /confirm payment/i });
      expect(confirmButtonTrigger).toBeInTheDocument();
      await user.click(confirmButtonTrigger);

      const dialogTitle = await screen.findByRole('heading', { name: /Confirm Payment/i });
      expect(dialogTitle).toBeInTheDocument();
      console.log("Confirm Payment dialog opened for payment_processing CR");


      const paymentMethodSelect = screen.getByLabelText(/Payment Method/i);
      await user.click(paymentMethodSelect);
      const checkOption = await screen.findByRole('option', { name: /Check/i });
      console.log("Check Option found for payment_processing CR");
      await user.click(checkOption);
      await waitFor(() => expect(paymentMethodSelect).toHaveTextContent(/Check/i));
      console.log("Payment method selected: Check for payment_processing CR");


      const paymentDateInput = screen.getByLabelText(/Payment Date/i) as HTMLInputElement;
      expect(paymentDateInput.value).toBeTruthy();
      console.log("Payment date input found for payment_processing CR, value:", paymentDateInput.value);


      const transactionIdInput = screen.getByLabelText(/Transaction ID \/ Check #/i);
      await user.type(transactionIdInput, 'CHECK-67890');
      await waitFor(() => expect(transactionIdInput).toHaveValue('CHECK-67890'));
      console.log("Transaction ID typed for payment_processing CR");

      const paymentNotesInput = screen.getByLabelText(/Payment Notes/i);
      await user.type(paymentNotesInput, 'Payment processed via Check for payment_processing.');
      await waitFor(() => expect(paymentNotesInput).toHaveValue('Payment processed via Check for payment_processing.'));
      console.log("Payment notes typed for payment_processing CR");


      const confirmDialogButton = screen.getByRole('button', { name: /Confirm Payment/i, hidden: false });
      console.log("Confirm dialog button found for payment_processing CR");
      await user.click(confirmDialogButton);
      console.log("Confirm dialog button clicked for payment_processing CR");

      const expectedPayload = {
          payment_method: 'check',
          payment_date: paymentDateInput.value,
          transaction_id: 'CHECK-67890',
          payment_notes: 'Payment processed via Check for payment_processing.',
      };

      await waitFor(() => expect(confirmPaymentMock).toHaveBeenCalledWith(
        expect.any(Function),
        crInstance.id,
        expect.objectContaining(expectedPayload)
      ), { timeout: 7000 });
      console.log("confirmPaymentMock called for payment_processing CR");

      await waitFor(() => expect(getRequestsMock).toHaveBeenCalledTimes(2), { timeout: 3000 });
      console.log("getRequestsMock for refresh called for payment_processing CR");

      expect(vi.mocked(useUIHook.useUI)().showSnackbar).toHaveBeenCalledWith('Payment confirmed!', 'success');
      console.log("Snackbar shown for payment_processing CR");
    }, 20000);

    it('does NOT show "Confirm Payment" button for "pending_approval" CR', async () => {
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({ count: 1, results: [pendingApprovalCR] } as PaginatedResponse<CheckRequest>);
      renderWithProviders(<CheckRequestList />);
      await screen.findByText(pendingApprovalCR.cr_id!);
      expect(screen.queryByRole('button', { name: /confirm payment/i })).not.toBeInTheDocument();
    });

    it('does NOT show "Confirm Payment" button if user is not staff', async () => {
      vi.mocked(useAuthHook.useAuth)().user = mockUserRegular;
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({ count: 1, results: [approvedCRForPayment] } as PaginatedResponse<CheckRequest>);
      renderWithProviders(<CheckRequestList />);
      await screen.findByText(approvedCRForPayment.cr_id!);
      expect(screen.queryByRole('button', { name: /confirm payment/i })).not.toBeInTheDocument();
    });

    // --- Cancel Request ---
    const yetAnotherPendingSubmissionCR: CheckRequest = { ...mockCRs[0], id: 208, cr_id: 'CR-CANCEL-SUB', status: 'pending_submission', requested_by: mockUser.id };
    const yetAnotherPendingApprovalCR: CheckRequest = { ...mockCRs[0], id: 209, cr_id: 'CR-CANCEL-APP', status: 'pending_approval', requested_by: mockUser.id };
    const approvedCRForCancelTest: CheckRequest = { ...mockCRs[0], id: 210, cr_id: 'CR-CANCEL-APPROVED', status: 'approved' };


    [yetAnotherPendingSubmissionCR, yetAnotherPendingApprovalCR].forEach((crInstance) => {
      it(`handles "Cancel Request" for "${crInstance.status}" CR: shows button, opens dialog, confirms, calls API`, async () => {
        vi.mocked(useAuthHook.useAuth)().user = { ...mockUserStaff, id: crInstance.requested_by }; // User is requester or staff

        const mockShowConfirmDialog = vi.fn((title, message, onConfirm) => onConfirm()); // Auto-confirm
        vi.mocked(useUIHook.useUI)().showConfirmDialog = mockShowConfirmDialog;

        const getRequestsMock = vi.mocked(procurementApi.getCheckRequests)
          .mockResolvedValueOnce({ count: 1, results: [crInstance] } as PaginatedResponse<CheckRequest>)
          .mockResolvedValueOnce({ count: 1, results: [{ ...crInstance, status: 'cancelled' }] } as PaginatedResponse<CheckRequest>);
        const cancelMock = vi.mocked(procurementApi.cancelCheckRequest).mockResolvedValue(undefined);

        const user = userEvent.setup();
        renderWithProviders(<CheckRequestList />);

        const cancelButton = await screen.findByRole('button', { name: /cancel request/i });
        expect(cancelButton).toBeInTheDocument();
        await user.click(cancelButton);

        expect(mockShowConfirmDialog).toHaveBeenCalled();
        await waitFor(() => expect(cancelMock).toHaveBeenCalledWith(expect.any(Function), crInstance.id));
        await waitFor(() => expect(getRequestsMock).toHaveBeenCalledTimes(2));
        expect(vi.mocked(useUIHook.useUI)().showSnackbar).toHaveBeenCalledWith('Request cancelled!', 'success');
      });
    });

    it('does NOT show "Cancel Request" button for "approved" CR', async () => {
      vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue({ count: 1, results: [approvedCRForCancelTest] } as PaginatedResponse<CheckRequest>);
      renderWithProviders(<CheckRequestList />);
      await screen.findByText(approvedCRForCancelTest.cr_id!);
      expect(screen.queryByRole('button', { name: /cancel request/i })).not.toBeInTheDocument();
    });

    it('Cancel dialog dismissal does not call API', async () => {
        vi.mocked(useAuthHook.useAuth)().user = mockUserStaff;
        const mockShowConfirmDialog = vi.fn((_title, _message, _onConfirm, onCancel) => { if(onCancel) onCancel(); });
        vi.mocked(useUIHook.useUI)().showConfirmDialog = mockShowConfirmDialog;

        vi.mocked(procurementApi.getCheckRequests)
          .mockResolvedValueOnce({ count: 1, results: [yetAnotherPendingSubmissionCR] } as PaginatedResponse<CheckRequest>);
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
      vi.mocked(procurementApi.getCheckRequests).mockResolvedValue(mockPaginatedCRsResponse); // 2 CRs
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

      await user.click(selectAllCheckbox); // Deselect all
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
      await user.click(printPreviewButton).catch(_e => {}); // Ignored error for disabled button click
      await user.click(printSelectedButton).catch(_e => {}); // Ignored error for disabled button click

      expect(showSnackbar).not.toHaveBeenCalledWith('Please select check requests to print.', 'warning');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
