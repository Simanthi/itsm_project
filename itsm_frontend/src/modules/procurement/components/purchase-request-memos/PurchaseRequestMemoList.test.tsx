// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
// import * as ReactRouterDom from 'react-router-dom'; // Ensure this is removed if truly unused after uncommenting
import { UIContextProvider } from '../../../../context/UIContext/UIContextProvider';
import { AuthProvider } from '../../../../context/auth/AuthContext';
import PurchaseRequestMemoList from './PurchaseRequestMemoList';
import * as procurementApi from '../../../../api/procurementApi';
import * as genericIomApi from '../../../../api/genericIomApi';
import * as useAuthHook from '../../../../context/auth/useAuth';
import * as useUIHook from '../../../../context/UIContext/useUI';
import type { PurchaseRequestMemo, PaginatedResponse } from '../../types/procurementTypes';
import type { IOMTemplate } from '../../../iomTemplateAdmin/types/iomTemplateAdminTypes';
import type { AuthUser } from '../../../../context/auth/AuthContextDefinition';
import { UIContextType } from '../../../../context/UIContext/UIContext';


// Mock API modules
vi.mock('../../../../api/procurementApi');
vi.mock('../../../../api/genericIomApi');
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

const mockAuthUser: AuthUser = { id: 1, name: 'testuser', email: 'testuser@example.com', role: 'admin', is_staff: true, groups: [] };

const mockPurchaseRequestTemplateResult: IOMTemplate = {
    id: 1,
    name: 'Purchase Request',
    description: 'Template for PRs',
    fields_definition: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by_username: 'admin',
    created_by: 1,
    is_active: true,
    approval_type: 'none',
};

const mockPurchaseRequestTemplateResponse: PaginatedResponse<IOMTemplate> = {
  count: 1,
  next: null,
  previous: null,
  results: [mockPurchaseRequestTemplateResult]
};


const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <UIContextProvider>{ui}</UIContextProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

const mockMemos: PurchaseRequestMemo[] = [
  {
    id: 1, iom_id: 'IOM-001', item_description: 'Laptop Pro', priority: 'high', department: 1, department_name: 'IT',
    requested_by: 1, requested_by_username: 'jdoe', request_date: '2024-01-15T10:00:00Z', status: 'pending', estimated_cost: 1500,
    reason: 'Need new laptop', quantity: 1, project: null, project_name: null, required_delivery_date: null, suggested_vendor: null, suggested_vendor_name: null, attachments: null, approver: null, approver_username: null, decision_date: null, approver_comments: null, created_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 2, iom_id: 'IOM-002', item_description: 'Office Chairs', priority: 'medium', department: 2, department_name: 'HR',
    requested_by: 2, requested_by_username: 'asmith', request_date: '2024-01-16T11:00:00Z', status: 'approved', estimated_cost: 300,
    reason: 'New hires', quantity: 2, project: null, project_name: null, required_delivery_date: null, suggested_vendor: null, suggested_vendor_name: null, attachments: null, approver: 1, approver_username: 'admin', decision_date: '2024-01-17T10:00:00Z', approver_comments: 'Approved', created_at: '2024-01-16T11:00:00Z', updated_at: '2024-01-17T10:00:00Z',
  },
];

const mockPaginatedMemosResponse: PaginatedResponse<PurchaseRequestMemo> = {
  count: mockMemos.length,
  next: null,
  previous: null,
  results: mockMemos,
};

const mockEmptyMemosResponse: PaginatedResponse<PurchaseRequestMemo> = {
  count: 0,
  next: null,
  previous: null,
  results: [],
};

let mockShowSnackbar: ReturnType<typeof vi.fn>;
let mockShowConfirmDialog: ReturnType<typeof vi.fn>;
let mockHideConfirmDialog: ReturnType<typeof vi.fn>;
let mockHideSnackbar: ReturnType<typeof vi.fn>;

