// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { UIContextProvider } from '../../../../context/UIContext/UIContextProvider';
import { AuthProvider } from '../../../../context/auth/AuthContext';
import PurchaseRequestMemoList from './PurchaseRequestMemoList';
import * as procurementApi from '../../../../api/procurementApi';
import * as genericIomApi from '../../../../api/genericIomApi';
import * as useAuthHook from '../../../../context/auth/useAuth';
import * as useUIHook from '../../../../context/UIContext/useUI';
import type { PurchaseRequestMemo, PaginatedResponse, PurchaseRequestStatus } from '../../types/procurementTypes';
import type { IOMTemplate } from '../../../iomTemplateAdmin/types/iomTemplateAdminTypes';


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

const mockPurchaseRequestTemplate: PaginatedResponse<IOMTemplate> = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
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
    }
  ]
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

const помошникСозданияЗавершенногоМеморандумаОЗакупке = (данныеМеморандума: Partial<PurchaseRequestMemo>): PurchaseRequestMemo => {
  const стандартныеЗначенияМемо: PurchaseRequestMemo = {
    id: 0,
    item_description: "Стандартный Элемент",
    quantity: 1,
    reason: "Стандартная Причина",
    estimated_cost: null,
    requested_by: 0,
    requested_by_username: "стандартныйПользовательМемо",
    request_date: "2024-01-01T00:00:00.000Z", // Fixed date
    status: 'pending',
    approver: null,
    approver_username: null,
    decision_date: null,
    approver_comments: null,
    iom_id: null,
    department: null,
    department_name: null,
    project: null,
    project_name: null,
    priority: 'medium',
    required_delivery_date: null,
    suggested_vendor: null,
    suggested_vendor_name: null,
    attachments: null,
    created_at: "2024-01-01T00:00:00.000Z", // Fixed date
    updated_at: "2024-01-01T00:00:00.000Z", // Fixed date
  };
  return { ...стандартныеЗначенияМемо, ...данныеМеморандума };
};

// Re-aliasing for clarity in tests
const createCompletePurchaseRequestMemo = помошникСозданияЗавершенногоМеморандумаОЗакупке;


const mockMemo0_base = createCompletePurchaseRequestMemo({
  id: 1, iom_id: 'IOM-001', item_description: 'Laptop Pro', priority: 'high', department: 1, department_name: 'IT',
  requested_by: 1, requested_by_username: 'jdoe', request_date: '2024-01-15T10:00:00Z', status: 'pending', estimated_cost: 1500,
  reason: 'Need new laptop', quantity: 1, created_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T10:00:00Z',
});

const mockMemo1_base = createCompletePurchaseRequestMemo({
  id: 2, iom_id: 'IOM-002', item_description: 'Office Chairs', priority: 'medium', department: 2, department_name: 'HR',
  requested_by: 2, requested_by_username: 'asmith', request_date: '2024-01-16T11:00:00Z', status: 'approved', estimated_cost: 300,
  reason: 'New hires', quantity: 2, approver: 1, approver_username: 'admin', decision_date: '2024-01-17T10:00:00Z', approver_comments: 'Approved',
  created_at: '2024-01-16T11:00:00Z', updated_at: '2024-01-17T10:00:00Z',
});


const mockMemos: PurchaseRequestMemo[] = [mockMemo0_base, mockMemo1_base];

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


