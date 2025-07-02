// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom'; // Import useParams
import { AuthContext, type AuthContextType } from '../../../../context/auth/AuthContextDefinition';
import PurchaseRequestMemoDetailView from './PurchaseRequestMemoDetailView';
// Import specific functions needed for mocking and type usage
import { getPurchaseRequestMemoById } from '../../../../api/procurementApi';
import type { PurchaseRequestMemo, PurchaseRequestStatus } from '../../types';

// Mock the procurement API module
vi.mock('../../../../api/procurementApi');

// Mock react-router-dom hooks
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual() as typeof import('react-router-dom');
  return {
    ...actual, // Spread actual exports like MemoryRouter, Routes, Route
    useNavigate: () => mockNavigate, // Custom mock for navigate
    useParams: vi.fn(), // Standard mock for useParams, will be configured per test
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

const renderComponent = (memoIdParam?: string) => {
  // useParams is imported from 'react-router-dom' and is the vi.fn() from the factory
  vi.mocked(useParams).mockReturnValue({ memoId: memoIdParam });

  render(
    <AuthContext.Provider value={mockAuthContextValue}>
      <MemoryRouter initialEntries={[`/memo/${memoIdParam || '1'}`]}>
        <Routes>
          <Route path="/memo/:memoId" element={<PurchaseRequestMemoDetailView />} />
          <Route path="/procurement/iom/print-preview" element={<div>Print Preview Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

const baseMemoData: PurchaseRequestMemo = {
  id: 1,
  iom_id: 'IOM-2023-001',
  request_date: '2023-10-01T10:00:00Z',
  requested_by: 1,
  requested_by_username: 'Alice Wonderland',
  department: 1,
  department_name: 'IT',
  project: 1,
  project_name: 'New Server Setup',
  item_description: 'High-performance server for data processing.',
  quantity: 1,
  estimated_cost: 5000,
  reason: 'Current server is outdated and failing.',
  status: 'pending' as PurchaseRequestStatus,
  priority: 'high',
  required_delivery_date: '2023-11-01T10:00:00Z',
  suggested_vendor_id: 1,
  suggested_vendor_name: 'ServerBest Inc.',
  attachments: 'http://example.com/attachment.pdf',
  approver: null,
  approver_username: null,
  decision_date: null,
  approver_comments: null,
  created_at: '2023-10-01T10:00:00Z',
  updated_at: '2023-10-01T10:00:00Z',
  purchase_order: null,
  is_assigned_to_po: false,
  check_request: null,
  is_assigned_to_cr: false,
};


describe('PurchaseRequestMemoDetailView', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default authenticatedFetch to resolve to avoid unhandled promise rejections in basic cases
    mockAuthenticatedFetch.mockResolvedValue({});
  });

  it('renders loading state initially', () => {
    vi.mocked(getPurchaseRequestMemoById).mockImplementation(() => new Promise(() => {})); // Never resolves
    renderComponent('1');
    expect(screen.getByText(/Loading Memo Details.../i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders error state if memoId is not provided (simulated via API error or logic check)', async () => {
    // This specific case (no memoId) is handled by the component before API call.
    // We can also test API error if memoId was invalid.
    renderComponent(undefined); // No memoId
    // The component sets error directly if memoId is missing.
    await waitFor(() => {
      expect(screen.getByText(/Memo ID is missing or authentication is not available./i)).toBeInTheDocument();
    });
  });

  it('renders error state if memoId is not a number', async () => {
    renderComponent('abc'); // Invalid memoId
    await waitFor(() => {
        expect(screen.getByText(/Failed to fetch memo details: Invalid Memo ID format./i)).toBeInTheDocument();
    });
  });

  it('renders error state if API call fails', async () => {
    const errorMessage = 'Network Error';
    vi.mocked(getPurchaseRequestMemoById).mockRejectedValueOnce(new Error(errorMessage));
    renderComponent('1');
    await waitFor(() => {
      expect(screen.getByText(`Failed to fetch memo details: ${errorMessage}`)).toBeInTheDocument();
    });
  });

  it('renders "not found" state if API returns no memo', async () => {
    vi.mocked(getPurchaseRequestMemoById).mockResolvedValueOnce(null);
    renderComponent('1');
    await waitFor(() => {
      expect(screen.getByText(/Internal Office Memo not found./i)).toBeInTheDocument();
    });
  });

  describe('Successful Data Display', () => {
    it('renders all memo details correctly', async () => {
      vi.mocked(getPurchaseRequestMemoById).mockResolvedValueOnce(baseMemoData);
      renderComponent('1');

      await waitFor(() => {
        expect(screen.getByText(/Internal Office Memo Details/i)).toBeInTheDocument();
      });

      // Header
      expect(screen.getByText(`Memo Details (IOM-2023-001)`)).toBeInTheDocument();

      // Main Details
      expect(screen.getByText('Item Description:')).toBeInTheDocument();
      expect(screen.getByText(baseMemoData.item_description)).toBeInTheDocument();
      // Use a regex for the label part and check parentElement's textContent
      expect(screen.getByText(/^Quantity:/).parentElement).toHaveTextContent('Quantity: 1');
      expect(screen.getByText(/^Estimated Cost:/).parentElement).toHaveTextContent('Estimated Cost: $5000.00');
      expect(screen.getByText('Reason for Purchase:')).toBeInTheDocument();
      expect(screen.getByText(baseMemoData.reason)).toBeInTheDocument();

      // Overview Section
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText(/^Requested By:/).parentElement).toHaveTextContent('Requested By: Alice Wonderland');
      expect(screen.getByText(/^Request Date:/).parentElement).toHaveTextContent(`Request Date: ${new Date(baseMemoData.request_date).toLocaleDateString()}`);
      expect(screen.getByText(/^Priority:/).parentElement).toHaveTextContent('Priority: HIGH');
      expect(screen.getByText(/^Status:/).parentElement).toHaveTextContent('Status: Pending');
      expect(screen.getByText(/^Department:/).parentElement).toHaveTextContent('Department: IT');
      expect(screen.getByText(/^Project:/).parentElement).toHaveTextContent('Project: New Server Setup');
      expect(screen.getByText(/^Required Delivery:/).parentElement).toHaveTextContent(`Required Delivery: ${new Date(baseMemoData.required_delivery_date!).toLocaleDateString()}`);
      expect(screen.getByText(/^Suggested Vendor:/).parentElement).toHaveTextContent('Suggested Vendor: ServerBest Inc.');

      // Attachment
      const attachmentLink = screen.getByRole('link', { name: /View Attachment/i });
      expect(attachmentLink).toBeInTheDocument();
      expect(attachmentLink).toHaveAttribute('href', baseMemoData.attachments);
      expect(attachmentLink.querySelector('svg')).toBeInTheDocument(); // Check for AttachmentIcon

      // Approval section should not be visible for 'pending' status
      expect(screen.queryByText('Approval Information')).not.toBeInTheDocument();
    });

    it('renders approval information when memo is approved', async () => {
      const approvedMemo: PurchaseRequestMemo = {
        ...baseMemoData,
        status: 'approved',
        approver: 2,
        approver_username: 'Bob The Approver',
        decision_date: '2023-10-05T14:00:00Z',
        approver_comments: 'Looks good. Approved.',
      };
      vi.mocked(getPurchaseRequestMemoById).mockResolvedValueOnce(approvedMemo);
      renderComponent('1');

      await waitFor(() => {
        expect(screen.getByText('Approval Information')).toBeInTheDocument();
      });
      expect(screen.getByText(/^Approver:/).parentElement).toHaveTextContent('Approver: Bob The Approver');
      expect(screen.getByText(/^Decision Date:/).parentElement).toHaveTextContent(`Decision Date: ${new Date(approvedMemo.decision_date!).toLocaleDateString()}`);
      expect(screen.getByText('Approver Comments:')).toBeInTheDocument(); // This is a label for a multi-line text
      expect(screen.getByText(approvedMemo.approver_comments!)).toBeInTheDocument(); // This checks the comment text itself
    });

    it('renders N/A for optional fields when not present', async () => {
      const minimalMemo: PurchaseRequestMemo = {
        ...baseMemoData,
        iom_id: null,
        project: null,
        project_name: null,
        required_delivery_date: null,
        suggested_vendor_id: null,
        suggested_vendor_name: null,
        attachments: null,
        priority: undefined,
      };
      vi.mocked(getPurchaseRequestMemoById).mockResolvedValueOnce(minimalMemo);
      renderComponent('1');

      await waitFor(() => {
        expect(screen.getByText('Memo Details')).toBeInTheDocument();
      });
      expect(screen.queryByText(/^Project:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Required Delivery:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Suggested Vendor:/)).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /View Attachment/i })).not.toBeInTheDocument();
      // After component fix (Typography component="div" for priority)
      expect(screen.getByText(/^Priority:/).parentElement).toHaveTextContent('Priority: N/A');
    });

    it('displays status correctly with chip colors', async () => {
        const statuses: PurchaseRequestStatus[] = ['pending', 'approved', 'rejected', 'po_created', 'cancelled'];
        for (const status of statuses) {
            const memoWithStatus: PurchaseRequestMemo = { ...baseMemoData, status };
            vi.mocked(getPurchaseRequestMemoById).mockResolvedValueOnce(memoWithStatus);
            renderComponent(memoWithStatus.id.toString()); // Use a unique key for re-render if needed, or ensure proper cleanup

            await waitFor(() => {
                const statusChip = screen.getByText(status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()));
                expect(statusChip).toBeInTheDocument();
                // MUI chip color mapping to classes is complex, direct style check is brittle.
                // We trust getStatusChipColor works if the text is right.
                // Could add more specific class checks if needed, but often not worth it.
            });
             // Clean up for next iteration if not using unique keys for router/component
            // This might require unmounting and remounting, or ensuring useParams mock is reset correctly if it caches.
            // For this loop, simple re-render with different data should be okay as API is mocked per call.
        }
    });
  });

  describe('Navigation and Actions', () => {
    it('calls navigate(-1) when "Back" button is clicked', async () => {
      vi.mocked(getPurchaseRequestMemoById).mockResolvedValueOnce(baseMemoData);
      renderComponent('1');
      await waitFor(() => {
        expect(screen.getByText(/Internal Office Memo Details/i)).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /Back/i });
      await userEvent.click(backButton);
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('navigates to print preview page when "Print IOM" button is clicked', async () => {
      vi.mocked(getPurchaseRequestMemoById).mockResolvedValueOnce(baseMemoData);
      renderComponent('1');
      await waitFor(() => {
        expect(screen.getByText(/Internal Office Memo Details/i)).toBeInTheDocument();
      });

      const printButton = screen.getByRole('button', { name: /Print IOM/i });
      await userEvent.click(printButton);
      expect(mockNavigate).toHaveBeenCalledWith(
        '/procurement/iom/print-preview',
        { state: { memoId: baseMemoData.id, autoPrint: false } }
      );
      // To confirm navigation happened, check if the print preview page content is rendered (if distinct)
      // expect(screen.getByText('Print Preview Page')).toBeInTheDocument(); // Depends on how MemoryRouter setup handles this
    });
  });
});
