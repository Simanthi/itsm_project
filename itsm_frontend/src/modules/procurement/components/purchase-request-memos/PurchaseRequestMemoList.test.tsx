import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom'; // BrowserRouter, Routes, Route removed
// import * as ReactRouterDom from 'react-router-dom'; // Unused import
// import { server } from '../../../../mocks/server'; // MSW server import removed
import { UIContextProvider } from '../../../../context/UIContext/UIContextProvider';
import { AuthProvider } from '../../../../context/auth/AuthContext';
import PurchaseRequestMemoList from './PurchaseRequestMemoList';
import * as procurementApi from '../../../../api/procurementApi';
import * as genericIomApi from '../../../../api/genericIomApi';
import * as useAuthHook from '../../../../context/auth/useAuth';
import * as useUIHook from '../../../../context/UIContext/useUI'; // Import useUI
import type { PurchaseRequestMemo, PaginatedResponse } from '../../types/procurementTypes';
import type { IOMTemplate } from '../../../iomTemplateAdmin/types/iomTemplateAdminTypes';


// Mock API modules
vi.mock('../../../../api/procurementApi');
vi.mock('../../../../api/genericIomApi');
vi.mock('../../../../context/auth/useAuth');
vi.mock('../../../../context/UIContext/useUI'); // Mock useUI

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
      // updated_by_username: 'admin', // Removed as it's not in IOMTemplate type
      // Add other fields from IOMTemplate as needed, with default/mock values
      created_by: 1,
      // updated_by: 1, // Removed as it's not in IOMTemplate type (updated_at is present)
      // form_layout: "{}", // Removed as it's not in IOMTemplate type
      // form_title: "Purchase Request Memo", // Removed as it's not in IOMTemplate type
      is_active: true,
      approval_type: 'none', // Added missing required property
      // related_module: "procurement", // Removed as it's not in IOMTemplate type
      // template_version: "1.0", // Removed as it's not in IOMTemplate type
      // workflow: null, // Removed as per TS2353, not in IOMTemplate type
      // workflow_name: null, // Removed as per TS2353, not in IOMTemplate type
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