describe('PurchaseRequestMemoList', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      token: 'mockToken',
      user: { id: 1, name: 'testuser', email: 'testuser@example.com', role: 'admin', is_staff: true, groups: [] },
      authenticatedFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      isAuthenticated: true,
    });

    vi.mocked(genericIomApi.getIomTemplates).mockResolvedValue(mockPurchaseRequestTemplate);

    vi.mocked(useUIHook.useUI).mockReturnValue({
      showSnackbar: vi.fn(),
      showConfirmDialog: vi.fn(),
      hideConfirmDialog: vi.fn(),
      confirmDialogOpen: false,
      confirmDialogTitle: '',
      confirmDialogMessage: '',
      confirmDialogOnConfirm: vi.fn(),
      confirmDialogOnCancel: undefined,
      snackbarOpen: false,
      snackbarMessage: '',
      snackbarSeverity: 'info',
      hideSnackbar: vi.fn(),
    });
  });

  afterEach(() => {
    // server.close();
  });

  it('renders the main title and create button', async () => {
    vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue(mockEmptyMemosResponse);
    renderWithProviders(<PurchaseRequestMemoList />);
    expect(screen.getByRole('heading', { name: /Internal Office Memo/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create New Request/i })).toBeEnabled();
    });
  });

  it('renders table headers correctly', async () => {
    vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue(mockEmptyMemosResponse);
    renderWithProviders(<PurchaseRequestMemoList />);
    await waitFor(() => {
      expect(screen.getByText('IOM ID')).toBeInTheDocument();
    });
    expect(screen.getByText('Item Description')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Department')).toBeInTheDocument();
    expect(screen.getByText('Requested By')).toBeInTheDocument();
    expect(screen.getByText('Request Date')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Est. Cost')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('displays memos in the table', async () => {
    vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue(mockPaginatedMemosResponse);
    renderWithProviders(<PurchaseRequestMemoList />);
    await waitFor(() => {
      expect(screen.getByText(mockMemos[0].iom_id as string)).toBeInTheDocument();
      expect(screen.getByText(mockMemos[0].item_description)).toBeInTheDocument();
      expect(screen.getByText(mockMemos[1].iom_id as string)).toBeInTheDocument();
      expect(screen.getByText(mockMemos[1].item_description)).toBeInTheDocument();
    });
  });

  it('displays "No purchase requests found." when no memos are available', async () => {
    vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue(mockEmptyMemosResponse);
    renderWithProviders(<PurchaseRequestMemoList />);
    await waitFor(() => {
      expect(screen.getByText('No purchase requests found.')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', async () => {
    vi.mocked(procurementApi.getPurchaseRequestMemos).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve(mockPaginatedMemosResponse), 100))
    );
    renderWithProviders(<PurchaseRequestMemoList />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('handles error when fetching memos fails', async () => {
    vi.mocked(procurementApi.getPurchaseRequestMemos).mockRejectedValueOnce(new Error('API Error Fetching Memos'));
    renderWithProviders(<PurchaseRequestMemoList />);
    expect(await screen.findByText(/API Error Fetching Memos/i)).toBeInTheDocument();
  });

  it('navigates to create new IOM form when "Create New Request" is clicked', async () => {
    vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue(mockEmptyMemosResponse);
    const user = userEvent.setup();
    renderWithProviders(<PurchaseRequestMemoList />);
    const createButton = await screen.findByRole('button', { name: /Create New Request/i });
    await waitFor(() => expect(createButton).toBeEnabled());

    await user.click(createButton);
    expect(mockNavigate).toHaveBeenCalledWith(`/ioms/new/form/${mockPurchaseRequestTemplate.results[0].id}`);
  });

  it('navigates to view memo details when view icon is clicked', async () => {
    vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue(mockPaginatedMemosResponse);
    const user = userEvent.setup();
    renderWithProviders(<PurchaseRequestMemoList />);
    const viewButtons = await screen.findAllByRole('button', { name: /view details/i });
    expect(viewButtons[0]).toBeInTheDocument();
    await user.click(viewButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith(`/procurement/iom/view/${mockMemos[0].id}`);
  });

  it('calls getPurchaseRequestMemos with correct sort parameters when column headers are clicked', async () => {
    const mockGetMemosSort = vi.mocked(procurementApi.getPurchaseRequestMemos)
      .mockResolvedValue(mockPaginatedMemosResponse);

    const user = userEvent.setup();
    renderWithProviders(<PurchaseRequestMemoList />);

    await waitFor(() => expect(genericIomApi.getIomTemplates).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockGetMemosSort).toHaveBeenCalledTimes(1));
    expect(mockGetMemosSort).toHaveBeenNthCalledWith(1, expect.any(Function), expect.objectContaining({ ordering: '-request_date'}));

    await screen.findByText(mockMemos[0].iom_id as string);

    const iomIdHeaderButton = screen.getByRole('button', { name: /IOM ID/i });
    await user.click(iomIdHeaderButton);
    await waitFor(() => {
      expect(procurementApi.getPurchaseRequestMemos).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ ordering: 'iom_id' })
      );
    });

    await user.click(iomIdHeaderButton);
    await waitFor(() => {
      expect(procurementApi.getPurchaseRequestMemos).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ ordering: '-iom_id' })
      );
    });

    const itemDescriptionHeaderButton = screen.getByRole('button', { name: /Item Description/i });
    await user.click(itemDescriptionHeaderButton);
    await waitFor(() => {
      expect(procurementApi.getPurchaseRequestMemos).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ ordering: 'item_description' })
      );
    });
    await user.click(itemDescriptionHeaderButton);
    await waitFor(() => {
      expect(procurementApi.getPurchaseRequestMemos).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ ordering: '-item_description' })
      );
    });

    const priorityHeaderButton = screen.getByRole('button', { name: /Priority/i });
    await user.click(priorityHeaderButton);
    await waitFor(() => {
      expect(procurementApi.getPurchaseRequestMemos).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ ordering: 'priority' })
      );
    });
  });

  it('calls getPurchaseRequestMemos with correct pagination parameters', async () => {
    const user = userEvent.setup();

    const moreMemos: PurchaseRequestMemo[] = Array.from({ length: 25 }, (_, i) => ({
      ...mockMemos[0],
      id: i + 1,
      iom_id: `IOM-${String(i + 1).padStart(3, '0')}`,
      item_description: `Test Item ${i + 1}`,
      priority: mockMemos[0].priority || 'medium',
      department: mockMemos[0].department || 1,
      department_name: mockMemos[0].department_name || 'Test Dept',
      requested_by: mockMemos[0].requested_by || 1,
      requested_by_username: mockMemos[0].requested_by_username || 'tester',
      request_date: mockMemos[0].request_date || new Date().toISOString(),
      status: mockMemos[0].status || 'pending',
      estimated_cost: mockMemos[0].estimated_cost || 100,
    }));

    const initialResponseForPaginationTest: PaginatedResponse<PurchaseRequestMemo> = {
      count: moreMemos.length,
      next: 'http://test/api/memos?page=2&pageSize=10',
      previous: null,
      results: moreMemos.slice(0, 10),
    };

    const responseFor5RPP_Page1: PaginatedResponse<PurchaseRequestMemo> = {
      count: moreMemos.length,
      next: 'http://test/api/memos?page=2&pageSize=5',
      previous: null,
      results: moreMemos.slice(0, 5),
    };

    const responseFor5RPP_Page2: PaginatedResponse<PurchaseRequestMemo> = {
        count: moreMemos.length,
        next: 'http://test/api/memos?page=3&pageSize=5',
        previous: 'http://test/api/memos?page=1&pageSize=5',
        results: moreMemos.slice(5, 10),
    };

    const mockGetMemos = vi.mocked(procurementApi.getPurchaseRequestMemos)
        .mockResolvedValueOnce(initialResponseForPaginationTest)
        .mockResolvedValueOnce(responseFor5RPP_Page1)
        .mockResolvedValueOnce(responseFor5RPP_Page2);

    renderWithProviders(<PurchaseRequestMemoList />);

    await waitFor(() => expect(genericIomApi.getIomTemplates).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockGetMemos).toHaveBeenCalledTimes(1));
    expect(mockGetMemos).toHaveBeenNthCalledWith(
      1,
      expect.any(Function),
      expect.objectContaining({ page: 1, pageSize: 10, ordering: '-request_date' })
    );
    await screen.findByText('IOM-001');
    expect(screen.getByText('1–10 of 25')).toBeInTheDocument();

    const rowsPerPageSelectFor5 = screen.getByLabelText(/Rows per page:/i);
    await user.click(rowsPerPageSelectFor5);
    const option5 = await screen.findByRole('option', { name: '5' });
    await user.click(option5);

    await waitFor(() => expect(mockGetMemos).toHaveBeenCalledTimes(2));
    expect(mockGetMemos).toHaveBeenNthCalledWith(
      2,
      expect.any(Function),
      expect.objectContaining({ page: 1, pageSize: 5, ordering: '-request_date' })
    );
    await screen.findByText('IOM-001');
    expect(screen.queryByText('IOM-006')).not.toBeInTheDocument();
    expect(screen.getByText('1–5 of 25')).toBeInTheDocument();

    const nextPageButton = screen.getByRole('button', { name: /Go to next page/i });
    expect(nextPageButton).toBeEnabled();
    await user.click(nextPageButton);

    await waitFor(() => expect(mockGetMemos).toHaveBeenCalledTimes(3));
    expect(mockGetMemos).toHaveBeenNthCalledWith(
      3,
      expect.any(Function),
      expect.objectContaining({ page: 2, pageSize: 5, ordering: '-request_date' })
    );
    await screen.findByText('IOM-006');
    expect(screen.getByText('6–10 of 25')).toBeInTheDocument();
  });

  describe('Action Buttons', () => {
    // Define mockUserStaff and mockUserRegular first as they are used in other mock object definitions
    const mockUserStaff = { id: 1, name: 'testuser', email: 'teststaff@example.com', role: 'admin', is_staff: true, groups: [] };
    const mockUserRegular = { id: 2, name: 'regularJoe', email: 'regular@example.com', role: 'user', is_staff: false, groups: [] };

    const pendingMemoIsRequester = createCompletePurchaseRequestMemo({
      // Explicit definition, not spreading mockMemos[0] directly if it causes issues
      id: 101, iom_id: 'IOM-101', item_description: 'Laptop for Requester', priority: 'high',
      department: 1, department_name: 'IT', requested_by: 1, requested_by_username: 'testuser',
      request_date: '2024-03-01T10:00:00Z', status: 'pending', estimated_cost: 1200,
      reason: 'Requester needs laptop', quantity: 1, created_at: '2024-03-01T10:00:00Z', updated_at: '2024-03-01T10:00:00Z',
    });

    const pendingMemoNotRequester = createCompletePurchaseRequestMemo({
        id: 102, iom_id: 'IOM-102', item_description: 'Laptop for Other', priority: 'medium',
        department: 1, department_name: 'IT', requested_by: 99, requested_by_username: 'otheruser',
        request_date: '2024-03-02T10:00:00Z', status: 'pending', estimated_cost: 1300,
        reason: 'Other user needs laptop', quantity: 1, created_at: '2024-03-02T10:00:00Z', updated_at: '2024-03-02T10:00:00Z',
    });

    const approvedMemo = createCompletePurchaseRequestMemo({
      id: 103, iom_id: 'IOM-103', item_description: 'Approved Item', priority: 'low',
      department: 2, department_name: 'HR', requested_by: 1, requested_by_username: 'testuser', // Assuming testuser (staff) is the requester for this approved memo
      request_date: '2024-03-03T10:00:00Z', status: 'approved', estimated_cost: 200,
      reason: 'Approved reason', quantity: 3, approver: mockUserStaff.id, approver_username: mockUserStaff.name,
      decision_date: '2024-03-04T10:00:00Z', approver_comments: 'Looks good',
      created_at: '2024-03-03T10:00:00Z', updated_at: '2024-03-04T10:00:00Z',
    });


    it('shows Edit button for pending memo if user is requester, and navigates on click', async () => {
      vi.mocked(useAuthHook.useAuth).mockReturnValue({
        ...vi.mocked(useAuthHook.useAuth)(),
        user: { ...mockUserStaff, id: pendingMemoIsRequester.requested_by }, // Ensure user matches memo's requester
        isAuthenticated: true,
      });

      const explicitPendingMemoIsRequester: PurchaseRequestMemo = {
        id: 101, iom_id: 'IOM-101', item_description: 'Laptop for Requester', priority: 'high',
        department: 1, department_name: 'IT', requested_by: 1, requested_by_username: 'testuser',
        request_date: '2024-03-01T10:00:00Z', status: 'pending', estimated_cost: 1200,
        reason: 'Requester needs laptop', quantity: 1, created_at: '2024-03-01T10:00:00Z', updated_at: '2024-03-01T10:00:00Z',
        approver: null, approver_username: null, decision_date: null, approver_comments: null,
        project: null, project_name: null, required_delivery_date: null, suggested_vendor: null,
        suggested_vendor_name: null, attachments: null,
      };

      vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue({
        count: 1, next: null, previous: null,
        results: [explicitPendingMemoIsRequester],
      });
      const user = userEvent.setup();
      renderWithProviders(<PurchaseRequestMemoList />);

      const editButton = await screen.findByRole('button', { name: /edit memo/i });
      expect(editButton).toBeInTheDocument();
      await user.click(editButton);
      expect(mockNavigate).toHaveBeenCalledWith(`/procurement/iom/edit/${pendingMemoIsRequester.id}`);
    });

    it('shows Edit button for pending memo if user is staff (not requester), and navigates on click', async () => {
        vi.mocked(useAuthHook.useAuth).mockReturnValue({
            ...vi.mocked(useAuthHook.useAuth)(),
            user: mockUserStaff,
            isAuthenticated: true,
        });
        vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue({
            count: 1, next: null, previous: null, results: [pendingMemoNotRequester],
        });
        const user = userEvent.setup();
        renderWithProviders(<PurchaseRequestMemoList />);

        const editButton = await screen.findByRole('button', { name: /edit memo/i });
        expect(editButton).toBeInTheDocument();
        await user.click(editButton);
        expect(mockNavigate).toHaveBeenCalledWith(`/procurement/iom/edit/${pendingMemoNotRequester.id}`);
    });


    it('does NOT show Edit button for non-pending memo', async () => {
      vi.mocked(useAuthHook.useAuth).mockReturnValue({
        ...vi.mocked(useAuthHook.useAuth)(),
        user: mockUserStaff,
        isAuthenticated: true,
      });
      vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue({
        count: 1, next: null, previous: null, results: [approvedMemo],
      });
      renderWithProviders(<PurchaseRequestMemoList />);

      await screen.findByText(approvedMemo.iom_id as string);
      const editButton = screen.queryByRole('button', { name: /edit memo/i });
      expect(editButton).not.toBeInTheDocument();
    });

    it('does NOT show Edit button if user is not requester and not staff', async () => {
        vi.mocked(useAuthHook.useAuth).mockReturnValue({
            ...vi.mocked(useAuthHook.useAuth)(),
            user: mockUserRegular,
            isAuthenticated: true,
        });
        vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue({
            count: 1, next: null, previous: null, results: [pendingMemoNotRequester],
        });
        renderWithProviders(<PurchaseRequestMemoList />);

        await screen.findByText(pendingMemoNotRequester.iom_id as string);
        const editButton = screen.queryByRole('button', { name: /edit memo/i });
        expect(editButton).not.toBeInTheDocument();
    });

    // Tests for Cancel Button
    it('shows Cancel button for pending memo if user is requester, opens dialog, confirms, and calls API', async () => {
      const mockShowConfirmDialog = vi.fn((_title, _message, onConfirm) => onConfirm());
      vi.mocked(useAuthHook.useAuth).mockReturnValue({
        ...vi.mocked(useAuthHook.useAuth)(),
        user: { ...mockUserStaff, id: pendingMemoIsRequester.requested_by },
        isAuthenticated: true,
      });
       vi.mocked(useUIHook.useUI).mockReturnValue({
        showSnackbar: vi.fn(),
        showConfirmDialog: mockShowConfirmDialog,
        hideConfirmDialog: vi.fn(),
        confirmDialogOpen: false,
        confirmDialogTitle: '',
        confirmDialogMessage: '',
        confirmDialogOnConfirm: vi.fn(),
        confirmDialogOnCancel: undefined,
        snackbarOpen: false,
        snackbarMessage: '',
        snackbarSeverity: 'info',
        hideSnackbar: vi.fn(),
      });
      const getMemosMock = vi.mocked(procurementApi.getPurchaseRequestMemos)
        .mockResolvedValueOnce({ // Initial load
          count: 1, next: null, previous: null,
          results: [pendingMemoIsRequester] // pendingMemoIsRequester is already complete
        })
        .mockResolvedValueOnce({ // After cancellation
          count: 1, next: null, previous: null,
          results: [
            { // Manually define Memo after cancellation
              id: pendingMemoIsRequester.id, // Should be 101
              iom_id: pendingMemoIsRequester.iom_id, // 'IOM-101'
              item_description: pendingMemoIsRequester.item_description, // 'Laptop for Requester'
              quantity: pendingMemoIsRequester.quantity, // 1
              reason: pendingMemoIsRequester.reason, // 'Requester needs laptop'
              estimated_cost: pendingMemoIsRequester.estimated_cost, // 1200
              requested_by: pendingMemoIsRequester.requested_by, // 1
              requested_by_username: pendingMemoIsRequester.requested_by_username, // 'testuser'
              request_date: pendingMemoIsRequester.request_date, // '2024-03-01T10:00:00Z'
              status: 'cancelled', // Changed
              approver: null,
              approver_username: null,
              decision_date: null,
              approver_comments: 'Cancelled by user',
              department: pendingMemoIsRequester.department, // 1
              department_name: pendingMemoIsRequester.department_name, // 'IT'
              project: null,
              project_name: null,
              priority: 'high',
              required_delivery_date: null,
              suggested_vendor: null,
              suggested_vendor_name: null,
              attachments: null,
              created_at: pendingMemoIsRequester.created_at, // '2024-03-01T10:00:00Z'
              updated_at: new Date().toISOString(), // Updated
            } as PurchaseRequestMemo
          ]
        });
      const cancelMemoMock = vi.mocked(procurementApi.cancelPurchaseRequestMemo).mockResolvedValue(undefined);

      const user = userEvent.setup();
      renderWithProviders(<PurchaseRequestMemoList />);

      const cancelButton = await screen.findByRole('button', { name: /cancel request/i });
      expect(cancelButton).toBeInTheDocument();
      await user.click(cancelButton);

      expect(mockShowConfirmDialog).toHaveBeenCalled();
      await waitFor(() => expect(cancelMemoMock).toHaveBeenCalledWith(expect.any(Function), pendingMemoIsRequester.id));
      await waitFor(() => expect(getMemosMock).toHaveBeenCalledTimes(2));
    });

    it('shows Cancel button for pending memo if user is staff, opens dialog, confirms, and calls API', async () => {
        const mockShowConfirmDialog = vi.fn((_title, _message, onConfirm) => onConfirm());
        vi.mocked(useAuthHook.useAuth).mockReturnValue({
            ...vi.mocked(useAuthHook.useAuth)(),
            user: mockUserStaff,
            isAuthenticated: true,
        });
        vi.mocked(useUIHook.useUI).mockReturnValue({
            showSnackbar: vi.fn(),
            showConfirmDialog: mockShowConfirmDialog,
            hideConfirmDialog: vi.fn(),
            confirmDialogOpen: false,
            confirmDialogTitle: '',
            confirmDialogMessage: '',
            confirmDialogOnConfirm: vi.fn(),
            confirmDialogOnCancel: undefined,
        snackbarOpen: false,
        snackbarMessage: '',
        snackbarSeverity: 'info',
        hideSnackbar: vi.fn(),
        });
        const getMemosMock = vi.mocked(procurementApi.getPurchaseRequestMemos)
            .mockResolvedValueOnce({ // Initial load
              count: 1, next: null, previous: null, results: [pendingMemoNotRequester]
            })
            .mockResolvedValueOnce({ // After cancellation by staff
              count: 1, next: null, previous: null,
              results: [
                { // Manually define Memo after cancellation by staff
                  id: pendingMemoNotRequester.id, // 102
                  iom_id: pendingMemoNotRequester.iom_id, // 'IOM-102'
                  item_description: pendingMemoNotRequester.item_description, // 'Laptop for Other'
                  quantity: pendingMemoNotRequester.quantity, // 1
                  reason: pendingMemoNotRequester.reason, // 'Other user needs laptop'
                  estimated_cost: pendingMemoNotRequester.estimated_cost, // 1300
                  requested_by: pendingMemoNotRequester.requested_by, // 99
                  requested_by_username: pendingMemoNotRequester.requested_by_username, // 'otheruser'
                  request_date: pendingMemoNotRequester.request_date, // '2024-03-02T10:00:00Z'
                  status: 'cancelled', // Changed
                  approver: null,
                  approver_username: null,
                  decision_date: null,
                  approver_comments: 'Cancelled by staff',
                  department: pendingMemoNotRequester.department, // 1
                  department_name: pendingMemoNotRequester.department_name, // 'IT'
                  project: null,
                  project_name: null,
                  priority: 'medium',
                  required_delivery_date: null,
                  suggested_vendor: null,
                  suggested_vendor_name: null,
                  attachments: null,
                  created_at: pendingMemoNotRequester.created_at, // '2024-03-02T10:00:00Z'
                  updated_at: new Date().toISOString(), // Updated
                } as PurchaseRequestMemo
              ]
            });
        const cancelMemoMock = vi.mocked(procurementApi.cancelPurchaseRequestMemo).mockResolvedValue(undefined);

        const user = userEvent.setup();
        renderWithProviders(<PurchaseRequestMemoList />);

        const cancelButton = await screen.findByRole('button', { name: /cancel request/i });
        expect(cancelButton).toBeInTheDocument();
        await user.click(cancelButton);

        expect(mockShowConfirmDialog).toHaveBeenCalled();
        await waitFor(() => expect(cancelMemoMock).toHaveBeenCalledWith(expect.any(Function), pendingMemoNotRequester.id));
        await waitFor(() => expect(getMemosMock).toHaveBeenCalledTimes(2));
    });


    it('does NOT show Cancel button for non-pending memo', async () => {
      vi.mocked(useAuthHook.useAuth).mockReturnValue({ ...vi.mocked(useAuthHook.useAuth)(), user: mockUserStaff });
      vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue({
        count: 1, next: null, previous: null, results: [approvedMemo],
      });
      renderWithProviders(<PurchaseRequestMemoList />);
      await screen.findByText(approvedMemo.iom_id as string);
      expect(screen.queryByRole('button', { name: /cancel request/i })).not.toBeInTheDocument();
    });

    it('does NOT show Cancel button if user is not requester and not staff', async () => {
      vi.mocked(useAuthHook.useAuth).mockReturnValue({ ...vi.mocked(useAuthHook.useAuth)(), user: mockUserRegular });
      vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue({
         count: 1, next: null, previous: null, results: [pendingMemoNotRequester],
      });
      renderWithProviders(<PurchaseRequestMemoList />);
      await screen.findByText(pendingMemoNotRequester.iom_id as string);
      expect(screen.queryByRole('button', { name: /cancel request/i })).not.toBeInTheDocument();
    });

    it('opens Cancel dialog and does NOT call API if dismissed', async () => {
      const mockShowConfirmDialog = vi.fn((_title, _message, _onConfirm, onCancel) => {
        if (onCancel) onCancel();
      });
       vi.mocked(useAuthHook.useAuth).mockReturnValue({
        ...vi.mocked(useAuthHook.useAuth)(),
        user: mockUserStaff,
        isAuthenticated: true,
      });
      vi.mocked(useUIHook.useUI).mockReturnValue({
        showSnackbar: vi.fn(),
        showConfirmDialog: mockShowConfirmDialog,
        hideConfirmDialog: vi.fn(),
        confirmDialogOpen: false,
        confirmDialogTitle: '',
        confirmDialogMessage: '',
        confirmDialogOnConfirm: vi.fn(),
        confirmDialogOnCancel: undefined,
        snackbarOpen: false,
        snackbarMessage: '',
        snackbarSeverity: 'info',
        hideSnackbar: vi.fn(),
      });
      vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue({
        count: 1, next: null, previous: null, results: [pendingMemoIsRequester],
      });
      const cancelMemoMock = vi.mocked(procurementApi.cancelPurchaseRequestMemo);

      const user = userEvent.setup();
      renderWithProviders(<PurchaseRequestMemoList />);

      const cancelButton = await screen.findByRole('button', { name: /cancel request/i });
      await user.click(cancelButton);

      expect(mockShowConfirmDialog).toHaveBeenCalled();
      expect(cancelMemoMock).not.toHaveBeenCalled();
    });

    // Tests for Approve/Reject Buttons
    it('handles Approve button click, dialog confirmation, API call, and UI updates', async () => {
      vi.mocked(useAuthHook.useAuth).mockReturnValue({
        ...vi.mocked(useAuthHook.useAuth)(),
        user: mockUserStaff,
      });

      const getMemosMock = vi.mocked(procurementApi.getPurchaseRequestMemos)
        .mockResolvedValueOnce({ // Initial load: pendingMemoNotRequester
          count: 1, next: null, previous: null,
          results: [pendingMemoNotRequester]
        })
        .mockResolvedValueOnce({ // After approval
          count: 1, next: null, previous: null,
          results: [
            { // Manually define Memo after approval
              id: pendingMemoNotRequester.id, // 102
              iom_id: pendingMemoNotRequester.iom_id, // 'IOM-102'
              item_description: pendingMemoNotRequester.item_description, // 'Laptop for Other'
              quantity: pendingMemoNotRequester.quantity, // 1
              reason: pendingMemoNotRequester.reason, // 'Other user needs laptop'
              estimated_cost: pendingMemoNotRequester.estimated_cost, // 1300
              requested_by: pendingMemoNotRequester.requested_by, // 99
              requested_by_username: pendingMemoNotRequester.requested_by_username, // 'otheruser'
              request_date: pendingMemoNotRequester.request_date, // '2024-03-02T10:00:00Z'
              status: 'approved', // Changed
              approver: mockUserStaff.id, // User who approved (testuser, id 1)
              approver_username: mockUserStaff.name, // 'testuser'
              decision_date: new Date().toISOString(), // Set
              approver_comments: 'Approved by tests', // Set
              department: pendingMemoNotRequester.department, // 1
              department_name: pendingMemoNotRequester.department_name, // 'IT'
              project: null,
              project_name: null,
              priority: 'medium',
              required_delivery_date: null,
              suggested_vendor: null,
              suggested_vendor_name: null,
              attachments: null,
              created_at: pendingMemoNotRequester.created_at, // '2024-03-02T10:00:00Z'
              updated_at: new Date().toISOString(), // Updated
            } as PurchaseRequestMemo
          ]
        });
      const decideMemoMock = vi.mocked(procurementApi.decidePurchaseRequestMemo).mockResolvedValue(undefined);

      const user = userEvent.setup();
      const { showSnackbar } = useUIHook.useUI();
      renderWithProviders(<PurchaseRequestMemoList />);

      const approveButton = await screen.findByRole('button', { name: /approve request/i });
      expect(approveButton).toBeInTheDocument();
      await user.click(approveButton);

      const dialogTitleApprove = await screen.findByRole('heading', { name: /Approve Purchase Request/i });
      expect(dialogTitleApprove).toBeInTheDocument();
      const commentsInputApprove = screen.getByLabelText(/Comments/i);
      await user.type(commentsInputApprove, 'Approved by tests');
      const confirmApproveButton = screen.getByRole('button', { name: /Confirm Approval/i });
      await user.click(confirmApproveButton);

      await waitFor(() => expect(decideMemoMock).toHaveBeenCalledWith(
        expect.any(Function),
        pendingMemoNotRequester.id,
        { decision: 'approved', comments: 'Approved by tests' }
      ));
      await waitFor(() => expect(getMemosMock).toHaveBeenCalledTimes(2));
      expect(showSnackbar).toHaveBeenCalledWith('Purchase request approved successfully!', 'success');
    });

    it('handles Reject button click, dialog confirmation, API call, and UI updates', async () => {
        vi.mocked(useAuthHook.useAuth).mockReturnValue({
            ...vi.mocked(useAuthHook.useAuth)(),
            user: mockUserStaff,
        });

        const getMemosMock = vi.mocked(procurementApi.getPurchaseRequestMemos)
            .mockResolvedValueOnce({ // Initial load: pendingMemoIsRequester
              count: 1, next: null, previous: null,
              results: [pendingMemoIsRequester]
            })
            .mockResolvedValueOnce({ // After rejection
              count: 1, next: null, previous: null,
              results: [
                { // Manually define Memo after rejection
                  id: pendingMemoIsRequester.id, // 101
                  iom_id: pendingMemoIsRequester.iom_id, // 'IOM-101'
                  item_description: pendingMemoIsRequester.item_description, // 'Laptop for Requester'
                  quantity: pendingMemoIsRequester.quantity, // 1
                  reason: pendingMemoIsRequester.reason, // 'Requester needs laptop'
                  estimated_cost: pendingMemoIsRequester.estimated_cost, // 1200
                  requested_by: pendingMemoIsRequester.requested_by, // 1
                  requested_by_username: pendingMemoIsRequester.requested_by_username, // 'testuser'
                  request_date: pendingMemoIsRequester.request_date, // '2024-03-01T10:00:00Z'
                  status: 'rejected', // Changed
                  approver: mockUserStaff.id, // User who rejected (testuser, id 1)
                  approver_username: mockUserStaff.name, // 'testuser'
                  decision_date: new Date().toISOString(), // Set
                  approver_comments: 'Rejected for testing reasons', // Set
                  department: pendingMemoIsRequester.department, // 1
                  department_name: pendingMemoIsRequester.department_name, // 'IT'
                  project: null,
                  project_name: null,
                  priority: 'high',
                  required_delivery_date: null,
                  suggested_vendor: null,
                  suggested_vendor_name: null,
                  attachments: null,
                  created_at: pendingMemoIsRequester.created_at, // '2024-03-01T10:00:00Z'
                  updated_at: new Date().toISOString(), // Updated
                } as PurchaseRequestMemo
              ]
            });
        const decideMemoMock = vi.mocked(procurementApi.decidePurchaseRequestMemo).mockResolvedValue(undefined);

        const user = userEvent.setup();
        const { showSnackbar } = useUIHook.useUI();
        renderWithProviders(<PurchaseRequestMemoList />);

        const rejectButton = await screen.findByRole('button', { name: /reject request/i });
        expect(rejectButton).toBeInTheDocument();
        await user.click(rejectButton);

        const dialogTitleReject = await screen.findByRole('heading', { name: /Reject Purchase Request/i });
        expect(dialogTitleReject).toBeInTheDocument();
        const commentsInputReject = screen.getByLabelText(/Comments/i);
        await user.type(commentsInputReject, 'Rejected for testing reasons');
        const confirmRejectButton = screen.getByRole('button', { name: /Confirm Rejection/i });
        await user.click(confirmRejectButton);

        await waitFor(() => expect(decideMemoMock).toHaveBeenCalledWith(
            expect.any(Function),
            pendingMemoIsRequester.id,
            { decision: 'rejected', comments: 'Rejected for testing reasons' }
        ));
        await waitFor(() => expect(getMemosMock).toHaveBeenCalledTimes(2));
        expect(showSnackbar).toHaveBeenCalledWith('Purchase request rejected successfully!', 'success');
    });


    it('does NOT show Approve/Reject buttons if user is not staff', async () => {
      vi.mocked(useAuthHook.useAuth).mockReturnValue({ ...vi.mocked(useAuthHook.useAuth)(), user: mockUserRegular });
      vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue({
        count: 1, next: null, previous: null, results: [pendingMemoIsRequester],
      });
      renderWithProviders(<PurchaseRequestMemoList />);
      await screen.findByText(pendingMemoIsRequester.iom_id as string);
      expect(screen.queryByRole('button', { name: /approve request/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reject request/i })).not.toBeInTheDocument();
    });

    it('does NOT show Approve/Reject buttons for non-pending memo', async () => {
      vi.mocked(useAuthHook.useAuth).mockReturnValue({ ...vi.mocked(useAuthHook.useAuth)(), user: mockUserStaff });
      vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue({
        count: 1, next: null, previous: null, results: [approvedMemo],
      });
      renderWithProviders(<PurchaseRequestMemoList />);
      await screen.findByText(approvedMemo.iom_id as string);
      expect(screen.queryByRole('button', { name: /approve request/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reject request/i })).not.toBeInTheDocument();
    });
  });

  describe('Selection and Print Buttons', () => {
    it('selects and deselects all memos via header checkbox, updating print button states and labels', async () => {
      vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue(mockPaginatedMemosResponse);
      const user = userEvent.setup();
      renderWithProviders(<PurchaseRequestMemoList />);

      const printPreviewButton = await screen.findByRole('button', { name: /Print Preview Selected/i });
      const printSelectedButton = screen.getByRole('button', { name: /Print Selected/i });

      expect(printPreviewButton).toBeDisabled();
      expect(printSelectedButton).toBeDisabled();
      expect(printPreviewButton).toHaveTextContent('Print Preview Selected (0)');
      expect(printSelectedButton).toHaveTextContent('Print Selected (0)');

      await screen.findByText(mockMemos[0].iom_id as string);
      await screen.findByText(mockMemos[1].iom_id as string);

      const selectAllCheckbox = screen.getByLabelText(/select all purchase request memos/i);

      await user.click(selectAllCheckbox);
      expect(printPreviewButton).toBeEnabled();
      expect(printSelectedButton).toBeEnabled();
      expect(printPreviewButton).toHaveTextContent(`Print Preview Selected (${mockMemos.length})`);
      expect(printSelectedButton).toHaveTextContent(`Print Selected (${mockMemos.length})`);

      await user.click(selectAllCheckbox);
      expect(printPreviewButton).toBeDisabled();
      expect(printSelectedButton).toBeDisabled();
      expect(printPreviewButton).toHaveTextContent('Print Preview Selected (0)');
      expect(printSelectedButton).toHaveTextContent('Print Selected (0)');
    });

    it('selects individual memos, updating print button states and labels', async () => {
      vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue(mockPaginatedMemosResponse);
      const user = userEvent.setup();
      renderWithProviders(<PurchaseRequestMemoList />);

      const printPreviewButton = await screen.findByRole('button', { name: /Print Preview Selected/i });
      const printSelectedButton = screen.getByRole('button', { name: /Print Selected/i });

      const row1Checkbox = await screen.findByRole('checkbox', { name: `Select memo ${mockMemos[0].iom_id}` });
      const row2Checkbox = screen.getByRole('checkbox', { name: `Select memo ${mockMemos[1].iom_id}` });

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

    it('navigates correctly for "Print Preview Selected" button', async () => {
      vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue(mockPaginatedMemosResponse);
      const user = userEvent.setup();
      renderWithProviders(<PurchaseRequestMemoList />);

      const row1Checkbox = await screen.findByRole('checkbox', { name: `Select memo ${mockMemos[0].iom_id}` });
      await user.click(row1Checkbox);

      const printPreviewButton = screen.getByRole('button', { name: /Print Preview Selected \(1\)/i });
      await user.click(printPreviewButton);

      expect(mockNavigate).toHaveBeenCalledWith('/procurement/iom/print-preview', {
        state: { selectedMemoIds: [mockMemos[0].id], autoPrint: false },
      });
    });

    it('navigates correctly for "Print Selected" button', async () => {
      vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue(mockPaginatedMemosResponse);
      const user = userEvent.setup();
      renderWithProviders(<PurchaseRequestMemoList />);

      const row1Checkbox = await screen.findByRole('checkbox', { name: `Select memo ${mockMemos[0].iom_id}` });
      const row2Checkbox = screen.getByRole('checkbox', { name: `Select memo ${mockMemos[1].iom_id}` });
      await user.click(row1Checkbox);
      await user.click(row2Checkbox);

      const printSelectedButton = screen.getByRole('button', { name: /Print Selected \(2\)/i });
      await user.click(printSelectedButton);

      expect(mockNavigate).toHaveBeenCalledWith('/procurement/iom/print-preview', {
        state: { selectedMemoIds: [mockMemos[0].id, mockMemos[1].id], autoPrint: true },
      });
    });

    it('shows snackbar warning and does not navigate if Print buttons clicked with no selection', async () => {
      vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue(mockPaginatedMemosResponse);
      const user = userEvent.setup();
      const { showSnackbar } = useUIHook.useUI();
      renderWithProviders(<PurchaseRequestMemoList />);

      const printPreviewButton = await screen.findByRole('button', { name: /Print Preview Selected \(0\)/i });
      const printSelectedButton = screen.getByRole('button', { name: /Print Selected \(0\)/i });

      expect(printPreviewButton).toBeDisabled();

      expect(printPreviewButton).toBeDisabled();
      expect(printSelectedButton).toBeDisabled();

      mockNavigate.mockClear();

      await user.click(printPreviewButton).catch(() => {});
      await user.click(printSelectedButton).catch(() => {});

      expect(showSnackbar).not.toHaveBeenCalledWith('Please select IOMs to print.', 'warning');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
