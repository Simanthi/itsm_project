// Test file for CheckRequestDetailView.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'; // Import useParams
import { AuthContext, AuthContextType } from '../../../../context/auth/AuthContextDefinition'; // Corrected import path
import CheckRequestDetailView from './CheckRequestDetailView';
import * as procurementApi from '../../../../api/procurementApi';
import { CheckRequest } from '../../types';

// Mock react-router-dom hooks
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: vi.fn(), // This will be the mock for useParams
  };
});

// Mock procurementApi
vi.mock('../../../../api/procurementApi');

const mockGetCheckRequestById = procurementApi.getCheckRequestById as vi.Mock;

const mockAuthContextValue: AuthContextType = {
  user: { id: 1, name: 'Test User', username: 'testuser', email: 'test@example.com', permissions: [], is_staff: false, is_superuser: false },
  accessToken: 'test-token',
  refreshToken: 'refresh-token',
  login: vi.fn(),
  logout: vi.fn(),
  refreshAccessToken: vi.fn(),
  authenticatedFetch: vi.fn().mockImplementation((url, options) => {
    return fetch(url, {
      ...options,
      headers: { ...options?.headers, Authorization: `Bearer test-token` },
    });
  }),
  isRefreshing: false,
  loginError: null,
  setLoginError: vi.fn(),
};

const renderWithRouterAndAuth = (
  ui: React.ReactElement,
  { route = '/', path = '/', initialEntries = [route] } = {},
  authValue: AuthContextType = mockAuthContextValue
) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path={path} element={ui} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

