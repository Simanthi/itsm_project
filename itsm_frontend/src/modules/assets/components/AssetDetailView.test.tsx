// Test file for AssetDetailView.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { AuthContext, AuthContextType } from '../../../context/auth/AuthContextDefinition';
import AssetDetailView from './AssetDetailView';
import * as assetApi from '../../../api/assetApi';
import * as formatters from '../../../utils/formatters';
import type { Asset } from '../types/assetTypes';

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: vi.fn(),
  };
});

// Mock assetApi
vi.mock('../../../api/assetApi');
const mockGetAssetById = assetApi.getAssetById as vi.Mock;

// Mock formatters
vi.mock('../../../utils/formatters');
const mockFormatDate = formatters.formatDate as vi.Mock;

const mockAuthContextValue: AuthContextType = {
  user: { id: 1, name: 'Test User', username: 'testuser', email: 'test@example.com', role: 'user', is_staff: false, groups: [] },
  token: 'test-token',
  isAuthenticated: true,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  authenticatedFetch: vi.fn().mockImplementation(async (resource, init) => {
    if (typeof resource === 'string' && resource.startsWith('/api/')) {
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    }
    return Promise.resolve(new Response(null, { status: 404 }));
  }),
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

describe('AssetDetailView', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(useParams).mockReturnValue({ assetId: '1' }); // Default assetId
    mockFormatDate.mockImplementation((dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A');
    mockGetAssetById.mockResolvedValue(null); // Default to not found
  });

  it('should have a placeholder test to confirm setup', () => {
    expect(true).toBe(true);
  });

  it('displays loading indicator while fetching data', () => {
    mockGetAssetById.mockImplementation(() => new Promise(() => {})); // Simulate pending promise

    renderWithRouterAndAuth(<AssetDetailView />, {
      route: '/assets/1',
      path: '/assets/:assetId',
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText(/Loading asset details.../i)).toBeInTheDocument();
  });

  it('displays error message if assetId is missing', async () => {
    vi.mocked(useParams).mockReturnValue({ assetId: undefined });

    renderWithRouterAndAuth(<AssetDetailView />, {
      route: '/assets/', // No ID
      path: '/assets/:assetId?',
    });

    await waitFor(() => {
      expect(screen.getByText(/Asset ID is missing/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
  });

  it('displays error message if assetId is not a number', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(useParams).mockReturnValue({ assetId: 'abc' });

    renderWithRouterAndAuth(<AssetDetailView />, {
      route: '/assets/abc',
      path: '/assets/:assetId',
    });

    await waitFor(() => {
      expect(screen.getByText(/Invalid Asset ID format/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it('displays error message if API call fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const errorMessage = 'Network Error';
    mockGetAssetById.mockRejectedValue(new Error(errorMessage));

    renderWithRouterAndAuth(<AssetDetailView />, {
      route: '/assets/1',
      path: '/assets/:assetId',
    });

    await waitFor(() => {
      expect(
        screen.getByText(`Failed to load asset details: ${errorMessage}`)
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it('displays "Asset not found" message if API returns null', async () => {
    // mockGetAssetById already defaults to resolving null in beforeEach, but being explicit here is fine
    mockGetAssetById.mockResolvedValue(null);

    renderWithRouterAndAuth(<AssetDetailView />, {
      route: '/assets/999', // Non-existent ID
      path: '/assets/:assetId',
    });

    await waitFor(() => {
      expect(screen.getByText(/Asset not found/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
  });

  // Further tests will be added here

  const mockAssetFull: Asset = {
    id: 1,
    name: 'CEO Laptop',
    asset_tag: 'LT-CEO-001',
    serial_number: 'SN12345XYZ',
    status: 'In Use',
    category: { id: 1, name: 'Laptops' },
    location: { id: 1, name: 'Head Office - CEO Room' },
    vendor: { id: 1, name: 'Dell Inc.' },
    assigned_to: { id: 5, username: 'john.doe', first_name: 'John', last_name: 'Doe' },
    purchase_date: '2023-01-15T00:00:00Z',
    warranty_end_date: '2026-01-14T00:00:00Z',
    description: 'High-performance laptop for CEO tasks. Includes docking station and dual monitors.',
    created_at: '2023-01-10T10:00:00Z',
    updated_at: '2023-05-20T11:30:00Z',
  };

  it('displays all asset details correctly on successful fetch (happy path)', async () => {
    mockGetAssetById.mockResolvedValue(mockAssetFull);
    vi.mocked(useParams).mockReturnValue({ assetId: String(mockAssetFull.id) });
    // formatDate is mocked in beforeEach to return locale date string

    renderWithRouterAndAuth(<AssetDetailView />, {
      route: `/assets/${mockAssetFull.id}`,
      path: '/assets/:assetId',
    });

    await waitFor(() => {
      expect(screen.getByText(`Asset: ${mockAssetFull.name} (${mockAssetFull.asset_tag})`)).toBeInTheDocument();
    });

    // Asset Information section
    expect(screen.getByText(mockAssetFull.asset_tag)).toBeInTheDocument();
    expect(screen.getByText(mockAssetFull.name)).toBeInTheDocument(); // Name is also in header, ensure it's here too
    expect(screen.getByText(mockAssetFull.serial_number!)).toBeInTheDocument();
    expect(screen.getByText(mockAssetFull.status)).toBeInTheDocument(); // Status Chip label
    expect(screen.getByText(mockAssetFull.category!.name)).toBeInTheDocument();
    expect(screen.getByText(mockAssetFull.location!.name)).toBeInTheDocument();
    expect(screen.getByText(mockAssetFull.assigned_to!.username)).toBeInTheDocument();

    // Purchase & Warranty section
    expect(screen.getByText(mockAssetFull.vendor!.name)).toBeInTheDocument();
    expect(screen.getByText(new Date(mockAssetFull.purchase_date!).toLocaleDateString())).toBeInTheDocument();
    expect(screen.getByText(new Date(mockAssetFull.warranty_end_date!).toLocaleDateString())).toBeInTheDocument();

    // Description section
    expect(screen.getByText(mockAssetFull.description!)).toBeInTheDocument();

    // Audit dates
    expect(screen.getByText(`Created: ${new Date(mockAssetFull.created_at).toLocaleDateString()} | Last Updated: ${new Date(mockAssetFull.updated_at).toLocaleDateString()}`)).toBeInTheDocument();

    // Buttons
    expect(screen.getByRole('button', { name: /back to list/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('handles missing optional fields gracefully (e.g. serial, assigned_to, description)', async () => {
    const minimalAsset: Asset = {
      id: 2,
      name: 'Spare Monitor',
      asset_tag: 'MON-SP-002',
      status: 'In Stock',
      category: { id: 2, name: 'Monitors' },
      location: { id: 3, name: 'IT Storage Room' },
      created_at: '2022-11-01T00:00:00Z',
      updated_at: '2022-11-05T00:00:00Z',
      // Optional fields left out or explicitly null/undefined
      serial_number: null,
      vendor: undefined,
      assigned_to: null,
      purchase_date: undefined,
      warranty_end_date: null,
      description: '', // Empty string
    };
    mockGetAssetById.mockResolvedValue(minimalAsset);
    vi.mocked(useParams).mockReturnValue({ assetId: String(minimalAsset.id) });

    renderWithRouterAndAuth(<AssetDetailView />, {
      route: `/assets/${minimalAsset.id}`,
      path: '/assets/:assetId',
    });

    await waitFor(() => {
      expect(screen.getByText(`Asset: ${minimalAsset.name} (${minimalAsset.asset_tag})`)).toBeInTheDocument();
    });

    // Updated assertions for "Label: Value" pattern
    const serialLabel = screen.getByText('Serial Number:');
    expect(serialLabel.parentElement).toHaveTextContent('Serial Number: N/A');

    const assignedToLabel = screen.getByText('Assigned To:');
    expect(assignedToLabel.parentElement).toHaveTextContent('Assigned To: Unassigned');

    const vendorLabel = screen.getByText('Vendor:');
    expect(vendorLabel.parentElement).toHaveTextContent('Vendor: N/A');

    const purchaseDateLabel = screen.getByText('Purchase Date:');
    expect(purchaseDateLabel.parentElement).toHaveTextContent('Purchase Date: N/A');

    const warrantyDateLabel = screen.getByText('Warranty End Date:');
    expect(warrantyDateLabel.parentElement).toHaveTextContent('Warranty End Date: N/A');

    expect(screen.queryByText('Description / Notes')).not.toBeInTheDocument(); // Section shouldn't render if description is empty
  });

  describe('Navigation and Actions', () => {
    // Use mockAssetFull for button presence, actual navigation target ID doesn't strictly matter for these mockNavigate tests
    const navTestAssetId = mockAssetFull.id;
    const navTestAssetIdStr = String(navTestAssetId);

    beforeEach(() => {
      mockGetAssetById.mockResolvedValue({ ...mockAssetFull, id: navTestAssetId }); // Ensure an asset is loaded
      vi.mocked(useParams).mockReturnValue({ assetId: navTestAssetIdStr });
    });

    it('navigates to asset list when "Back to List" button is clicked', async () => {
      renderWithRouterAndAuth(<AssetDetailView />, {
        route: `/assets/${navTestAssetIdStr}`,
        path: '/assets/:assetId',
      });
      await waitFor(() => expect(screen.getByRole('button', { name: /back to list/i })).toBeInTheDocument());
      screen.getByRole('button', { name: /back to list/i }).click();
      expect(mockNavigate).toHaveBeenCalledWith('/assets');
    });

    it('navigates to edit asset page when "Edit" button is clicked', async () => {
      renderWithRouterAndAuth(<AssetDetailView />, {
        route: `/assets/${navTestAssetIdStr}`,
        path: '/assets/:assetId',
      });
      await waitFor(() => expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument());
      screen.getByRole('button', { name: /edit/i }).click();
      expect(mockNavigate).toHaveBeenCalledWith(`/assets/edit/${navTestAssetId}`);
    });

    it('"Go Back" button on error screen navigates back', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetAssetById.mockRejectedValue(new Error('API Error')); // Ensure getAssetById is mocked before rendering
      vi.mocked(useParams).mockReturnValue({ assetId: 'error-id' }); // Use a distinct ID for clarity

      renderWithRouterAndAuth(<AssetDetailView />, {
        route: '/assets/error-id',
        path: '/assets/:assetId',
      });
      await waitFor(() => expect(screen.getByText(/Failed to load asset details/i)).toBeInTheDocument());
      screen.getByRole('button', { name: /go back/i }).click();
      expect(mockNavigate).toHaveBeenCalledWith(-1);
      consoleErrorSpy.mockRestore();
    });

    it('"Go Back" button on not found screen navigates back', async () => {
      mockGetAssetById.mockResolvedValue(null); // Ensure getAssetById is mocked before rendering
      vi.mocked(useParams).mockReturnValue({ assetId: '999' }); // Use a parseable numeric ID

      renderWithRouterAndAuth(<AssetDetailView />, {
        route: '/assets/999', // Consistent with useParams
        path: '/assets/:assetId',
      });
      await waitFor(() => expect(screen.getByText(/Asset not found/i)).toBeInTheDocument());
      screen.getByRole('button', { name: /go back/i }).click();
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });
});