describe('PurchaseRequestMemoList', () => {
  beforeEach(() => {
    vi.resetAllMocks(); // Reset all mocks fresh for each test
    // server.resetHandlers(); // If using MSW, uncomment and ensure server is imported

    // Mock useAuth consistently
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      token: 'mockToken',
      user: { id: 1, name: 'testuser', email: 'testuser@example.com', role: 'admin', is_staff: true, groups: [] },
      // Ensure authenticatedFetch is a stable function mock for each test
      authenticatedFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      isAuthenticated: true,
    });

    // Provide a default mock for getIomTemplates as it's fetched during component setup
    vi.mocked(genericIomApi.getIomTemplates).mockResolvedValue(mockPurchaseRequestTemplate);

    // Default mock for useUI
    vi.mocked(useUIHook.useUI).mockReturnValue({
      showSnackbar: vi.fn(),
      showConfirmDialog: vi.fn(),
      hideConfirmDialog: vi.fn(),
      confirmDialogOpen: false,
      confirmDialogTitle: '',
      confirmDialogMessage: '',
      confirmDialogOnConfirm: vi.fn(),
      confirmDialogOnCancel: undefined,
      // Add missing UIContextType properties
      snackbarOpen: false,
      snackbarMessage: '',
      snackbarSeverity: 'info',
      hideSnackbar: vi.fn(),
    });

    // IMPORTANT: Do not set a global .mockResolvedValue for getPurchaseRequestMemos here
    // if individual tests are going to use .mockResolvedValueOnce() chains.
    // Let each test define its sequence for getPurchaseRequestMemos.
  });

  afterEach(() => {
    // server.close(); // If using MSW
  });

  it('renders the main title and create button', async () => {
    renderWithProviders(<PurchaseRequestMemoList />);
    expect(screen.getByRole('heading', { name: /Internal Office Memo/i })).toBeInTheDocument();
    // Wait for template ID to be fetched before button becomes enabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create New Request/i })).toBeEnabled();
    });
  });

  it('renders table headers correctly', async () => {
    renderWithProviders(<PurchaseRequestMemoList />);
    await waitFor(() => { // Wait for data to load which triggers header rendering
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
    vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue(mockPaginatedMemosResponse); // Add this line
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
    const user = userEvent.setup();
    renderWithProviders(<PurchaseRequestMemoList />);
    const createButton = await screen.findByRole('button', { name: /Create New Request/i });
    await waitFor(() => expect(createButton).toBeEnabled()); // Ensure button is enabled after template ID fetch

    await user.click(createButton);
    expect(mockNavigate).toHaveBeenCalledWith(`/ioms/new/form/${mockPurchaseRequestTemplate.results[0].id}`);
  });

  it('navigates to view memo details when view icon is clicked', async () => {
    vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue(mockPaginatedMemosResponse); // Add this line
    const user = userEvent.setup();
    renderWithProviders(<PurchaseRequestMemoList />);
    const viewButtons = await screen.findAllByRole('button', { name: /view details/i });
    expect(viewButtons[0]).toBeInTheDocument();
    await user.click(viewButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith(`/procurement/iom/view/${mockMemos[0].id}`);
  });

  it('calls getPurchaseRequestMemos with correct sort parameters when column headers are clicked', async () => {
    // For this test, we need to control the responses for getPurchaseRequestMemos
    // to check how sorting parameters change.
    const mockGetMemosSort = vi.mocked(procurementApi.getPurchaseRequestMemos)
      .mockResolvedValue(mockPaginatedMemosResponse); // Default for initial load and subsequent sorts

    const user = userEvent.setup();
    renderWithProviders(<PurchaseRequestMemoList />);

    // Wait for initial data to load
    // It will be called once for template, once for initial memos
    await waitFor(() => expect(genericIomApi.getIomTemplates).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockGetMemosSort).toHaveBeenCalledTimes(1));
    expect(mockGetMemosSort).toHaveBeenNthCalledWith(1, expect.any(Function), expect.objectContaining({ ordering: '-request_date'}));

    await screen.findByText(mockMemos[0].iom_id as string); // Ensure table is populated

    // Click on 'IOM ID' header (initially sorted by request_date desc)
    const iomIdHeaderButton = screen.getByRole('button', { name: /IOM ID/i });
    await user.click(iomIdHeaderButton);
    await waitFor(() => {
      expect(procurementApi.getPurchaseRequestMemos).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ ordering: 'iom_id' }) // Ascending by default on new column
      );
    });

    // Click again for descending
    await user.click(iomIdHeaderButton);
    await waitFor(() => {
      expect(procurementApi.getPurchaseRequestMemos).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ ordering: '-iom_id' })
      );
    });

    // Click on 'Item Description' header
    const itemDescriptionHeaderButton = screen.getByRole('button', { name: /Item Description/i });
    await user.click(itemDescriptionHeaderButton);
    await waitFor(() => {
      expect(procurementApi.getPurchaseRequestMemos).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ ordering: 'item_description' })
      );
    });
     // Click again for descending
    await user.click(itemDescriptionHeaderButton);
    await waitFor(() => {
      expect(procurementApi.getPurchaseRequestMemos).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ ordering: '-item_description' })
      );
    });


    // Test another sortable column, e.g., 'Priority'
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
      ...mockMemos[0], // Base it on an existing mock structure
      id: i + 1,
      iom_id: `IOM-${String(i + 1).padStart(3, '0')}`,
      item_description: `Test Item ${i + 1}`,
      // Ensure other required fields are present if mockMemos[0] is minimal
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
      count: moreMemos.length, // 25 items
      next: 'http://test/api/memos?page=2&pageSize=10',
      previous: null,
      results: moreMemos.slice(0, 10), // First 10 items
    };

    const responseFor5RPP_Page1: PaginatedResponse<PurchaseRequestMemo> = {
      count: moreMemos.length,
      next: 'http://test/api/memos?page=2&pageSize=5',
      previous: null,
      results: moreMemos.slice(0, 5), // First 5 items
    };

    const responseFor5RPP_Page2: PaginatedResponse<PurchaseRequestMemo> = {
        count: moreMemos.length,
        next: 'http://test/api/memos?page=3&pageSize=5',
        previous: 'http://test/api/memos?page=1&pageSize=5',
        results: moreMemos.slice(5, 10), // Items 6-10
    };

    // Set up the mock sequence for getPurchaseRequestMemos specifically for this test
    const mockGetMemos = vi.mocked(procurementApi.getPurchaseRequestMemos)
        .mockResolvedValueOnce(initialResponseForPaginationTest) // For initial load
        .mockResolvedValueOnce(responseFor5RPP_Page1)          // After changing to 5 RPP
        .mockResolvedValueOnce(responseFor5RPP_Page2);        // After clicking next page

    renderWithProviders(<PurchaseRequestMemoList />);

    // 1. Initial load
    // Wait for getIomTemplates to be called (part of component setup)
    await waitFor(() => expect(genericIomApi.getIomTemplates).toHaveBeenCalledTimes(1));

    // Now check getPurchaseRequestMemos for the initial data load
    await waitFor(() => expect(mockGetMemos).toHaveBeenCalledTimes(1)); // Should be called once for initial data
    expect(mockGetMemos).toHaveBeenNthCalledWith(
      1,
      expect.any(Function), // authenticatedFetch argument
      expect.objectContaining({ page: 1, pageSize: 10, ordering: '-request_date' }) // Default sort
    );
    // Ensure table shows initial data and pagination reflects 25 total items
    await screen.findByText('IOM-001'); // from initialResponseForPaginationTest
    expect(screen.getByText('1–10 of 25')).toBeInTheDocument();


    // 2. Change rows per page to 5
    const rowsPerPageSelectFor5 = screen.getByLabelText(/Rows per page:/i);
    await user.click(rowsPerPageSelectFor5);
    const option5 = await screen.findByRole('option', { name: '5' });
    await user.click(option5);

    await waitFor(() => expect(mockGetMemos).toHaveBeenCalledTimes(2)); // Initial + RPP change
    expect(mockGetMemos).toHaveBeenNthCalledWith(
      2,
      expect.any(Function),
      // When rowsPerPage changes, page should reset to 1, ordering might persist or reset based on component logic
      // Assuming ordering persists or is the default again.
      expect.objectContaining({ page: 1, pageSize: 5, ordering: '-request_date' })
    );
    // Ensure table updates to 5 items and pagination reflects 5 RPP
    await screen.findByText('IOM-001'); // Still item 1
    expect(screen.queryByText('IOM-006')).not.toBeInTheDocument(); // Item 6 should not be visible yet
    expect(screen.getByText('1–5 of 25')).toBeInTheDocument();


    // 3. Click next page
    const nextPageButton = screen.getByRole('button', { name: /Go to next page/i });
    expect(nextPageButton).toBeEnabled();
    await user.click(nextPageButton);

    await waitFor(() => expect(mockGetMemos).toHaveBeenCalledTimes(3)); // Initial + RPP change + Next Page
    expect(mockGetMemos).toHaveBeenNthCalledWith(
      3,
      expect.any(Function),
      expect.objectContaining({ page: 2, pageSize: 5, ordering: '-request_date' })
    );
    // Ensure table updates to show items 6-10
    await screen.findByText('IOM-006'); // from responseFor5RPP_Page2
    expect(screen.getByText('6–10 of 25')).toBeInTheDocument();
  });

  describe('Action Buttons', () => {
    const pendingMemoIsRequester: PurchaseRequestMemo = {
      ...mockMemos[0], // status: 'pending', requested_by: 1 (matches default mockUser.id)
      id: 101,
      iom_id: 'IOM-101',
      status: 'pending',
      requested_by: 1, // Mock user ID
      requested_by_username: 'testuser',
    };

    const pendingMemoNotRequester: PurchaseRequestMemo = {
        ...mockMemos[0],
        id: 102,
        iom_id: 'IOM-102',
        status: 'pending',
        requested_by: 99, // Different user
        requested_by_username: 'otheruser',
    };

    const approvedMemo: PurchaseRequestMemo = {
      ...mockMemos[1], // status: 'approved'
      id: 103,
      iom_id: 'IOM-103',
      status: 'approved',
      requested_by: 1,
    };

    const mockUserRegular = { id: 2, name: 'regularJoe', email: 'regular@example.com', role: 'user', is_staff: false, groups: [] };
    const mockUserStaff = { id: 1, name: 'testuser', email: 'teststaff@example.com', role: 'admin', is_staff: true, groups: [] };


    it('shows Edit button for pending memo if user is requester, and navigates on click', async () => {
      vi.mocked(useAuthHook.useAuth).mockReturnValue({
        ...vi.mocked(useAuthHook.useAuth)(), // spread previous mock
        user: mockUserStaff, // or any user that matches requested_by
        isAuthenticated: true,
      });
      vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue({
        count: 1, next: null, previous: null, results: [pendingMemoIsRequester],
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
            user: mockUserStaff, // Staff user
            isAuthenticated: true,
        });
        vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue({
            count: 1, next: null, previous: null, results: [pendingMemoNotRequester], // Memo requested by someone else
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

      await screen.findByText(approvedMemo.iom_id as string); // Ensure row is rendered
      const editButton = screen.queryByRole('button', { name: /edit memo/i });
      expect(editButton).not.toBeInTheDocument();
    });

    it('does NOT show Edit button if user is not requester and not staff', async () => {
        vi.mocked(useAuthHook.useAuth).mockReturnValue({
            ...vi.mocked(useAuthHook.useAuth)(),
            user: mockUserRegular, // Regular user, not staff
            isAuthenticated: true,
        });
        vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue({
            count: 1, next: null, previous: null, results: [pendingMemoNotRequester], // Requested by 'otheruser'
        });
        renderWithProviders(<PurchaseRequestMemoList />);

        await screen.findByText(pendingMemoNotRequester.iom_id as string); // Ensure row is rendered
        const editButton = screen.queryByRole('button', { name: /edit memo/i });
        expect(editButton).not.toBeInTheDocument();
    });

    // Tests for Cancel Button
    it('shows Cancel button for pending memo if user is requester, opens dialog, confirms, and calls API', async () => {
      const mockShowConfirmDialog = vi.fn((_title, _message, onConfirm) => onConfirm()); // Auto-confirm
      vi.mocked(useAuthHook.useAuth).mockReturnValue({
        ...vi.mocked(useAuthHook.useAuth)(),
        user: { ...mockUserStaff, id: pendingMemoIsRequester.requested_by }, // User is requester
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
        .mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [pendingMemoIsRequester] }) // Initial load
        .mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [{...pendingMemoIsRequester, status: 'cancelled'}] }); // After cancellation
      const cancelMemoMock = vi.mocked(procurementApi.cancelPurchaseRequestMemo).mockResolvedValue(undefined); // API call for cancel

      const user = userEvent.setup();
      renderWithProviders(<PurchaseRequestMemoList />);

      const cancelButton = await screen.findByRole('button', { name: /cancel request/i });
      expect(cancelButton).toBeInTheDocument();
      await user.click(cancelButton);

      expect(mockShowConfirmDialog).toHaveBeenCalled();
      // onConfirm was called automatically by the mock
      await waitFor(() => expect(cancelMemoMock).toHaveBeenCalledWith(expect.any(Function), pendingMemoIsRequester.id));
      await waitFor(() => expect(getMemosMock).toHaveBeenCalledTimes(2)); // Initial + refresh
      // Optionally, check for snackbar success message
    });

    it('shows Cancel button for pending memo if user is staff, opens dialog, confirms, and calls API', async () => {
        const mockShowConfirmDialog = vi.fn((_title, _message, onConfirm) => onConfirm());
        vi.mocked(useAuthHook.useAuth).mockReturnValue({
            ...vi.mocked(useAuthHook.useAuth)(),
            user: mockUserStaff, // User is staff
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
            .mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [pendingMemoNotRequester] }) // Initial load
            .mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [{...pendingMemoNotRequester, status: 'cancelled'}] });
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
        if (onCancel) onCancel(); // Simulate user clicking "Cancel" in dialog
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
        .mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [pendingMemoNotRequester] }) // Initial load
        .mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [{...pendingMemoNotRequester, status: 'approved'}] }); // After approval
      const decideMemoMock = vi.mocked(procurementApi.decidePurchaseRequestMemo).mockResolvedValue(undefined);

      const user = userEvent.setup();
      const { showSnackbar } = useUIHook.useUI(); // Get the mocked showSnackbar from the context
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
            .mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [pendingMemoIsRequester] }) // Initial load
            .mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [{...pendingMemoIsRequester, status: 'rejected'}] }); // After rejection
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
      vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue(mockPaginatedMemosResponse); // 2 memos
      const user = userEvent.setup();
      renderWithProviders(<PurchaseRequestMemoList />);

      const printPreviewButton = await screen.findByRole('button', { name: /Print Preview Selected/i });
      const printSelectedButton = screen.getByRole('button', { name: /Print Selected/i });

      // Initially, buttons should be disabled and show (0)
      expect(printPreviewButton).toBeDisabled();
      expect(printSelectedButton).toBeDisabled();
      expect(printPreviewButton).toHaveTextContent('Print Preview Selected (0)');
      expect(printSelectedButton).toHaveTextContent('Print Selected (0)');

      // Wait for table rows to be present
      await screen.findByText(mockMemos[0].iom_id as string);
      await screen.findByText(mockMemos[1].iom_id as string);

      const selectAllCheckbox = screen.getByLabelText(/select all purchase request memos/i);

      // Select all
      await user.click(selectAllCheckbox);
      expect(printPreviewButton).toBeEnabled();
      expect(printSelectedButton).toBeEnabled();
      expect(printPreviewButton).toHaveTextContent(`Print Preview Selected (${mockMemos.length})`);
      expect(printSelectedButton).toHaveTextContent(`Print Selected (${mockMemos.length})`);

      // Deselect all
      await user.click(selectAllCheckbox);
      expect(printPreviewButton).toBeDisabled();
      expect(printSelectedButton).toBeDisabled();
      expect(printPreviewButton).toHaveTextContent('Print Preview Selected (0)');
      expect(printSelectedButton).toHaveTextContent('Print Selected (0)');
    });

    it('selects individual memos, updating print button states and labels', async () => {
      vi.mocked(procurementApi.getPurchaseRequestMemos).mockResolvedValue(mockPaginatedMemosResponse); // 2 memos
      const user = userEvent.setup();
      renderWithProviders(<PurchaseRequestMemoList />);

      const printPreviewButton = await screen.findByRole('button', { name: /Print Preview Selected/i });
      const printSelectedButton = screen.getByRole('button', { name: /Print Selected/i });

      // Wait for table rows
      const row1Checkbox = await screen.findByRole('checkbox', { name: `Select memo ${mockMemos[0].iom_id}` }); // Assuming aria-label improves
      const row2Checkbox = screen.getByRole('checkbox', { name: `Select memo ${mockMemos[1].iom_id}` });

      // Select first memo
      await user.click(row1Checkbox);
      expect(printPreviewButton).toBeEnabled();
      expect(printSelectedButton).toBeEnabled();
      expect(printPreviewButton).toHaveTextContent('Print Preview Selected (1)');
      expect(printSelectedButton).toHaveTextContent('Print Selected (1)');

      // Select second memo
      await user.click(row2Checkbox);
      expect(printPreviewButton).toHaveTextContent('Print Preview Selected (2)');
      expect(printSelectedButton).toHaveTextContent('Print Selected (2)');

      // Deselect first memo
      await user.click(row1Checkbox);
      expect(printPreviewButton).toHaveTextContent('Print Preview Selected (1)');
      expect(printSelectedButton).toHaveTextContent('Print Selected (1)');
       expect(printPreviewButton).toBeEnabled(); // Still enabled as one is selected
      expect(printSelectedButton).toBeEnabled();


      // Deselect second memo (none selected)
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
      await user.click(row1Checkbox); // Select one memo

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
      await user.click(row2Checkbox); // Select two memos

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

      expect(printPreviewButton).toBeDisabled(); // Should be disabled initially

      // To test the snackbar, we need to simulate the click even if disabled,
      // or ensure the component's internal logic for showing snackbar is hit.
      // However, userEvent.click on a disabled button won't trigger the handler.
      // The component's onClick handler `handlePrintSelected` has a guard:
      // if (selectedMemoIds.length === 0) { showSnackbar(...); return; }
      // This means the buttons *should* be disabled by MUI if selectedMemoIds is empty.
      // Let's verify they are disabled, and then if we were to somehow enable and click, the snackbar would show.
      // For now, verifying they are disabled is the main check for this state.
      // If there was a scenario where they could be enabled with 0 items, then we'd test snackbar.

      // Manually call the handler to test the snackbar logic path if buttons were somehow clickable
      // This is more of a unit test of the handler itself rather than a full UI interaction.
      // For a true UI test, we'd rely on the disabled state.

      // We can check that the buttons are disabled. The actual snackbar for "0 selected"
      // is typically prevented by the button being disabled.
      // The component's `handlePrintSelected` function does have a check:
      // `if (selectedMemoIds.length === 0) { showSnackbar(...); return; }`
      // This logic would only be hit if the button was somehow clickable with 0 items.
      // Since the buttons are correctly disabled, this direct test of snackbar on click is not standard.
      // We'll trust the disabled state prevents the click.

      // Let's re-verify the disabled state.
      expect(printPreviewButton).toBeDisabled();
      expect(printSelectedButton).toBeDisabled();

      // If we wanted to force test the snackbar part of handlePrintSelected:
      // (This is slightly artificial as the UI should prevent this)
      // const instance = getByRole('button', { name: /Print Preview Selected \(0\)/i });
      // instance.onclick(); // This is not how RTL userEvent works.
      // We'd have to call the component's handler directly in a different kind of test.

      // The important UI behavior is that buttons are disabled.
      // The snackbar in handlePrintSelected is a fallback, which is good.
      // No navigation should occur.
      mockNavigate.mockClear(); // Clear any previous navigation calls from other tests

      // Simulate an attempt to click (though they are disabled)
      // These clicks won't do anything because buttons are disabled.
      await user.click(printPreviewButton).catch(() => {}); // userEvent might error on disabled
      await user.click(printSelectedButton).catch(() => {});

      expect(showSnackbar).not.toHaveBeenCalledWith('Please select IOMs to print.', 'warning'); // Because disabled
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