describe('CheckRequestDetailView', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default mock for useParams, can be overridden in specific tests
    // useParams (imported from 'react-router-dom') is now the mock function itself.
    vi.mocked(useParams).mockReturnValue({ checkRequestId: '1' }); // Corrected here
    // Ensure authenticatedFetch is mocked for each test
    mockAuthContextValue.authenticatedFetch = vi.fn().mockImplementation(async (resource, init) => {
      // This basic mock assumes success. Specific tests might need to adjust it.
      // For API calls, it should return a Promise that resolves to a Response object.
      if (typeof resource === 'string' && resource.startsWith('/api/')) {
        return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    });
    mockGetCheckRequestById.mockResolvedValue(null); // Default to not found to avoid console errors for unmocked calls
  });

  it('displays loading indicator while fetching data', async () => {
    mockGetCheckRequestById.mockImplementation(() => {
      return new Promise(() => {}); // Simulate pending promise
    });

    renderWithRouterAndAuth(<CheckRequestDetailView />, {
      route: '/procurement/check-requests/detail/1',
      path: '/procurement/check-requests/detail/:checkRequestId',
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/Loading Check Request Details.../i)).toBeInTheDocument();
  });

  it('displays error message if checkRequestId is missing', async () => {
    vi.mocked(useParams).mockReturnValue({ checkRequestId: undefined });

    renderWithRouterAndAuth(<CheckRequestDetailView />, {
      route: '/procurement/check-requests/detail/', // No ID
      path: '/procurement/check-requests/detail/:checkRequestId?',
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Check Request ID is missing or authentication is not available./i)
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('displays error message if checkRequestId is not a number', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(useParams).mockReturnValue({ checkRequestId: 'abc' });
    // No need to mock getCheckRequestById as it should fail before that

    renderWithRouterAndAuth(<CheckRequestDetailView />, {
      route: '/procurement/check-requests/detail/abc',
      path: '/procurement/check-requests/detail/:checkRequestId',
    });

    await waitFor(() => {
      expect(screen.getByText(/Invalid Check Request ID format./i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
     // Check for back button
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it('displays error message if API call fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const errorMessage = 'Network Error';
    mockGetCheckRequestById.mockRejectedValue(new Error(errorMessage));

    renderWithRouterAndAuth(<CheckRequestDetailView />, {
      route: '/procurement/check-requests/detail/1',
      path: '/procurement/check-requests/detail/:checkRequestId',
    });

    await waitFor(() => {
      expect(
        screen.getByText(`Failed to fetch check request details: ${errorMessage}`)
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
     // Check for back button
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it('displays "Check Request not found" message if API returns null', async () => {
    mockGetCheckRequestById.mockResolvedValue(null);

    renderWithRouterAndAuth(<CheckRequestDetailView />, {
      route: '/procurement/check-requests/detail/999', // Non-existent ID
      path: '/procurement/check-requests/detail/:checkRequestId',
    });

    await waitFor(() => {
      expect(screen.getByText(/Check Request not found./i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    // Check for back button
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  // Further tests will be added here

  const fullMockCheckRequest: CheckRequest = {
    id: 1,
    cr_id: 'CR001',
    requested_by_user: 1,
    requested_by_username: 'Alice Wonderland',
    request_date: '2023-10-26T10:00:00Z',
    status: 'approved',
    payee_name: 'Mad Hatter Supplies',
    amount: '150.75',
    currency: 'USD',
    reason_for_payment: 'Tea party expenses, very important.',
    is_urgent: true,
    payee_address: '123 Wonderland Lane, Fantasy City, FC 54321',
    expense_category: 1,
    expense_category_name: 'Catering',
    purchase_order_number: 'PO12345',
    invoice_number: 'INV-TEA-001',
    invoice_date: '2023-10-25', // YYYY-MM-DD format
    attachments: '/media/procurement/cr_attachments/tea_party_invoice.pdf',
    // Approval & Processing fields
    approved_by_accounts_user: 2,
    approved_by_accounts_username: 'Bob The Builder',
    accounts_approval_date: '2023-10-27T11:00:00Z',
    accounts_comments: 'Looks good, approved for payment.',
    payment_method: 'check',
    payment_date: '2023-10-28T14:30:00Z',
    transaction_id: 'CHECK#789',
    payment_notes: 'Paid via check, sent by carrier pigeon.',
    recurring_payment_details: 'Monthly tea subscription',
    created_at: '2023-10-26T10:00:00Z',
    updated_at: '2023-10-28T14:30:00Z',
  };

  it('displays all check request details correctly on successful fetch (happy path)', async () => {
    mockGetCheckRequestById.mockResolvedValue(fullMockCheckRequest);
    vi.mocked(useParams).mockReturnValue({ checkRequestId: String(fullMockCheckRequest.id) });


    renderWithRouterAndAuth(<CheckRequestDetailView />, {
      route: `/procurement/check-requests/detail/${fullMockCheckRequest.id}`,
      path: '/procurement/check-requests/detail/:checkRequestId',
    });

    await waitFor(() => {
      expect(screen.getByText(`Request Information (${fullMockCheckRequest.cr_id})`)).toBeInTheDocument();
    });

    // Request Information
    expect(screen.getByText(fullMockCheckRequest.status.replace(/_/g, ' '))).toBeInTheDocument(); // Status Chip
    expect(screen.getByText(fullMockCheckRequest.requested_by_username)).toBeInTheDocument();
    expect(screen.getByText(new Date(fullMockCheckRequest.request_date).toLocaleString())).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument(); // is_urgent chip
    expect(screen.getByText(fullMockCheckRequest.reason_for_payment)).toBeInTheDocument();
    expect(screen.getByText(fullMockCheckRequest.expense_category_name!)).toBeInTheDocument();
    expect(screen.getByText(fullMockCheckRequest.recurring_payment_details!)).toBeInTheDocument();

    // Payment Details
    expect(screen.getByText(fullMockCheckRequest.payee_name)).toBeInTheDocument();
    expect(screen.getByText(`$${Number(fullMockCheckRequest.amount).toFixed(2)}`)).toBeInTheDocument(); // Formatted currency
    expect(screen.getByText(fullMockCheckRequest.currency)).toBeInTheDocument();
    expect(screen.getByText(fullMockCheckRequest.purchase_order_number!)).toBeInTheDocument();
    expect(screen.getByText(fullMockCheckRequest.invoice_number!)).toBeInTheDocument();
    // Ensure date is treated as local for YYYY-MM-DD
    const expectedInvoiceDate = new Date(fullMockCheckRequest.invoice_date + 'T00:00:00').toLocaleDateString();
    expect(screen.getByText(expectedInvoiceDate)).toBeInTheDocument();
    expect(screen.getByText(fullMockCheckRequest.payee_address!)).toBeInTheDocument();

    const attachmentLink = screen.getByRole('link', { name: /view cr attachment/i });
    expect(attachmentLink).toBeInTheDocument();
    expect(attachmentLink).toHaveAttribute('href', fullMockCheckRequest.attachments);


    // Approval & Processing Section (since status is 'approved')
    expect(screen.getByText('Approval & Processing')).toBeInTheDocument();
    expect(screen.getByText(fullMockCheckRequest.approved_by_accounts_username!)).toBeInTheDocument();
    expect(screen.getByText(new Date(fullMockCheckRequest.accounts_approval_date!).toLocaleString())).toBeInTheDocument();
    expect(screen.getByText(fullMockCheckRequest.accounts_comments!)).toBeInTheDocument();

    // Payment method details (since status is 'approved', these might not be shown yet, depends on component logic)
    // The component logic is: (checkRequest.status === 'paid' || checkRequest.status === 'payment_processing')
    // So for 'approved' status, these should NOT be visible. Let's test that.
    // If the component logic changes to show them for 'approved', these tests will need to be updated.
    expect(screen.queryByText('Check')).not.toBeInTheDocument(); // Formatted payment method
    expect(screen.queryByText(new Date(fullMockCheckRequest.payment_date!).toLocaleString())).not.toBeInTheDocument();
    expect(screen.queryByText(fullMockCheckRequest.transaction_id!)).not.toBeInTheDocument();
    expect(screen.queryByText(fullMockCheckRequest.payment_notes!)).not.toBeInTheDocument();


    // Check for Back and Print buttons
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
  });

  it('displays payment processing details when status is "paid"', async () => {
    const paidCheckRequest: CheckRequest = {
      ...fullMockCheckRequest,
      status: 'paid', // Critical change for this test
    };
    mockGetCheckRequestById.mockResolvedValue(paidCheckRequest);
    vi.mocked(useParams).mockReturnValue({ checkRequestId: String(paidCheckRequest.id) });

    renderWithRouterAndAuth(<CheckRequestDetailView />, {
      route: `/procurement/check-requests/detail/${paidCheckRequest.id}`,
      path: '/procurement/check-requests/detail/:checkRequestId',
    });

    await waitFor(() => {
      expect(screen.getByText('Approval & Processing')).toBeInTheDocument();
    });

    // Payment method details should now be visible
    expect(screen.getByText('Check')).toBeInTheDocument(); // Formatted payment_method
    expect(screen.getByText(new Date(paidCheckRequest.payment_date!).toLocaleString())).toBeInTheDocument();
    expect(screen.getByText(paidCheckRequest.transaction_id!)).toBeInTheDocument();
    expect(screen.getByText(paidCheckRequest.payment_notes!)).toBeInTheDocument();
  });

  it('does not show Approval & Processing section for "pending_submission" status', async () => {
    const pendingCheckRequest: CheckRequest = {
      ...fullMockCheckRequest,
      status: 'pending_submission',
      approved_by_accounts_username: undefined, // Ensure these are not set
      accounts_approval_date: undefined,
      accounts_comments: undefined,
      payment_method: undefined,
      payment_date: undefined,
      transaction_id: undefined,
      payment_notes: undefined,
    };
    mockGetCheckRequestById.mockResolvedValue(pendingCheckRequest);
    vi.mocked(useParams).mockReturnValue({ checkRequestId: String(pendingCheckRequest.id) });

    renderWithRouterAndAuth(<CheckRequestDetailView />, {
      route: `/procurement/check-requests/detail/${pendingCheckRequest.id}`,
      path: '/procurement/check-requests/detail/:checkRequestId',
    });

    await waitFor(() => {
      expect(screen.getByText(`Request Information (${pendingCheckRequest.cr_id})`)).toBeInTheDocument();
    });

    expect(screen.queryByText('Approval & Processing')).not.toBeInTheDocument();
  });

  describe('Navigation and Actions', () => {
    beforeEach(() => {
      // Ensure a basic CR object is resolved so the buttons are present
      mockGetCheckRequestById.mockResolvedValue({ ...fullMockCheckRequest, id: 2, cr_id: 'CR002' });
      vi.mocked(useParams).mockReturnValue({ checkRequestId: '2' });
    });

    it('navigates back when "Back" button is clicked', async () => {
      renderWithRouterAndAuth(<CheckRequestDetailView />, {
        route: '/procurement/check-requests/detail/2',
        path: '/procurement/check-requests/detail/:checkRequestId',
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      });

      screen.getByRole('button', { name: /back/i }).click();
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('navigates to print preview when "Print" button is clicked', async () => {
      const currentCr = { ...fullMockCheckRequest, id: 3, cr_id: 'CR003' };
      mockGetCheckRequestById.mockResolvedValue(currentCr);
      vi.mocked(useParams).mockReturnValue({ checkRequestId: '3' });

      renderWithRouterAndAuth(<CheckRequestDetailView />, {
        route: '/procurement/check-requests/detail/3',
        path: '/procurement/check-requests/detail/:checkRequestId',
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /print/i })).toBeInTheDocument();
      });

      screen.getByRole('button', { name: /print/i }).click();
      expect(mockNavigate).toHaveBeenCalledWith(
        '/procurement/check-requests/print-preview',
        {
          state: { checkRequestId: currentCr.id, autoPrint: false },
        }
      );
    });

    it('Back button on error screen navigates back', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(useParams).mockReturnValue({ checkRequestId: 'invalid' });
      // No need to mock getCheckRequestById as it should fail before that due to invalid ID format

      renderWithRouterAndAuth(<CheckRequestDetailView />, {
        route: '/procurement/check-requests/detail/invalid',
        path: '/procurement/check-requests/detail/:checkRequestId',
      });

      await waitFor(() => {
        expect(screen.getByText(/Invalid Check Request ID format./i)).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeInTheDocument();
      backButton.click();
      expect(mockNavigate).toHaveBeenCalledWith(-1);
      consoleErrorSpy.mockRestore();
    });

    it('Back button on "not found" screen navigates back', async () => {
      mockGetCheckRequestById.mockResolvedValue(null);
      vi.mocked(useParams).mockReturnValue({ checkRequestId: '999' });

      renderWithRouterAndAuth(<CheckRequestDetailView />, {
        route: '/procurement/check-requests/detail/999',
        path: '/procurement/check-requests/detail/:checkRequestId',
      });

      await waitFor(() => {
        expect(screen.getByText(/Check Request not found./i)).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeInTheDocument();
      backButton.click();
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });
});
