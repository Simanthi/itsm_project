import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
// import userEvent from '@testing-library/user-event'; // Add when interactions are tested
import { BrowserRouter } from 'react-router-dom';
import * as ReactRouterDom from 'react-router-dom';
import { server } from '../../../mocks/server';
import { UIContextProvider } from '../../../context/UIContext/UIContextProvider';
import { AuthProvider } from '../../../context/auth/AuthContext';
import AssetList from './AssetList';
import * as assetApi from '../../../api/assetApi';
import * as useAuthHook from '../../../context/auth/useAuth';
import type { Asset, AssetCategory, Location as AssetLocation, PaginatedResponse } from '../types/assetTypes';

// Mock API modules
vi.mock('../../../api/assetApi');
vi.mock('../../../context/auth/useAuth');

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  };
});

const mockAssetCategoriesResponse: PaginatedResponse<AssetCategory> = {
  count: 2, next: null, previous: null,
  results: [
    { id: 1, name: 'Laptops', description: 'Portable computers' },
    { id: 2, name: 'Desktops', description: 'Desktop computers' }
  ]
};
const mockLocationsResponse: PaginatedResponse<AssetLocation> = {
  count: 2, next: null, previous: null,
  results: [
    { id: 1, name: 'Main Office', address: '123 Main St'},
    { id: 2, name: 'Branch Office', address: '456 Branch Ave'}
  ]
};

const mockAssetsResponse: PaginatedResponse<Asset> = {
  count: 2,
  next: null,
  previous: null,
  results: [
    {
      id: 1,
      asset_tag: 'ASSET-001',
      name: 'Laptop A',
      category: { id: 1, name: 'Laptops' },
      category_name: 'Laptops',
      status: 'in_use',
      assigned_to: { id: 101, username: 'user_a', first_name: 'User', last_name: 'A' },
      assigned_to_username: 'user_a',
      location: { id: 1, name: 'Main Office' },
      location_name: 'Main Office',
      purchase_date: '2023-01-01',
      warranty_end_date: '2026-01-01',
      serial_number: 'SER001',
      vendor: {id: 1, name: 'Vendor X'},
      vendor_name: 'Vendor X',
      description: 'Test asset 1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      asset_tag: 'ASSET-002',
      name: 'Desktop B',
      category: { id: 2, name: 'Desktops' },
      category_name: 'Desktops',
      status: 'in_stock',
      assigned_to: null,
      assigned_to_username: null,
      location: { id: 2, name: 'Branch Office' },
      location_name: 'Branch Office',
      purchase_date: '2023-02-01',
      warranty_end_date: '2026-02-01',
      serial_number: 'SER002',
      vendor: {id: 2, name: 'Vendor Y'},
      vendor_name: 'Vendor Y',
      description: 'Test asset 2',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
};

const mockEmptyAssetsResponse: PaginatedResponse<Asset> = {
  count: 0, next: null, previous: null, results: []
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <UIContextProvider>{ui}</UIContextProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('AssetList', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    server.resetHandlers();

    vi.mocked(ReactRouterDom.useNavigate).mockReturnValue(vi.fn());
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      token: 'mockToken',
      user: { id: 1, name: 'testuser', role: 'admin', is_staff: true, groups: [] },
      authenticatedFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      isAuthenticated: true,
    });

    vi.mocked(assetApi.getAssets).mockResolvedValue(mockAssetsResponse);
    vi.mocked(assetApi.getAssetCategories).mockResolvedValue(mockAssetCategoriesResponse);
    vi.mocked(assetApi.getLocations).mockResolvedValue(mockLocationsResponse);
    vi.mocked(assetApi.deleteAsset).mockResolvedValue(undefined);
  });

  afterEach(() => {
    server.close();
  });

  it('renders the asset list and displays assets', async () => {
    renderWithProviders(<AssetList />);
    expect(screen.getByRole('heading', { name: /Asset List/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(assetApi.getAssets).toHaveBeenCalled();
      expect(assetApi.getAssetCategories).toHaveBeenCalled(); // For filters
      expect(assetApi.getLocations).toHaveBeenCalled(); // For location name mapping
    });

    expect(screen.getByRole('button', { name: /Add New Asset/i})).toBeInTheDocument();

    // Check for table headers (omitting select checkbox header for simplicity here)
    expect(screen.getByRole('columnheader', { name: /Asset Tag/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Category/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Status/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Assigned To/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Location/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Purchase Date/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Actions/i })).toBeInTheDocument();

    // Check for data from the first asset
    expect(await screen.findByText('ASSET-001')).toBeInTheDocument();
    expect(screen.getByText('Laptop A')).toBeInTheDocument();
    // The category and location names are resolved via maps populated from API calls
    await waitFor(() => expect(screen.getByText('Laptops')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Main Office')).toBeInTheDocument());
    expect(screen.getByText('In Use')).toBeInTheDocument(); // Status for ASSET-001

    // Check for data from the second asset
    expect(await screen.findByText('ASSET-002')).toBeInTheDocument();
    expect(screen.getByText('Desktop B')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Desktops')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Branch Office')).toBeInTheDocument());
    expect(screen.getByText('In Stock')).toBeInTheDocument(); // Status for ASSET-002
  });

  it('displays a loading state initially', async () => {
    vi.mocked(assetApi.getAssets).mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve(mockAssetsResponse), 100))
    );
    renderWithProviders(<AssetList />);
    // Check for circular progress within the table body, specifically the loading row
    const table = await screen.findByRole('table');
    expect(within(table).getByRole('progressbar')).toBeInTheDocument();

    await waitFor(() => {
      expect(within(table).queryByRole('progressbar')).not.toBeInTheDocument();
    }, {timeout: 2000}); // Increased timeout for safety
  });

  it('displays "No assets found" message when no assets are returned', async () => {
    vi.mocked(assetApi.getAssets).mockResolvedValue(mockEmptyAssetsResponse);
    renderWithProviders(<AssetList />);
    expect(await screen.findByText(/No assets found/i)).toBeInTheDocument();
  });

  it('handles error when fetching assets fails', async () => {
    vi.mocked(assetApi.getAssets).mockRejectedValueOnce(new Error('Failed to fetch assets'));
    renderWithProviders(<AssetList />);
    expect(await screen.findByText(/Failed to fetch assets/i, {}, {timeout: 2000})).toBeInTheDocument();
  });
});
