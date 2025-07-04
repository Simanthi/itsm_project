// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom';
import { AuthContext, type AuthContextType } from '../../../../context/auth/AuthContextDefinition';
import PurchaseOrderDetailView from './PurchaseOrderDetailView';
import { getPurchaseOrderById } from '../../../../api/procurementApi';
import type { PurchaseOrder, PurchaseOrderStatus, OrderItem } from '../../types'; // POType removed

// Mock the procurement API
vi.mock('../../../../api/procurementApi');

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual() as typeof import('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: vi.fn(), // Will be configured by vi.mocked(useParams).mockReturnValue in tests
  };
});

const mockAuthenticatedFetch = vi.fn();
const mockAuthContextValue: AuthContextType = {
  user: { id: 1, name: 'Test User', email: 'test@example.com', role: 'user', is_staff: false, groups: [] },
  token: 'test-token',
  isAuthenticated: true,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  authenticatedFetch: mockAuthenticatedFetch,
};

const renderComponent = (poIdParam?: string) => {
  vi.mocked(useParams).mockReturnValue({ poId: poIdParam });

  render(
    <AuthContext.Provider value={mockAuthContextValue}>
      <MemoryRouter initialEntries={[`/po/${poIdParam || '1'}`]}>
        <Routes>
          <Route path="/po/:poId" element={<PurchaseOrderDetailView />} />
          <Route path="/procurement/purchase-orders/print-preview" element={<div>PO Print Preview Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

const sampleOrderItem: OrderItem = {
  id: 1,
  item_description: 'Laptop Pro 15 inch',
  product_code: 'LP15',
  quantity: 2,
  unit_price: 1200,
  total_price: 2400,
  // currency: 'USD', // Currency is typically on the PO level, not item level in this model
  gl_account: 101,
  gl_account_code: 'EXP-IT-HW',
  received_quantity: 1,
  line_item_status: 'partially_received',
  tax_rate: 8.5,
  discount_type: 'percentage',
  discount_value: 5, // 5%
  // calculated_discount_amount: 120, // (2400 * 0.05)
  // price_after_discount: 2280,
  // calculated_tax_amount: 193.80, // (2280 * 0.085)
  // final_total_price: 2473.80
};

const basePurchaseOrderData: PurchaseOrder = {
  id: 1,
  po_number: 'PO-2023-00001',
  vendor: 1,
  vendor_details: { id: 1, name: 'Tech Solutions LLC' }, // Removed contact_person, email, phone to match VendorSummary
  order_date: '2023-10-15T00:00:00Z',
  expected_delivery_date: '2023-11-15T00:00:00Z',
  status: 'pending_approval' as PurchaseOrderStatus,
  total_amount: 2473.80,
  currency: 'USD',
  created_by: 1,
  created_by_username: 'AdminUser',
  created_at: '2023-10-14T00:00:00Z',
  updated_at: '2023-10-14T00:00:00Z',
  order_items: [sampleOrderItem],
  po_type: 'goods', // Changed to a valid string literal from the PurchaseOrder type
  notes: 'Urgent order for new project.',
  payment_terms: 'Net 30',
  shipping_address: '123 Main St, Anytown, USA',
  billing_address: '456 Corporate Dr, Business City, USA',
  shipping_method: 'Express',
  revision_number: 0,
  attachments: 'http://example.com/po_attachment.pdf',
  internal_office_memo: 10, // IOM ID
  related_contract: 20, // Contract ID - Renamed from related_contract_id
  related_contract_details: 'Contract C20-Alpha',
};


describe('PurchaseOrderDetailView', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuthenticatedFetch.mockResolvedValue({}); // Default for successful auth context
    vi.mocked(useParams).mockReset(); // Reset useParams mock for each test
  });

  it('renders loading state initially', () => {
    vi.mocked(getPurchaseOrderById).mockImplementation(() => new Promise(() => {})); // Never resolves
    renderComponent('1');
    expect(screen.getByText(/Loading Purchase Order Details.../i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state if poId is not provided', async () => {
    renderComponent(undefined);
    await waitFor(() => {
      expect(screen.getByText(/Purchase Order ID is missing or authentication is not available./i)).toBeInTheDocument();
    });
  });

  it('renders error state if poId is not a number', async () => {
    renderComponent('invalid-id');
    await waitFor(() => {
        expect(screen.getByText(/Failed to fetch purchase order details: Invalid Purchase Order ID format./i)).toBeInTheDocument();
    });
  });

  it('renders error state if API call fails', async () => {
    const errorMessage = 'API Network Error';
    vi.mocked(getPurchaseOrderById).mockRejectedValueOnce(new Error(errorMessage));
    renderComponent('1');
    await waitFor(() => {
      expect(screen.getByText(`Failed to fetch purchase order details: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  it('renders "not found" state if API call for non-existent ID fails', async () => {
    const notFoundError = new Error('Purchase Order not found');
    vi.mocked(getPurchaseOrderById).mockRejectedValueOnce(notFoundError);
    renderComponent('1'); // Attempt to fetch PO with ID '1' that will be "not found"
    await waitFor(() => {
      // Component displays the error message in an Alert
      expect(screen.getByText(/Failed to fetch purchase order details: Purchase Order not found/i)).toBeInTheDocument();
    });
  });

  // More tests for successful data display, different data scenarios, and navigation will be added here.
  // For now, just ensuring the basic states work.

  describe('Successful Data Display', () => {
    it('renders all purchase order details correctly with full data', async () => {
      vi.mocked(getPurchaseOrderById).mockResolvedValueOnce(basePurchaseOrderData);
      renderComponent(basePurchaseOrderData.id.toString());

      await waitFor(() => {
        expect(screen.getByText('Purchase Order Details')).toBeInTheDocument();
      });

      // Header Section
      expect(screen.getByText(/^PO Number:/).parentElement).toHaveTextContent(`PO Number: ${basePurchaseOrderData.po_number}`);
      expect(screen.getByText(/^Status:/).parentElement).toHaveTextContent(`Status:${basePurchaseOrderData.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`); // Removed space after colon
      expect(screen.getByText(/^Order Date:/).parentElement).toHaveTextContent(`Order Date: ${new Date(basePurchaseOrderData.order_date).toLocaleDateString()}`);
      expect(screen.getByText(/^Expected Delivery:/).parentElement).toHaveTextContent(`Expected Delivery: ${new Date(basePurchaseOrderData.expected_delivery_date!).toLocaleDateString()}`);
      expect(screen.getByText(/^PO Type:/).parentElement).toHaveTextContent(`PO Type: ${basePurchaseOrderData.po_type!.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
      expect(screen.getByText(/^Currency:/).parentElement).toHaveTextContent(`Currency: ${basePurchaseOrderData.currency}`);

      // Vendor & Creator Section
      expect(screen.getByText(/^Vendor:/).parentElement).toHaveTextContent(`Vendor: ${basePurchaseOrderData.vendor_details!.name}`);
      expect(screen.getByText(/^Created By:/).parentElement).toHaveTextContent(`Created By: ${basePurchaseOrderData.created_by_username}`);
      expect(screen.getByText(/^Created At:/).parentElement).toHaveTextContent(`Created At: ${new Date(basePurchaseOrderData.created_at).toLocaleDateString()}`);
      expect(screen.getByText(/^Revision:/).parentElement).toHaveTextContent(`Revision: ${basePurchaseOrderData.revision_number}`);
      expect(screen.getByText(/^Linked IOM ID:/).parentElement).toHaveTextContent(`Linked IOM ID: ${basePurchaseOrderData.internal_office_memo}`);
      expect(screen.getByText(/^Related Contract:/).parentElement).toHaveTextContent(`Related Contract: ${basePurchaseOrderData.related_contract_details}`);

      // Addressing & Shipping
      expect(screen.getByText('Shipping Address')).toBeInTheDocument();
      expect(screen.getByText(basePurchaseOrderData.shipping_address!)).toBeInTheDocument();
      expect(screen.getByText(/^Shipping Method:/).parentElement).toHaveTextContent(`Shipping Method: ${basePurchaseOrderData.shipping_method}`);
      expect(screen.getByText('Billing Address')).toBeInTheDocument();
      expect(screen.getByText(basePurchaseOrderData.billing_address!)).toBeInTheDocument();

      // Attachment
      const attachmentLink = screen.getByRole('link', { name: /View PO Attachment/i });
      expect(attachmentLink).toBeInTheDocument();
      expect(attachmentLink).toHaveAttribute('href', basePurchaseOrderData.attachments);

      // Order Items Table
      expect(screen.getByText('Order Items')).toBeInTheDocument();
      const item = basePurchaseOrderData.order_items[0];
      // Check a few key cells for the first item
      expect(screen.getByText(item.item_description)).toBeInTheDocument();
      expect(screen.getByText(item.product_code!)).toBeInTheDocument();
      expect(screen.getAllByText(item.quantity.toString())[0]).toBeInTheDocument(); // There might be multiple '2's, ensure it's in the table context
      expect(screen.getByText(`$${item.unit_price!.toFixed(2)}`)).toBeInTheDocument(); // Added non-null assertion
      expect(screen.getByText(item.gl_account_code!)).toBeInTheDocument();
      expect(screen.getByText(item.received_quantity!.toString())).toBeInTheDocument();
      expect(screen.getByText(item.line_item_status!.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))).toBeInTheDocument();
      expect(screen.getByText(`${item.tax_rate}%`)).toBeInTheDocument();
      expect(screen.getByText(item.discount_type!)).toBeInTheDocument();
      expect(screen.getByText(`$${item.discount_value!.toFixed(2)}`)).toBeInTheDocument();
      expect(screen.getByText(`$${item.total_price.toFixed(2)}`)).toBeInTheDocument();

      // Summary Section
      expect(screen.getByText(/^Overall Total:/).parentElement).toHaveTextContent(`Overall Total: $${basePurchaseOrderData.total_amount.toFixed(2)}`);

      // Notes & Payment Terms
      expect(screen.getByText('Payment Terms')).toBeInTheDocument();
      expect(screen.getByText(basePurchaseOrderData.payment_terms!)).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByText(basePurchaseOrderData.notes!)).toBeInTheDocument();
    });
  });

  describe('Navigation and Actions', () => {
    it('calls navigate(-1) when "Back" button is clicked', async () => {
      vi.mocked(getPurchaseOrderById).mockResolvedValueOnce(basePurchaseOrderData);
      renderComponent(basePurchaseOrderData.id.toString());
      await waitFor(() => { // Wait for data to load
        expect(screen.getByText('Purchase Order Details')).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /Back/i });
      await userEvent.click(backButton);
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('navigates to print preview page when "Print PO" button is clicked', async () => {
      vi.mocked(getPurchaseOrderById).mockResolvedValueOnce(basePurchaseOrderData);
      renderComponent(basePurchaseOrderData.id.toString());
      await waitFor(() => { // Wait for data to load
        expect(screen.getByText('Purchase Order Details')).toBeInTheDocument();
      });

      const printButton = screen.getByRole('button', { name: /Print PO/i });
      await userEvent.click(printButton);
      expect(mockNavigate).toHaveBeenCalledWith(
        '/procurement/purchase-orders/print-preview',
        { state: { poId: basePurchaseOrderData.id, autoPrint: false } }
      );
    });
  });
});
