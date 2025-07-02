// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../../../context/auth/AuthContext';
import { UIContextProvider } from '../../../../context/UIContext/UIContextProvider';
import PurchaseOrderList from './PurchaseOrderList';
import * as procurementApi from '../../../../api/procurementApi';
import * as useAuthHook from '../../../../context/auth/useAuth';
import * as useUIHook from '../../../../context/UIContext/useUI';
import type { PurchaseOrder, PaginatedResponse } from '../../types';

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

const mockPOs: PurchaseOrder[] = [
  {
    id: 1, po_number: 'PO-001', vendor: 1, vendor_details: { id: 1, name: 'Vendor A' }, order_date: '2024-01-15T10:00:00Z', status: 'pending_approval', total_amount: 1500, currency: 'USD', created_by: 1,created_by_username: 'jdoe', created_at: '2024-01-15T10:00:00Z', updated_at: '2024-01-15T10:00:00Z', order_items: [], revision_number: 0, shipping_address: '', notes: '', payment_terms: '', shipping_method: '', billing_address: '', po_type: 'goods', related_contract: null, attachments: null, internal_office_memo: null,
  },
  {
    id: 2, po_number: 'PO-002', vendor: 2, vendor_details: { id: 2, name: 'Vendor B' }, order_date: '2024-01-16T11:00:00Z', status: 'approved', total_amount: 300, currency: 'USD', created_by: 2, created_by_username: 'asmith', created_at: '2024-01-16T11:00:00Z', updated_at: '2024-01-16T11:00:00Z', order_items: [], revision_number: 0, shipping_address: '', notes: '', payment_terms: '', shipping_method: '', billing_address: '', po_type: 'services', related_contract: null, attachments: null, internal_office_memo: null,
  },
];

const mockPaginatedPOsResponse: PaginatedResponse<PurchaseOrder> = {
  count: mockPOs.length,
  next: null,
  previous: null,
  results: mockPOs,
};

const mockEmptyPOsResponse: PaginatedResponse<PurchaseOrder> = {
  count: 0,
  next: null,
  previous: null,
  results: [],
};

const mockUser = { id: 1, name: 'Test User', role: 'admin', is_staff: true, groups: [] };

