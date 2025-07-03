// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../../../context/auth/AuthContext';
import { UIContextProvider } from '../../../../context/UIContext/UIContextProvider';
import CheckRequestDetailView from './CheckRequestDetailView';
import * as procurementApi from '../../../../api/procurementApi';
// import * as useAuthHook from '../../../../context/auth/useAuth'; // Unused import
import type { CheckRequest, CheckRequestStatus, PaymentMethod } from '../../types';
import type { AuthUser } from '../../../../context/auth/AuthContextDefinition';

// Mock API module
vi.mock('../../../../api/procurementApi');

// Mock context hooks
const mockAuthenticatedFetch = vi.fn();
const mockAuthUser: AuthUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  is_staff: true,
  groups: ['admin_group'],
};

vi.mock('../../../../context/auth/useAuth', () => ({
  useAuth: () => ({
    authenticatedFetch: mockAuthenticatedFetch,
    user: mockAuthUser,
    token: 'test-token',
    isAuthenticated: true,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
let mockUseParamsValue: { checkRequestId?: string } = {}; // Define a mutable object for useParams value

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParamsValue, // Return the mutable object
  };
});

const renderComponent = (checkRequestIdParam?: string) => {
  mockUseParamsValue = { checkRequestId: checkRequestIdParam }; // Update the mock value
  return render(
    <MemoryRouter initialEntries={checkRequestIdParam ? [`/cr/${checkRequestIdParam}`] : ['/cr/1']}>
      <AuthProvider>
        <UIContextProvider>
          <Routes>
            <Route path="/cr/:checkRequestId" element={<CheckRequestDetailView />} />
            <Route path="/procurement/check-requests/print-preview" element={<div>Print Preview Page Mock</div>} />
          </Routes>
        </UIContextProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

const baseCheckRequestData: CheckRequest = {
  id: 1,
  cr_id: 'CR-2024-001',
  purchase_order: 101,
  purchase_order_number: 'PO-101',
  invoice_number: 'INV-001',
  invoice_date: '2024-07-01T00:00:00Z',
  amount: '1500.75',
  currency: 'USD',
  payee_name: 'Super Vendor LLC',
  payee_address: '123 Vendor Lane, Tech City, TC 54321',
  reason_for_payment: 'Payment for services rendered under PO-101.',
  requested_by: 1,
  requested_by_username: 'john.doe',
  request_date: '2024-07-15T10:00:00Z',
  status: 'approved' as CheckRequestStatus,
  approved_by_accounts: 2,
  approved_by_accounts_username: 'jane.accountant',
  accounts_approval_date: '2024-07-16T14:30:00Z',
  accounts_comments: 'Approved by accounts department.',
  payment_method: 'ach' as PaymentMethod,
  payment_date: '2024-07-20T00:00:00Z',
  transaction_id: 'ACH-TXN-987654321',
  payment_notes: 'Payment processed successfully via ACH.',
  expense_category: 1,
  expense_category_name: 'Consulting Services',
  is_urgent: true,
  recurring_payment: null,
  recurring_payment_details: null,
  attachments: 'http://example.com/cr_attachment.pdf',
  created_at: '2024-07-15T09:00:00Z', // Added based on type update
  updated_at: '2024-07-20T10:00:00Z', // Added based on type update
};


describe('CheckRequestDetailView', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockAuthenticatedFetch.mockResolvedValue({});
    vi.mocked(procurementApi.getCheckRequestById).mockResolvedValue(baseCheckRequestData);
  });

  it('renders loading state initially', () => {
    vi.mocked(procurementApi.getCheckRequestById).mockImplementation(() => new Promise(() => {}));
    renderComponent('1');
    expect(screen.getByText(/Loading Check Request Details.../i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state if checkRequestId is not provided', async () => {
    renderComponent(undefined);
    await waitFor(() => {
      expect(screen.getByText(/Check Request ID is missing or authentication is not available./i)).toBeInTheDocument();
    });
  });

  it('renders error state if checkRequestId is not a number', async () => {
    renderComponent('abc');
    await waitFor(() => {
        expect(screen.getByText(/Failed to fetch check request details: Invalid Check Request ID format./i)).toBeInTheDocument();
    });
  });

  it('renders error state if API call fails', async () => {
    const errorMessage = 'Network Error XYZ';
    vi.mocked(procurementApi.getCheckRequestById).mockRejectedValueOnce(new Error(errorMessage));
    renderComponent('1');
    await waitFor(() => {
      expect(screen.getByText(`Failed to fetch check request details: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  it('renders "not found" state if API returns no check request', async () => {
    vi.mocked(procurementApi.getCheckRequestById).mockImplementationOnce(async () => null as any); // Cast to any
    renderComponent('1');
    await waitFor(() => {
      expect(screen.getByText(/Check Request not found./i)).toBeInTheDocument();
    });
  });

  describe('Successful Data Display (Happy Path)', () => {
    // Helper to re-render with potentially different data for specific display tests
    const setupAndRender = (data: CheckRequest | null) => {
        vi.mocked(procurementApi.getCheckRequestById).mockImplementation(async () => data as any); // Cast to any
        renderComponent(data ? String(data.id) : '1');
    };

    it('renders all key check request details correctly', async () => {
      setupAndRender(baseCheckRequestData);
      await waitFor(() => {
        expect(screen.getByText(/Check Request Details/i)).toBeInTheDocument();
      });

      // Request Information
      expect(screen.getByText(`Request Information (${baseCheckRequestData.cr_id})`)).toBeInTheDocument();
      expect(screen.getByText('Status:')).toBeInTheDocument();
      expect(screen.getByText(baseCheckRequestData.status.replace(/_/g, ' ').toUpperCase())).toBeInTheDocument();
      expect(screen.getByText('Requested By:')).toBeInTheDocument();
      expect(screen.getByText(baseCheckRequestData.requested_by_username)).toBeInTheDocument();
      expect(screen.getByText('Request Date:')).toBeInTheDocument();
      expect(screen.getByText(new Date(baseCheckRequestData.request_date).toLocaleString())).toBeInTheDocument();
      expect(screen.getByText('Urgent:')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('Reason for Payment:')).toBeInTheDocument();
      expect(screen.getByText(baseCheckRequestData.reason_for_payment)).toBeInTheDocument();
      expect(screen.getByText('Expense Category:')).toBeInTheDocument();
      expect(screen.getByText(baseCheckRequestData.expense_category_name!)).toBeInTheDocument();

      // Payment Details
      expect(screen.getByText('Payment Details')).toBeInTheDocument();
      expect(screen.getByText('Payee Name:')).toBeInTheDocument();
      expect(screen.getByText(baseCheckRequestData.payee_name)).toBeInTheDocument();
      expect(screen.getByText('Amount:')).toBeInTheDocument();
      expect(screen.getByText(`$${Number(baseCheckRequestData.amount).toFixed(2)}`)).toBeInTheDocument();
      expect(screen.getByText('Currency:')).toBeInTheDocument();
      expect(screen.getByText(baseCheckRequestData.currency!)).toBeInTheDocument();
      expect(screen.getByText('PO Number:')).toBeInTheDocument();
      expect(screen.getByText(baseCheckRequestData.purchase_order_number!)).toBeInTheDocument();
      expect(screen.getByText('Invoice Number:')).toBeInTheDocument();
      expect(screen.getByText(baseCheckRequestData.invoice_number!)).toBeInTheDocument();
      expect(screen.getByText('Invoice Date:')).toBeInTheDocument();
      // Use toLocaleDateString for date-only fields for consistency with component's formatDateString logic for YYYY-MM-DD
      expect(screen.getByText(new Date(baseCheckRequestData.invoice_date! + 'T00:00:00').toLocaleDateString())).toBeInTheDocument();
      expect(screen.getByText('Payee Address:')).toBeInTheDocument();
      expect(screen.getByText(baseCheckRequestData.payee_address!)).toBeInTheDocument();

      const attachmentLink = screen.getByRole('link', { name: /View CR Attachment/i });
      expect(attachmentLink).toBeInTheDocument();
      expect(attachmentLink).toHaveAttribute('href', baseCheckRequestData.attachments);

      // Approval & Processing Section (status is 'approved', so payment processing details for 'paid' or 'payment_processing' won't show)
      expect(screen.getByText('Approval & Processing')).toBeInTheDocument();
      expect(screen.getByText('Approved By (Accounts):')).toBeInTheDocument();
      expect(screen.getByText(baseCheckRequestData.approved_by_accounts_username!)).toBeInTheDocument();
      expect(screen.getByText('Accounts Approval Date:')).toBeInTheDocument();
      expect(screen.getByText(new Date(baseCheckRequestData.accounts_approval_date!).toLocaleString())).toBeInTheDocument();
      expect(screen.getByText('Accounts Comments:')).toBeInTheDocument();
      expect(screen.getByText(baseCheckRequestData.accounts_comments!)).toBeInTheDocument();

      // For 'approved' status, payment specific details are not rendered by component logic
      expect(screen.queryByText('Payment Method:')).not.toBeInTheDocument();
      expect(screen.queryByText('Payment Date:')).not.toBeInTheDocument();
      expect(screen.queryByText('Transaction ID/Check #:')).not.toBeInTheDocument();
    });

    it('shows N/A or hides optional fields if not provided', async () => {
      const minimalData: CheckRequest = {
        ...baseCheckRequestData,
        cr_id: null,
        purchase_order: null, purchase_order_number: null,
        invoice_number: null, invoice_date: null,
        payee_address: null,
        expense_category: null, expense_category_name: null,
        recurring_payment: null, recurring_payment_details: null,
        attachments: null,
        approved_by_accounts: null, approved_by_accounts_username: null,
        accounts_approval_date: null, accounts_comments: null,
        payment_method: null, payment_date: null,
        transaction_id: null, payment_notes: null,
        is_urgent: false,
        status: 'pending_approval' // Keep a status that shows the approval section
      };
      setupAndRender(minimalData);

      await waitFor(() => {
        expect(screen.getByText(/Request Information/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Request Information \(N\/A\)/i)).toBeInTheDocument(); // cr_id is null
      expect(screen.getByText('Urgent:')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument(); // for is_urgent: false
      expect(screen.queryByText('Expense Category:')).not.toBeInTheDocument();
      expect(screen.queryByText('PO Number:')).not.toBeInTheDocument();
      expect(screen.queryByText('Invoice Number:')).not.toBeInTheDocument();
      expect(screen.queryByText('Invoice Date:')).not.toBeInTheDocument();
      expect(screen.queryByText('Payee Address:')).not.toBeInTheDocument();
      expect(screen.queryByText('Attachment:')).not.toBeInTheDocument();

      expect(screen.getByText('Approval & Processing')).toBeInTheDocument();
      expect(screen.getByText('Approved By (Accounts):').nextSibling?.textContent?.trim()).toBe('N/A');
      expect(screen.getByText('Accounts Approval Date:').nextSibling?.textContent?.trim()).toBe('N/A');
      expect(screen.queryByText('Accounts Comments:')).not.toBeInTheDocument(); // Comments only show if present
    });

    it('shows full payment details for "paid" status', async () => {
        const paidData: CheckRequest = {
            ...baseCheckRequestData,
            status: 'paid',
            payment_method: 'check',
            payment_date: '2024-07-28T00:00:00Z',
            transaction_id: 'CHK12345',
            payment_notes: 'Final payment made.'
        };
        setupAndRender(paidData);
        await waitFor(() => expect(screen.getByText('Payment Method:')).toBeInTheDocument());
        expect(screen.getByText('Check')).toBeInTheDocument(); // Formatted
        expect(screen.getByText('Payment Date:')).toBeInTheDocument();
        expect(screen.getByText(new Date(paidData.payment_date!).toLocaleString())).toBeInTheDocument();
        expect(screen.getByText('Transaction ID/Check #:')).toBeInTheDocument();
        expect(screen.getByText(paidData.transaction_id!)).toBeInTheDocument();
        expect(screen.getByText('Payment Notes:')).toBeInTheDocument();
        expect(screen.getByText(paidData.payment_notes!)).toBeInTheDocument();
    });
  });

  describe('Conditional Rendering for Approval & Processing Section', () => {
    const statusesNotShowingFullApproval: CheckRequestStatus[] = ['pending_submission', 'cancelled'];
    statusesNotShowingFullApproval.forEach(status => {
        it(`does NOT show Approval & Processing section for status: ${status}`, async () => {
            const testData: CheckRequest = { ...baseCheckRequestData, status };
            vi.mocked(procurementApi.getCheckRequestById).mockResolvedValue(testData);
            renderComponent(String(testData.id));
            await waitFor(() => expect(screen.getByText('Request Information')).toBeInTheDocument());
            expect(screen.queryByText('Approval & Processing')).not.toBeInTheDocument();
        });
    });

    const statusesShowingApproval: CheckRequestStatus[] = ['pending_approval', 'approved', 'rejected', 'payment_processing', 'paid'];
    statusesShowingApproval.forEach(status => {
        it(`SHOWS Approval & Processing section for status: ${status}`, async () => {
            const testData: CheckRequest = { ...baseCheckRequestData, status, accounts_approval_date: '2024-01-01T00:00:00Z', approved_by_accounts_username: 'accUser' }; // ensure some data to render section
            vi.mocked(procurementApi.getCheckRequestById).mockResolvedValue(testData);
            renderComponent(String(testData.id));
            await waitFor(() => expect(screen.getByText('Request Information')).toBeInTheDocument());
            expect(screen.getByText('Approval & Processing')).toBeInTheDocument();
        });
    });
  });

  describe('Navigation and Actions', () => {
    beforeEach(() => {
        vi.mocked(procurementApi.getCheckRequestById).mockResolvedValue(baseCheckRequestData);
        renderComponent(String(baseCheckRequestData.id));
    });

    it('calls navigate(-1) when "Back" button is clicked', async () => {
      await waitFor(() => expect(screen.getByText(/Check Request Details/i)).toBeInTheDocument());
      const backButton = screen.getByRole('button', { name: /Back/i });
      await userEvent.click(backButton);
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('navigates to print preview page when "Print" button is clicked', async () => {
      await waitFor(() => expect(screen.getByText(/Check Request Details/i)).toBeInTheDocument());
      const printButton = screen.getByRole('button', { name: /Print/i });
      await userEvent.click(printButton);
      expect(mockNavigate).toHaveBeenCalledWith(
        '/procurement/check-requests/print-preview',
        { state: { checkRequestId: baseCheckRequestData.id, autoPrint: false } }
      );
    });
  });
});