describe('PurchaseRequestMemoList', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      token: 'mockToken',
      user: mockAuthUser,
      authenticatedFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      isAuthenticated: true,
    });

    mockShowSnackbar = vi.fn();
    mockShowConfirmDialog = vi.fn();
    mockHideConfirmDialog = vi.fn();
    mockHideSnackbar = vi.fn();

    vi.mocked(useUIHook.useUI).mockReturnValue({
      showSnackbar: mockShowSnackbar,
      showConfirmDialog: mockShowConfirmDialog,
      hideConfirmDialog: mockHideConfirmDialog,
      confirmDialogOpen: false,
      confirmDialogTitle: '',
      confirmDialogMessage: '',
      confirmDialogOnConfirm: vi.fn(),
      confirmDialogOnCancel: undefined,
      snackbarOpen: false,
      snackbarMessage: '',
      snackbarSeverity: 'info',
      hideSnackbar: mockHideSnackbar,
    } as UIContextType); // Added 'as UIContextType' for clarity

    vi.mocked(genericIomApi.getIomTemplates).mockResolvedValue(mockPurchaseRequestTemplateResponse);
    vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue(mockPaginatedMemosResponse);
  });

  afterEach(() => {
    // server.close(); // If using MSW
  });

  it('renders the main title and create button', async () => {
    renderWithProviders(<PurchaseRequestMemoList />);
    expect(screen.getByRole('heading', { name: /Purchase Request Memos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create New Purchase Request Memo/i })).toBeInTheDocument();
  });

  it('renders table headers correctly', async () => {
    renderWithProviders(<PurchaseRequestMemoList />);
    await waitFor(() => expect(procurementApi.getPurchaseRequestMemos).toHaveBeenCalledTimes(1));
    expect(screen.getByText('IOM ID')).toBeInTheDocument();
    expect(screen.getByText('Item Description')).toBeInTheDocument();
    expect(screen.getByText('Department')).toBeInTheDocument();
    expect(screen.getByText('Requested By')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Request Date')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('displays memos in the table', async () => {
    renderWithProviders(<PurchaseRequestMemoList />);
    await waitFor(() => {
      expect(screen.getByText(mockMemos[0].iom_id!)).toBeInTheDocument();
      expect(screen.getByText(mockMemos[0].item_description)).toBeInTheDocument();
      expect(screen.getByText(mockMemos[1].iom_id!)).toBeInTheDocument();
      expect(screen.getByText(mockMemos[1].item_description)).toBeInTheDocument();
    });
  });

  it('displays "No purchase request memos found." when no memos are available', async () => {
    vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue(mockEmptyMemosResponse);
    renderWithProviders(<PurchaseRequestMemoList />);
    await waitFor(() => {
      expect(screen.getByText('No purchase request memos found.')).toBeInTheDocument();
    });
  });

  it('navigates to create new memo form when "Create New Purchase Request Memo" is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PurchaseRequestMemoList />);
    const createButton = screen.getByRole('button', { name: /Create New Purchase Request Memo/i });
    await user.click(createButton);
    expect(mockNavigate).toHaveBeenCalledWith('/procurement/purchase-request-memos/new', { state: { templateId: mockPurchaseRequestTemplateResult.id } });
  });

  it('shows error if fetching template fails', async () => {
    vi.mocked(genericIomApi.getIomTemplates).mockRejectedValueOnce(new Error("Template fetch error"));
    renderWithProviders(<PurchaseRequestMemoList />);
    expect(await screen.findByText(/Error fetching purchase request template/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create New Purchase Request Memo/i })).not.toBeInTheDocument();
  });

  it('navigates to view memo details when view icon is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PurchaseRequestMemoList />);
    const viewButtons = await screen.findAllByTestId(`view-memo-${mockMemos[0].id}`);
    expect(viewButtons[0]).toBeInTheDocument();
    await user.click(viewButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith(`/procurement/purchase-request-memos/view/${mockMemos[0].id}`);
  });

  it('navigates to edit memo when edit icon is clicked for editable memo', async () => {
    const user = userEvent.setup();
    const editableMemo = { ...mockMemos[0], status: 'pending' as const, requested_by: mockAuthUser.id };
    vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValueOnce({ ...mockPaginatedMemosResponse, results: [editableMemo] });
    renderWithProviders(<PurchaseRequestMemoList />);

    const editButton = await screen.findByTestId(`edit-memo-${editableMemo.id}`);
    expect(editButton).toBeInTheDocument();
    await user.click(editButton);
    expect(mockNavigate).toHaveBeenCalledWith(`/procurement/purchase-request-memos/edit/${editableMemo.id}`);
  });

  it('does not show edit icon for non-editable memo (e.g. approved)', async () => {
    const nonEditableMemo = { ...mockMemos[1], status: 'approved' as const };
     vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValueOnce({ ...mockPaginatedMemosResponse, results: [nonEditableMemo] });
    renderWithProviders(<PurchaseRequestMemoList />);
    await screen.findByText(nonEditableMemo.iom_id!);
    expect(screen.queryByTestId(`edit-memo-${nonEditableMemo.id}`)).not.toBeInTheDocument();
  });


  it('handles memo deletion successfully', async () => {
    const user = userEvent.setup();
    const memoToDelete = { ...mockMemos[0], status: 'pending' as const, requested_by: mockAuthUser.id };
    vi.mocked(procurementApi.getPurchaseRequestMemos)
        .mockResolvedValueOnce({ ...mockPaginatedMemosResponse, results: [memoToDelete] })
        .mockResolvedValueOnce(mockEmptyMemosResponse); // After deletion

    vi.mocked(procurementApi.deletePurchaseRequestMemo).mockResolvedValue(undefined); // Simulate successful deletion

    // Ensure showConfirmDialog calls onConfirm
    mockShowConfirmDialog.mockImplementation((_title, _message, onConfirm) => {
        if (onConfirm) onConfirm();
    });

    renderWithProviders(<PurchaseRequestMemoList />);

    const deleteButton = await screen.findByTestId(`delete-memo-${memoToDelete.id}`);
    await user.click(deleteButton);

    expect(mockShowConfirmDialog).toHaveBeenCalled();
    await waitFor(() => expect(procurementApi.deletePurchaseRequestMemo).toHaveBeenCalledWith(expect.any(Function), memoToDelete.id));
    await waitFor(() => expect(mockShowSnackbar).toHaveBeenCalledWith('Purchase request memo deleted successfully!', 'success'));
    await waitFor(() => expect(procurementApi.getPurchaseRequestMemos).toHaveBeenCalledTimes(2)); // Initial fetch + refresh
  });

  it('handles memo deletion failure', async () => {
    const user = userEvent.setup();
    const memoToDelete = { ...mockMemos[0], status: 'pending' as const, requested_by: mockAuthUser.id };
    vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValueOnce({ ...mockPaginatedMemosResponse, results: [memoToDelete] });
    vi.mocked(procurementApi.deletePurchaseRequestMemo).mockRejectedValueOnce(new Error("Deletion failed"));

    mockShowConfirmDialog.mockImplementation((_title, _message, onConfirm) => {
        if (onConfirm) onConfirm();
    });

    renderWithProviders(<PurchaseRequestMemoList />);

    const deleteButton = await screen.findByTestId(`delete-memo-${memoToDelete.id}`);
    await user.click(deleteButton);

    expect(mockShowConfirmDialog).toHaveBeenCalled();
    await waitFor(() => expect(procurementApi.deletePurchaseRequestMemo).toHaveBeenCalledWith(expect.any(Function), memoToDelete.id));
    await waitFor(() => expect(mockShowSnackbar).toHaveBeenCalledWith('Failed to delete purchase request memo. Error: Deletion failed', 'error'));
    expect(procurementApi.getPurchaseRequestMemos).toHaveBeenCalledTimes(1); // No refresh on failure
  });

  it('handles "Approve" action successfully', async () => {
    const user = userEvent.setup();
    const memoToApprove = { ...mockMemos[0], status: 'pending' as const };
    vi.mocked(procurementApi.getPurchaseRequestMemos)
        .mockResolvedValueOnce({ ...mockPaginatedMemosResponse, results: [memoToApprove] })
        .mockResolvedValueOnce({ ...mockPaginatedMemosResponse, results: [{...memoToApprove, status: 'approved'}] });

    vi.mocked(procurementApi.decidePurchaseRequestMemo).mockResolvedValue({ ...memoToApprove, status: 'approved' });

    mockShowConfirmDialog.mockImplementation((_title, _message, onConfirm) => {
      if (onConfirm) onConfirm(); // Simulate user confirming in the dialog
    });

    renderWithProviders(<PurchaseRequestMemoList />);

    const approveButton = await screen.findByTestId(`approve-memo-${memoToApprove.id}`);
    await user.click(approveButton);

    // Check that the confirmation dialog was shown
    expect(mockShowConfirmDialog).toHaveBeenCalledWith(
      "Approve Purchase Request Memo",
      `Are you sure you want to approve IOM "${memoToApprove.iom_id}"?`,
      expect.any(Function), // onConfirm
      expect.any(Function)  // onCancel
    );

    // Check that the API was called
    await waitFor(() => expect(procurementApi.decidePurchaseRequestMemo).toHaveBeenCalledWith(
      expect.any(Function),
      memoToApprove.id,
      { decision: 'approved', comments: 'Approved by admin' } // Default comment
    ));

    // Check for success message and data refresh
    await waitFor(() => expect(mockShowSnackbar).toHaveBeenCalledWith('Purchase request memo IOM-001 approved successfully!', 'success'));
    await waitFor(() => expect(procurementApi.getPurchaseRequestMemos).toHaveBeenCalledTimes(2));
  });


  it('handles "Reject" action successfully with comments', async () => {
    const user = userEvent.setup();
    const memoToReject = { ...mockMemos[0], status: 'pending' as const };
     vi.mocked(procurementApi.getPurchaseRequestMemos)
        .mockResolvedValueOnce({ ...mockPaginatedMemosResponse, results: [memoToReject] })
        .mockResolvedValueOnce({ ...mockPaginatedMemosResponse, results: [{...memoToReject, status: 'rejected'}] });

    vi.mocked(procurementApi.decidePurchaseRequestMemo).mockResolvedValue({ ...memoToReject, status: 'rejected' });

    // Simulate user entering comments and confirming
    mockShowConfirmDialog.mockImplementation((_title, _message, onConfirm) => {
        // Simulate the dialog where comments are entered and then confirmed.
        // For this test, we assume comments are handled by the dialog component itself,
        // and onConfirm is called. The actual comment value is passed in the component logic.
        if (onConfirm) onConfirm();
    });

    // Mock the actual component's behavior of getting comments (if needed)
    // This might involve mocking a global prompt or a specific dialog component's return value
    // For simplicity, we'll assume the component correctly passes 'Rejected by admin - Test comment'
    // This test focuses on the flow after comment input.

    renderWithProviders(<PurchaseRequestMemoList />);

    const rejectButton = await screen.findByTestId(`reject-memo-${memoToReject.id}`);
    await user.click(rejectButton); // This should trigger the dialog

    // In the actual component, handleReject would likely call showConfirmDialog with a way to input comments.
    // We'll assume the component's logic correctly forms the payload.
    // The key is that `decidePurchaseRequestMemo` is called with rejection and comments.

    expect(mockShowConfirmDialog).toHaveBeenCalledWith(
      "Reject Purchase Request Memo",
      expect.stringContaining(`Are you sure you want to reject IOM "${memoToReject.iom_id}"?`),
      expect.any(Function),
      expect.any(Function),
      true // isRejectAction
    );

    // Simulate that the onConfirm from the dialog (which includes comment input) is called.
    // The actual call to decidePurchaseRequestMemo with comments happens inside handleDecision.
    // We need to ensure that handleDecision is triggered correctly.
    // The test setup for handleDecision within the component would be more complex.
    // For now, let's verify the API call assuming the dialog flow works and provides comments.
    // The component might call `handleDecision(memoToReject.id, 'rejected', 'Test comment from dialog');`
    // We need to ensure the mock for `decidePurchaseRequestMemo` is checked with appropriate comments.
    // The current `handleReject` in component calls `handleDecision(memoId, 'rejected', comments);`
    // The dialog needs to provide these comments.

    // This test needs to be more integrated if we want to test the comment input part.
    // For now, let's assume the component passes a default or specific comment.
    // The component's `handleReject` calls `handleDecision(memoId, 'rejected', comments)`
    // The `showConfirmDialog` for rejection in the component is:
    // showConfirmDialog('Reject Purchase Request Memo', `Are you sure you want to reject IOM "${memo.iom_id}"? This action cannot be undone. Please provide a reason for rejection.`,
    // (comments) => handleDecision(memo.id, 'rejected', comments || 'Rejected by admin'), () => {}, true);
    // So, if onConfirm is called with no comments, it defaults.
    // Our mockShowConfirmDialog currently doesn't pass comments to onConfirm.

    // Let's adjust mockShowConfirmDialog for this specific test to simulate comment input
    mockShowConfirmDialog.mockImplementation((_title, _message, onConfirm) => {
        if (onConfirm) (onConfirm as (comments?: string) => void)('Test reject reason');
    });
    await user.click(rejectButton); // Re-click to trigger with new mock

    await waitFor(() => expect(procurementApi.decidePurchaseRequestMemo).toHaveBeenCalledWith(
      expect.any(Function),
      memoToReject.id,
      { decision: 'rejected', comments: 'Test reject reason' }
    ));

    await waitFor(() => expect(mockShowSnackbar).toHaveBeenCalledWith('Purchase request memo IOM-001 rejected successfully!', 'success'));
    await waitFor(() => expect(procurementApi.getPurchaseRequestMemos).toHaveBeenCalledTimes(2)); // Assuming refresh
  });

  it('selects and deselects all memos via header checkbox, updating print button states and labels', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PurchaseRequestMemoList />);

    const printPreviewButton = await screen.findByRole('button', { name: /Print Preview Selected/i });
    const printSelectedButton = screen.getByRole('button', { name: /Print Selected/i });

    expect(printPreviewButton).toBeDisabled();
    expect(printSelectedButton).toBeDisabled();
    expect(printPreviewButton).toHaveTextContent('Print Preview Selected (0)');
    expect(printSelectedButton).toHaveTextContent('Print Selected (0)');

    await screen.findByText(mockMemos[0].iom_id!); // Wait for table rows

    const selectAllCheckbox = screen.getByLabelText(/select all purchase request memos/i);
    await user.click(selectAllCheckbox);

    expect(printPreviewButton).toBeEnabled();
    expect(printSelectedButton).toBeEnabled();
    expect(printPreviewButton).toHaveTextContent(`Print Preview Selected (${mockMemos.length})`);
    expect(printSelectedButton).toHaveTextContent(`Print Selected (${mockMemos.length})`);

    await user.click(selectAllCheckbox); // Deselect all

    expect(printPreviewButton).toBeDisabled();
    expect(printSelectedButton).toBeDisabled();
    expect(printPreviewButton).toHaveTextContent('Print Preview Selected (0)');
    expect(printSelectedButton).toHaveTextContent('Print Selected (0)');
  });

  it('navigates correctly for "Print Preview Selected" button when items are selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PurchaseRequestMemoList />);
    await screen.findByText(mockMemos[0].iom_id!);

    const row1Checkbox = screen.getByRole('checkbox', { name: `Select purchase request memo ${mockMemos[0].iom_id}` });
    await user.click(row1Checkbox);

    const printPreviewButton = screen.getByRole('button', { name: /Print Preview Selected \(1\)/i });
    await user.click(printPreviewButton);

    expect(mockNavigate).toHaveBeenCalledWith('/procurement/purchase-request-memos/print-preview', {
      state: { selectedMemoIds: [mockMemos[0].id], autoPrint: false },
    });
  });
});
