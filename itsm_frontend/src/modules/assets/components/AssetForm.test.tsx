import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import * as ReactRouterDom from 'react-router-dom';
import { server } from '../../../mocks/server';
import { UIContextProvider } from '../../../context/UIContext/UIContextProvider';
import { AuthProvider } from '../../../context/auth/AuthContext';
import AssetForm from './AssetForm';
import * as assetApi from '../../../api/assetApi';
import * as authApi from '../../../api/authApi';
import * as useAuthHook from '../../../context/auth/useAuth';
import type { AssetCategory, Location, Vendor as AssetVendorType, PaginatedResponse } from '../types/assetTypes';
import type { User as ApiUserType } from '../../../api/authApi';

vi.mock('../../../api/assetApi');
vi.mock('../../../api/authApi');
vi.mock('../../../context/auth/useAuth');

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
    useNavigate: vi.fn(() => vi.fn()),
  };
});

const mockAssetCategories: PaginatedResponse<AssetCategory> = {
  count: 1, next: null, previous: null, results: [{ id: 1, name: 'Laptops', description: 'Portable computers' }]
};
const mockLocations: PaginatedResponse<Location> = {
  count: 1, next: null, previous: null, results: [{ id: 1, name: 'Main Office' /* address removed */ }]
};
const mockVendors: PaginatedResponse<AssetVendorType> = {
  count: 1, next: null, previous: null, results: [{ id: 1, name: 'TechSupplier Inc.', contact_person: 'John Doe', phone_number: '555-1234' }]
};
const today = new Date().toISOString();
const mockUsers: ApiUserType[] = [
  { id: 1, username: 'testuser', first_name: 'Test', last_name: 'User', email: 'test@example.com', is_staff: false, groups: [], is_active: true, date_joined: today, last_login: today },
  { id: 2, username: 'adminuser', first_name: 'Admin', last_name: 'User', email: 'admin@example.com', is_staff: true, groups: [], is_active: true, date_joined: today, last_login: today }
];