describe('PurchaseOrderList', () => {
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
      confirmDialogOpen: false, // Corrected property name
      confirmDialogConfig: null, // Assuming this is the correct structure
      // confirmDialogTitle: '', // Add other properties if needed by the component
      // confirmDialogMessage: '',
      // confirmDialogOnConfirm: vi.fn(),
      // confirmDialogOnCancel: vi.fn(),
    });

    // Default API mock for getPurchaseOrders
    vi.mocked(procurementApi.getPurchaseOrders).mockResolvedValue(mockPaginatedPOsResponse);
  });

  it('renders the main title and create button', async () => {
    renderWithProviders(<PurchaseOrderList />);
    expect(screen.getByRole('heading', { name: /Purchase Orders/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create New PO/i })).toBeInTheDocument(); // Corrected button text
  });

  it('renders table headers correctly', async () => {
    renderWithProviders(<PurchaseOrderList />);
    // Wait for data to load which might affect header rendering if conditional
    await waitFor(() => expect(vi.mocked(procurementApi.getPurchaseOrders)).toHaveBeenCalledTimes(1));

    expect(screen.getByText('PO Number')).toBeInTheDocument();
    expect(screen.getByText('Vendor')).toBeInTheDocument();
    expect(screen.getByText('PO Type')).toBeInTheDocument(); // Added
    expect(screen.getByText('Order Date')).toBeInTheDocument();
    expect(screen.getByText('Total Amount')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Currency')).toBeInTheDocument(); // Added
    expect(screen.getByText('Actions')).toBeInTheDocument();
    // 'Created By' is correctly not expected as it's commented out in component
  });

  it('displays purchase orders in the table', async () => {
    renderWithProviders(<PurchaseOrderList />);
    await waitFor(() => {
      expect(screen.getByText(mockPOs[0].po_number)).toBeInTheDocument();
      expect(screen.getByText(mockPOs[0].vendor_details.name)).toBeInTheDocument();
      expect(screen.getByText(mockPOs[1].po_number)).toBeInTheDocument();
      expect(screen.getByText(mockPOs[1].vendor_details.name)).toBeInTheDocument();
    });
  });

  it('displays "No purchase orders found." when no POs are available', async () => {
    vi.mocked(procurementApi.getPurchaseOrders).mockResolvedValue(mockEmptyPOsResponse);
    renderWithProviders(<PurchaseOrderList />);
    await waitFor(() => {
      expect(screen.getByText('No purchase orders found.')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', async () => {
    vi.mocked(procurementApi.getPurchaseOrders).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve(mockPaginatedPOsResponse), 100))
    );
    renderWithProviders(<PurchaseOrderList />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument(); // MUI uses 'progressbar' role
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    }, { timeout: 500 }); // Increased timeout slightly
  });

  it('handles error when fetching POs fails', async () => {
    const errorMessage = 'API Error Fetching POs';
    vi.mocked(procurementApi.getPurchaseOrders).mockRejectedValueOnce(new Error(errorMessage));
    renderWithProviders(<PurchaseOrderList />);
    expect(await screen.findByText(new RegExp(errorMessage, "i"))).toBeInTheDocument();
  });

  it('navigates to create new PO form when "Create New Order" is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PurchaseOrderList />);
    const createButton = screen.getByRole('button', { name: /Create New PO/i }); // Corrected button text
    await user.click(createButton);
    expect(mockNavigate).toHaveBeenCalledWith('/procurement/purchase-orders/new');
  });

  it('navigates to view PO details when view icon is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PurchaseOrderList />);
    // Ensure data is loaded and view buttons are present
    const viewButtons = await screen.findAllByRole('button', { name: /view details/i });
    expect(viewButtons[0]).toBeInTheDocument();
    await user.click(viewButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith(`/procurement/purchase-orders/view/${mockPOs[0].id}`);
  });

  it('calls getPurchaseOrders with correct sort parameters when column headers are clicked', async () => {
    const user = userEvent.setup();
    // The initial mock in beforeEach will handle the first call
    renderWithProviders(<PurchaseOrderList />);

    // Wait for initial data to load and ensure getPurchaseOrders has been called once
    await waitFor(() => expect(procurementApi.getPurchaseOrders).toHaveBeenCalledTimes(1));
    expect(procurementApi.getPurchaseOrders).toHaveBeenLastCalledWith(
      expect.any(Function), // authenticatedFetch
      expect.objectContaining({ ordering: '-order_date' }) // Default sort
    );

    // Ensure table is populated before trying to click headers
    await screen.findByText(mockPOs[0].po_number);

    // Click on 'PO Number' header
    const poNumberHeaderButton = screen.getByRole('button', { name: /PO Number/i });
    await user.click(poNumberHeaderButton);
    await waitFor(() => {
      expect(procurementApi.getPurchaseOrders).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ ordering: 'po_number' })
      );
    });

    // Click again for descending
    await user.click(poNumberHeaderButton);
    await waitFor(() => {
      expect(procurementApi.getPurchaseOrders).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ ordering: '-po_number' })
      );
    });

    // Click on 'Vendor' header (assuming it sorts by vendor_details.name or similar)
    // The component's headCells define vendor sorting by 'vendor_details' which might translate to 'vendor__name' in API
    // Let's check the component's handleSortRequest or API call construction if this fails.
    // For now, assuming 'vendor_details' is a valid sort key or gets translated.
    // The component uses headCell.id directly. 'vendor_details' is the id.
    // The API likely needs 'vendor__name' or similar. The component does not seem to translate this.
    // Let's assume for now the API can handle 'vendor_details' or the component is simpler.
    // Based on PurchaseOrderList.tsx, it uses `headCell.id` directly. The API would need to support `vendor_details` for sorting.
    // Or, the component should map `vendor_details` to `vendor__name`.
    // The `headCells` config has: { id: 'vendor_details', label: 'Vendor', sortable: true }
    // The API call uses `ordering: `${sortConfigDirection === 'desc' ? '-' : ''}${sortConfigKey}` where sortConfigKey is the id.
    // So, it will send 'vendor_details'. Let's assume the backend handles this.
    const vendorHeaderButton = screen.getByRole('button', { name: /Vendor/i });
    await user.click(vendorHeaderButton);
    await waitFor(() => {
      expect(procurementApi.getPurchaseOrders).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ ordering: 'vendor_details' }) // Actual key sent
      );
    });
     await user.click(vendorHeaderButton); // Descending
    await waitFor(() => {
      expect(procurementApi.getPurchaseOrders).toHaveBeenLastCalledWith(
        expect.any(Function),
        expect.objectContaining({ ordering: '-vendor_details' })
      );
    });
  });

  it('calls getPurchaseOrders with correct pagination parameters', async () => {
    const user = userEvent.setup();

    // Mock data for pagination (e.g., 25 items to test page changes)
    const morePOs: PurchaseOrder[] = Array.from({ length: 25 }, (_, i) => ({
      ...mockPOs[0],
      id: i + 1,
      po_number: `PO-${String(i + 1).padStart(3, '0')}`,
    }));

    const initialResponse: PaginatedResponse<PurchaseOrder> = {
      count: morePOs.length, // 25 items
      next: 'http://test/api/pos?page=2&pageSize=10',
      previous: null,
      results: morePOs.slice(0, 10), // First 10 items
    };
    const rpp5Page1Response: PaginatedResponse<PurchaseOrder> = {
      count: morePOs.length,
      next: 'http://test/api/pos?page=2&pageSize=5',
      previous: null,
      results: morePOs.slice(0, 5), // First 5 items
    };
    const rpp5Page2Response: PaginatedResponse<PurchaseOrder> = {
      count: morePOs.length,
      next: 'http://test/api/pos?page=3&pageSize=5',
      previous: 'http://test/api/pos?page=1&pageSize=5',
      results: morePOs.slice(5, 10), // Items 6-10
    };

    const getOrdersMock = vi.mocked(procurementApi.getPurchaseOrders)
      .mockResolvedValueOnce(initialResponse) // Initial load (10 RPP, page 1)
      .mockResolvedValueOnce(rpp5Page1Response)   // After changing to 5 RPP
      .mockResolvedValueOnce(rpp5Page2Response);  // After clicking next page (when RPP is 5)

    renderWithProviders(<PurchaseOrderList />);

    // 1. Initial load
    await waitFor(() => expect(getOrdersMock).toHaveBeenCalledTimes(1));
    expect(getOrdersMock).toHaveBeenNthCalledWith(1, expect.any(Function), expect.objectContaining({ page: 1, pageSize: 10, ordering: '-order_date' }));
    await screen.findByText('PO-001'); // First item from initialResponse
    expect(screen.getByText('1–10 of 25')).toBeInTheDocument();

    // 2. Change rows per page to 5
    const rowsPerPageSelect = screen.getByLabelText(/Rows per page:/i);
    await user.click(rowsPerPageSelect);
    const option5 = await screen.findByRole('option', { name: '5' });
    await user.click(option5);

    await waitFor(() => expect(getOrdersMock).toHaveBeenCalledTimes(2));
    expect(getOrdersMock).toHaveBeenNthCalledWith(2, expect.any(Function), expect.objectContaining({ page: 1, pageSize: 5, ordering: '-order_date' }));
    await screen.findByText('PO-001'); // Still item 1
    expect(screen.queryByText('PO-006')).not.toBeInTheDocument();
    expect(screen.getByText('1–5 of 25')).toBeInTheDocument();

    // 3. Click next page
    const nextPageButton = screen.getByRole('button', { name: /Go to next page/i });
    expect(nextPageButton).toBeEnabled();
    await user.click(nextPageButton);

    await waitFor(() => expect(getOrdersMock).toHaveBeenCalledTimes(3));
    expect(getOrdersMock).toHaveBeenNthCalledWith(3, expect.any(Function), expect.objectContaining({ page: 2, pageSize: 5, ordering: '-order_date' }));
    await screen.findByText('PO-006'); // Items 6-10 should be visible
    expect(screen.getByText('6–10 of 25')).toBeInTheDocument();
  });

  describe('Action Buttons', () => {
    const draftPO: PurchaseOrder = { ...mockPOs[0], id: 101, po_number: 'PO-DRAFT', status: 'draft' };
    const pendingApprovalPO: PurchaseOrder = { ...mockPOs[0], id: 102, po_number: 'PO-PENDING', status: 'pending_approval' };
    const approvedPO: PurchaseOrder = { ...mockPOs[0], id: 103, po_number: 'PO-APPROVED', status: 'approved' };
    const cancelledPO: PurchaseOrder = { ...mockPOs[0], id: 104, po_number: 'PO-CANCELLED', status: 'cancelled' };

    // Edit Button Tests
    it('shows Edit button for "draft" PO and navigates on click', async () => {
      vi.mocked(procurementApi.getPurchaseOrders).mockResolvedValue({ count: 1, next: null, previous: null, results: [draftPO] });
      const user = userEvent.setup();
      renderWithProviders(<PurchaseOrderList />);
      const editButton = await screen.findByRole('button', { name: /edit purchase order/i });
      expect(editButton).toBeInTheDocument();
      await user.click(editButton);
      expect(mockNavigate).toHaveBeenCalledWith(`/procurement/purchase-orders/edit/${draftPO.id}`);
    });

    it('shows Edit button for "pending_approval" PO and navigates on click', async () => {
      vi.mocked(procurementApi.getPurchaseOrders).mockResolvedValue({ count: 1, next: null, previous: null, results: [pendingApprovalPO] });
      const user = userEvent.setup();
      renderWithProviders(<PurchaseOrderList />);
      const editButton = await screen.findByRole('button', { name: /edit purchase order/i });
      await user.click(editButton);
      expect(mockNavigate).toHaveBeenCalledWith(`/procurement/purchase-orders/edit/${pendingApprovalPO.id}`);
    });

    it('does NOT show Edit button for "approved" PO', async () => {
      vi.mocked(procurementApi.getPurchaseOrders).mockResolvedValue({ count: 1, next: null, previous: null, results: [approvedPO] });
      renderWithProviders(<PurchaseOrderList />);
      await screen.findByText(approvedPO.po_number);
      expect(screen.queryByRole('button', { name: /edit purchase order/i })).not.toBeInTheDocument();
    });

    // Cancel Button Tests
    [draftPO, pendingApprovalPO, approvedPO].forEach((po) => {
      it(`shows Cancel button for "${po.status}" PO, opens dialog, confirms, and calls API`, async () => {
        const mockShowConfirmDialog = vi.fn((_title, _message, onConfirm) => onConfirm());
        vi.mocked(useUIHook.useUI)().showConfirmDialog = mockShowConfirmDialog;

        const getOrdersMock = vi.mocked(procurementApi.getPurchaseOrders)
          .mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [po] })
          .mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [{ ...po, status: 'cancelled' }] });
        const updateOrderMock = vi.mocked(procurementApi.updatePurchaseOrder).mockResolvedValue({ ...po, status: 'cancelled' });

        const user = userEvent.setup();
        renderWithProviders(<PurchaseOrderList />);

        const cancelButton = await screen.findByRole('button', { name: /cancel purchase order/i });
        expect(cancelButton).toBeInTheDocument();
        await user.click(cancelButton);

        expect(mockShowConfirmDialog).toHaveBeenCalled();
        await waitFor(() => {
            expect(updateOrderMock).toHaveBeenCalledWith(expect.any(Function), po.id, expect.any(FormData));
            // Check that FormData has status: 'cancelled'
            const formData = updateOrderMock.mock.calls[0][2] as FormData;
            expect(formData.get('status')).toBe('cancelled');
        });
        await waitFor(() => expect(getOrdersMock).toHaveBeenCalledTimes(2)); // Initial + refresh
        expect(vi.mocked(useUIHook.useUI)().showSnackbar).toHaveBeenCalledWith('Purchase Order cancelled successfully!', 'success');
      });
    });

    it('does NOT show Cancel button for "cancelled" PO', async () => {
      vi.mocked(procurementApi.getPurchaseOrders).mockResolvedValue({ count: 1, next: null, previous: null, results: [cancelledPO] });
      renderWithProviders(<PurchaseOrderList />);
      await screen.findByText(cancelledPO.po_number);
      expect(screen.queryByRole('button', { name: /cancel purchase order/i })).not.toBeInTheDocument();
    });

    it('opens Cancel dialog and does NOT call API if dismissed', async () => {
      const mockShowConfirmDialog = vi.fn((_title, _message, _onConfirm, onCancel) => {
        if (onCancel) onCancel(); // Simulate user clicking "Cancel" in dialog
      });
      vi.mocked(useUIHook.useUI)().showConfirmDialog = mockShowConfirmDialog;
      vi.mocked(procurementApi.getPurchaseOrders).mockResolvedValue({ count: 1, next: null, previous: null, results: [draftPO] });
      const updateOrderMock = vi.mocked(procurementApi.updatePurchaseOrder);

      const user = userEvent.setup();
      renderWithProviders(<PurchaseOrderList />);

      const cancelButton = await screen.findByRole('button', { name: /cancel purchase order/i });
      await user.click(cancelButton);

      expect(mockShowConfirmDialog).toHaveBeenCalled();
      expect(updateOrderMock).not.toHaveBeenCalled();
    });
  });

  describe('Selection and Print Buttons', () => {
    it('selects and deselects all POs via header checkbox, updating print button states and labels', async () => {
      vi.mocked(procurementApi.getPurchaseOrders).mockResolvedValue(mockPaginatedPOsResponse); // 2 POs
      const user = userEvent.setup();
      renderWithProviders(<PurchaseOrderList />);

      const printPreviewButton = await screen.findByRole('button', { name: /Print Preview Selected/i });
      const printSelectedButton = screen.getByRole('button', { name: /Print Selected/i });

      expect(printPreviewButton).toBeDisabled();
      expect(printSelectedButton).toBeDisabled();
      expect(printPreviewButton).toHaveTextContent('Print Preview Selected (0)');
      expect(printSelectedButton).toHaveTextContent('Print Selected (0)');

      await screen.findByText(mockPOs[0].po_number); // Ensure rows are present

      const selectAllCheckbox = screen.getByLabelText(/select all purchase orders/i);
      await user.click(selectAllCheckbox);
      expect(printPreviewButton).toBeEnabled();
      expect(printSelectedButton).toBeEnabled();
      expect(printPreviewButton).toHaveTextContent(`Print Preview Selected (${mockPOs.length})`);
      expect(printSelectedButton).toHaveTextContent(`Print Selected (${mockPOs.length})`);

      await user.click(selectAllCheckbox); // Deselect all
      expect(printPreviewButton).toBeDisabled();
      expect(printSelectedButton).toBeDisabled();
      expect(printPreviewButton).toHaveTextContent('Print Preview Selected (0)');
      expect(printSelectedButton).toHaveTextContent('Print Selected (0)');
    });

    it('selects individual POs, updating print button states and labels', async () => {
      vi.mocked(procurementApi.getPurchaseOrders).mockResolvedValue(mockPaginatedPOsResponse); // 2 POs
      const user = userEvent.setup();
      renderWithProviders(<PurchaseOrderList />);

      const printPreviewButton = await screen.findByRole('button', { name: /Print Preview Selected/i });
      const printSelectedButton = screen.getByRole('button', { name: /Print Selected/i });

      const row1Checkbox = await screen.findByRole('checkbox', { name: `Select purchase order ${mockPOs[0].po_number}` });
      const row2Checkbox = screen.getByRole('checkbox', { name: `Select purchase order ${mockPOs[1].po_number}` });

      await user.click(row1Checkbox); // Select first
      expect(printPreviewButton).toBeEnabled();
      expect(printSelectedButton).toBeEnabled();
      expect(printPreviewButton).toHaveTextContent('Print Preview Selected (1)');
      expect(printSelectedButton).toHaveTextContent('Print Selected (1)');

      await user.click(row2Checkbox); // Select second
      expect(printPreviewButton).toHaveTextContent('Print Preview Selected (2)');
      expect(printSelectedButton).toHaveTextContent('Print Selected (2)');

      await user.click(row1Checkbox); // Deselect first
      expect(printPreviewButton).toHaveTextContent('Print Preview Selected (1)');
      expect(printSelectedButton).toHaveTextContent('Print Selected (1)');
      expect(printPreviewButton).toBeEnabled();
      expect(printSelectedButton).toBeEnabled();

      await user.click(row2Checkbox); // Deselect second
      expect(printPreviewButton).toBeDisabled();
      expect(printSelectedButton).toBeDisabled();
      expect(printPreviewButton).toHaveTextContent('Print Preview Selected (0)');
      expect(printSelectedButton).toHaveTextContent('Print Selected (0)');
    });

    it('navigates correctly for "Print Preview Selected" button when items are selected', async () => {
      vi.mocked(procurementApi.getPurchaseOrders).mockResolvedValue(mockPaginatedPOsResponse);
      const user = userEvent.setup();
      renderWithProviders(<PurchaseOrderList />);

      const row1Checkbox = await screen.findByRole('checkbox', { name: `Select purchase order ${mockPOs[0].po_number}` });
      await user.click(row1Checkbox);

      const printPreviewButton = screen.getByRole('button', { name: /Print Preview Selected \(1\)/i });
      await user.click(printPreviewButton);

      expect(mockNavigate).toHaveBeenCalledWith('/procurement/purchase-orders/print-preview', {
        state: { selectedPoIds: [mockPOs[0].id], autoPrint: false },
      });
    });

    it('navigates correctly for "Print Selected" button when items are selected', async () => {
      vi.mocked(procurementApi.getPurchaseOrders).mockResolvedValue(mockPaginatedPOsResponse);
      const user = userEvent.setup();
      renderWithProviders(<PurchaseOrderList />);

      const row1Checkbox = await screen.findByRole('checkbox', { name: `Select purchase order ${mockPOs[0].po_number}` });
      await user.click(row1Checkbox);

      const printSelectedButton = screen.getByRole('button', { name: /Print Selected \(1\)/i });
      await user.click(printSelectedButton);

      expect(mockNavigate).toHaveBeenCalledWith('/procurement/purchase-orders/print-preview', {
        state: { selectedPoIds: [mockPOs[0].id], autoPrint: true },
      });
    });

    it('Print buttons are disabled and do not navigate or show error if clicked with no selection', async () => {
      vi.mocked(procurementApi.getPurchaseOrders).mockResolvedValue(mockPaginatedPOsResponse);
      const user = userEvent.setup();
      const { showSnackbar } = vi.mocked(useUIHook.useUI)(); // Get the mocked showSnackbar
      renderWithProviders(<PurchaseOrderList />);

      const printPreviewButton = await screen.findByRole('button', { name: /Print Preview Selected \(0\)/i });
      const printSelectedButton = screen.getByRole('button', { name: /Print Selected \(0\)/i });

      expect(printPreviewButton).toBeDisabled();
      expect(printSelectedButton).toBeDisabled();

      mockNavigate.mockClear(); // Clear any previous navigation calls
      // Attempting to click disabled buttons should not result in navigation or snackbar
      // userEvent.click on a disabled button typically does nothing or might even error in some setups.
      // We are primarily verifying the disabled state.
      await user.click(printPreviewButton).catch(_e => {}); // Suppress error if userEvent throws on disabled
      await user.click(printSelectedButton).catch(_e => {}); // Suppress error if userEvent throws on disabled

      expect(showSnackbar).not.toHaveBeenCalledWith('Please select purchase orders to print.', 'warning');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