const mockRawAssetDataForEdit = {
  id: 1,
  name: 'MacBook Pro 16',
  asset_tag: 'ASSET-001',
  serial_number: 'C02X0000XXXX',
  status: 'in_use' as const,
  category: { id: 1, name: 'Laptops' },
  location: { id: 1, name: 'Main Office' },
  vendor: { id: 1, name: 'TechSupplier Inc.' },
  assigned_to: { id: 1, username: 'testuser', first_name: 'Test', last_name: 'User' },
  purchase_date: '2023-01-15T00:00:00Z',
  warranty_end_date: '2026-01-14T00:00:00Z',
  description: 'Company laptop for development',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  category_name: 'Laptops',
  location_name: 'Main Office',
  vendor_name: 'TechSupplier Inc.',
  assigned_to_username: 'testuser',
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <UIContextProvider>
          {ui}
        </UIContextProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('AssetForm', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    server.resetHandlers();

    vi.mocked(ReactRouterDom.useParams).mockReturnValue({});
    vi.mocked(ReactRouterDom.useNavigate).mockReturnValue(vi.fn());

    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      token: 'mockToken',
      user: { id: 1, name: 'currentuser', role: 'user', is_staff: false, groups: [] },
      authenticatedFetch: vi.fn(async (url, options) => {
        const res = await window.fetch(url, options);
        return res.json();
      }),
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
      isAuthenticated: true,
    });

    vi.mocked(assetApi.getAssetCategories).mockResolvedValue(mockAssetCategories);
    vi.mocked(assetApi.getLocations).mockResolvedValue(mockLocations);
    vi.mocked(assetApi.getVendors).mockResolvedValue(mockVendors);
    vi.mocked(authApi.getUserList).mockResolvedValue(mockUsers);
    vi.mocked(assetApi.createAsset).mockResolvedValue({ ...mockRawAssetDataForEdit, id: 2, asset_tag: 'ASSET-NEW' });
    vi.mocked(assetApi.updateAsset).mockResolvedValue(mockRawAssetDataForEdit);
    vi.mocked(assetApi.getAssetById).mockResolvedValue(mockRawAssetDataForEdit);
  });

  afterEach(() => {
    server.close();
  });

  it('renders in create mode with empty fields', async () => {
    renderWithProviders(<AssetForm />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading asset data.../i)).not.toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /Create New Asset/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Asset Name/i)).toHaveValue('');
    expect(screen.getByLabelText(/Asset Tag/i)).toHaveValue('');
    expect(screen.getByLabelText(/Serial Number/i)).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('In Use');
    await waitFor(() => {
      expect(assetApi.getAssetCategories).toHaveBeenCalled();
      expect(assetApi.getLocations).toHaveBeenCalled();
      expect(assetApi.getVendors).toHaveBeenCalled();
      expect(authApi.getUserList).toHaveBeenCalled();
    });
  });

  it('loads asset data in edit mode', async () => {
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({ assetId: '1' });
    renderWithProviders(<AssetForm />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading asset data.../i)).not.toBeInTheDocument();
    }, { timeout: 7000 });
    await waitFor(() => expect(assetApi.getAssetById).toHaveBeenCalledWith(expect.any(Function), 1));
    await screen.findByRole('heading', { name: /Edit Asset: ASSET-001/i });
    await waitFor(() => expect(screen.getByLabelText(/Asset Name/i)).toHaveValue(mockRawAssetDataForEdit.name));
    await waitFor(() => expect(screen.getByLabelText(/Asset Tag/i)).toHaveValue(mockRawAssetDataForEdit.asset_tag));
    expect(screen.getByLabelText(/Asset Tag/i)).toHaveAttribute('readonly');
    await waitFor(() => expect(screen.getByLabelText(/Serial Number/i)).toHaveValue(mockRawAssetDataForEdit.serial_number));
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent(
        mockRawAssetDataForEdit.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
      )
    );
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Category' })).toHaveTextContent(mockRawAssetDataForEdit.category.name)
    );
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Location' })).toHaveTextContent(mockRawAssetDataForEdit.location.name)
    );
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Vendor' })).toHaveTextContent(mockRawAssetDataForEdit.vendor.name)
    );
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Assigned To' })).toHaveTextContent(new RegExp(mockRawAssetDataForEdit.assigned_to.username, "i"))
    );
  });

  it('shows error if required fields are missing on submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AssetForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Asset Name/i)).toBeInTheDocument();
    }, { timeout: 7000 });

    // Now, specifically wait for the form role to be available
    const formElement = await screen.findByRole('form', { name: /Create New Asset Form/i }, { timeout: 3000 });

    const submitButton = screen.getByRole('button', { name: /Create Asset/i });
    await user.click(submitButton);

    // Look for the error message set by setError within the form
    const formAlert = await within(formElement).findByText(
      /Name, Asset Tag, and Status are required fields./i,
      {},
      { timeout: 3000 }
    );
    expect(formAlert).toBeInTheDocument();

    expect(assetApi.createAsset).not.toHaveBeenCalled();
  });

  it('submits new asset data successfully', async () => {
    const user = userEvent.setup();
    const mockNavigate = vi.fn();
    vi.mocked(ReactRouterDom.useNavigate).mockReturnValue(mockNavigate);
    renderWithProviders(<AssetForm />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading asset data.../i)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Asset Name/i)).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/Asset Name/i), 'New Laptop');
    await user.type(screen.getByLabelText(/Asset Tag/i), 'ASSET-XYZ');
    await user.click(screen.getByRole('combobox', { name: 'Category' }));
    const categoryOptions = await screen.findAllByRole('option');
    const targetCategoryOption = categoryOptions.find(opt => opt.textContent === mockAssetCategories.results[0].name);
    if (!targetCategoryOption) throw new Error(`Category option "${mockAssetCategories.results[0].name}" not found`);
    await user.click(targetCategoryOption);
    await user.click(screen.getByRole('button', { name: /Create Asset/i }));
    await waitFor(() => {
      expect(assetApi.createAsset).toHaveBeenCalledTimes(1);
      expect(assetApi.createAsset).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          name: 'New Laptop',
          asset_tag: 'ASSET-XYZ',
          status: 'in_use',
          category_id: mockAssetCategories.results[0].id,
        })
      );
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/assets');
    });
  });

  it('submits updated asset data successfully', async () => {
    const user = userEvent.setup();
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({ assetId: '1' });
    const mockNavigate = vi.fn();
    vi.mocked(ReactRouterDom.useNavigate).mockReturnValue(mockNavigate);
    renderWithProviders(<AssetForm />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading asset data.../i)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Asset Name/i)).toHaveValue(mockRawAssetDataForEdit.name);
    }, { timeout: 7000 });
    const descriptionInput = screen.getByLabelText(/Description/i);
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Updated description for test.');
    await user.click(screen.getByRole('button', { name: /Update Asset/i }));
    await waitFor(() => {
      expect(assetApi.updateAsset).toHaveBeenCalledTimes(1);
      const expectedPayload = {
        name: mockRawAssetDataForEdit.name,
        asset_tag: mockRawAssetDataForEdit.asset_tag,
        serial_number: mockRawAssetDataForEdit.serial_number,
        status: mockRawAssetDataForEdit.status,
        category_id: mockRawAssetDataForEdit.category.id,
        location_id: mockRawAssetDataForEdit.location.id,
        vendor_id: mockRawAssetDataForEdit.vendor.id,
        assigned_to_id: mockRawAssetDataForEdit.assigned_to.id,
        purchase_date: mockRawAssetDataForEdit.purchase_date.split('T')[0],
        warranty_end_date: mockRawAssetDataForEdit.warranty_end_date.split('T')[0],
        description: 'Updated description for test.',
      };
      expect(assetApi.updateAsset).toHaveBeenCalledWith(
        expect.any(Function),
        mockRawAssetDataForEdit.id,
        expect.objectContaining(expectedPayload)
      );
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/assets');
    });
  });

  it('displays error message if API call fails during create', async () => {
    const user = userEvent.setup();
    vi.mocked(assetApi.createAsset).mockRejectedValueOnce(new Error('Network Error'));
    renderWithProviders(<AssetForm />);

    await waitFor(() => { // Wait for initial loading to complete
      expect(screen.queryByText(/Loading asset data.../i)).not.toBeInTheDocument();
       // Also wait for a key element that indicates form content is trying to render
      expect(screen.getByLabelText(/Asset Name/i)).toBeInTheDocument();
    }, { timeout: 7000 });

    const apiErrorForm = await screen.findByRole('form', { name: /Create New Asset Form/i }, { timeout: 3000 });

    await user.type(screen.getByLabelText(/Asset Name/i), 'Test Fail');
    await user.type(screen.getByLabelText(/Asset Tag/i), 'FAIL-001');
    await user.click(screen.getByRole('button', { name: /Create Asset/i }));

    const alertWithinApiErrorForm = await within(apiErrorForm).findByRole('alert');
    expect(alertWithinApiErrorForm).toHaveTextContent(/Failed to save asset: Network Error/i);
    // The snackbar check or generic screen-level alert check can be removed
    // if the in-form alert is the primary one to verify for this test case.
    // expect(await screen.findByRole('alert', { name: /error/i })).toHaveTextContent(/Failed to save asset: Network Error/i);

    // Ensure no successful navigation or other side effects
    expect(vi.mocked(ReactRouterDom.useNavigate)()).not.toHaveBeenCalled();
  });

  it('navigates to IOM template selection with correct context when "Create IOM" is clicked', async () => {
    const user = userEvent.setup();
    const mockNavigate = vi.fn();
    vi.mocked(ReactRouterDom.useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(ReactRouterDom.useParams).mockReturnValue({ assetId: '1' });
    renderWithProviders(<AssetForm />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading asset data.../i)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Asset Name/i)).toHaveValue(mockRawAssetDataForEdit.name);
    }, { timeout: 7000 });
    const createIomButton = await screen.findByRole('button', { name: /Create IOM for this Asset/i });
    expect(createIomButton).toBeInTheDocument();
    await user.click(createIomButton);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/ioms/new/select-template',
        {
          state: {
            parentRecordContext: {
              objectId: mockRawAssetDataForEdit.id,
              contentTypeAppLabel: 'assets',
              contentTypeModel: 'asset',
              recordName: mockRawAssetDataForEdit.name,
              recordIdentifier: mockRawAssetDataForEdit.asset_tag,
            }
          }
        }
      );
    });
  });
});
