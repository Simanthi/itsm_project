// itsm_frontend/src/modules/assets/components/VendorManagement.test.tsx
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react'; // Added within
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, AuthContextType } from '../../../context/auth/AuthContextDefinition';
import { UIContext, UIContextType } from '../../../context/UIContext/UIContext';
import VendorManagement from './VendorManagement';
import * as assetApi from '../../../api/assetApi';
import type { Vendor, PaginatedResponse } from '../types';

// Mock assetApi
vi.mock('../../../api/assetApi');
const mockGetVendors = assetApi.getVendors as vi.Mock;
// Mocks for create, update, delete
const mockCreateVendor = assetApi.createVendor as vi.Mock;
const mockUpdateVendor = assetApi.updateVendor as vi.Mock;
const mockDeleteVendor = assetApi.deleteVendor as vi.Mock;

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockAuthContextValue: AuthContextType = {
  user: { id: 1, name: 'Test User', username: 'testuser', email: 'test@example.com', role: 'admin', is_staff: true, groups: [] },
  token: 'test-token',
  isAuthenticated: true,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  authenticatedFetch: vi.fn().mockResolvedValue({}),
};

const mockUiContextValue: UIContextType = {
  showSnackbar: vi.fn(),
  showConfirmDialog: vi.fn(),
  snackbarOpen: false,
  snackbarMessage: '',
  snackbarSeverity: 'info',
  hideSnackbar: vi.fn(),
  confirmDialogOpen: false,
  confirmDialogTitle: '',
  confirmDialogMessage: '',
  confirmDialogOnConfirm: vi.fn(),
  confirmDialogOnCancel: undefined,
  hideConfirmDialog: vi.fn(),
};

const renderComponent = () => {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={mockAuthContextValue}>
        <UIContext.Provider value={mockUiContextValue}>
          <VendorManagement />
        </UIContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

const mockVendorsData: Vendor[] = [
  { id: 1, name: 'Dell Inc.', contact_person: 'John Smith', email: 'john.smith@dell.com', phone_number: '123-456-7890', address: '1 Dell Way, Round Rock, TX' },
  { id: 2, name: 'HP Inc.', contact_person: 'Jane Doe', email: 'jane.doe@hp.com', phone_number: '987-654-3210', address: '1501 Page Mill Rd, Palo Alto, CA' },
];

const mockPaginatedResponse: PaginatedResponse<Vendor> = {
  count: mockVendorsData.length,
  next: null,
  previous: null,
  results: mockVendorsData,
};

const mockEmptyPaginatedResponse: PaginatedResponse<Vendor> = {
  count: 0,
  next: null,
  previous: null,
  results: [],
};

describe('VendorManagement', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetVendors.mockResolvedValue(mockEmptyPaginatedResponse);
    mockAuthContextValue.authenticatedFetch = vi.fn().mockResolvedValue({});
  });

  it('renders the component title and add button', async () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: /Manage Vendors/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Vendor/i })).toBeInTheDocument();
  });

  it('displays "No vendors found" message if API returns empty list', async () => {
    renderComponent();
    await waitFor(() => expect(mockGetVendors).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/No vendors found/i)).toBeInTheDocument();
  });

  it('displays vendors in the table when API returns data', async () => {
    mockGetVendors.mockResolvedValue(mockPaginatedResponse);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Dell Inc.')).toBeInTheDocument();
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('jane.doe@hp.com')).toBeInTheDocument();
    });
  });

  it('opens the Add Vendor dialog when "Add Vendor" button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole('button', { name: /Add Vendor/i }));
    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(screen.getByRole('heading', { name: /Add New Vendor/i })).toBeInTheDocument();
  });

  it('opens the Edit Vendor dialog with populated data when edit button is clicked', async () => {
    mockGetVendors.mockResolvedValue(mockPaginatedResponse);
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => expect(screen.getByText(mockVendorsData[0].name)).toBeInTheDocument());

    const editIcons = await screen.findAllByTestId('EditIcon');
    await user.click(editIcons[0].closest('button')!);

    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(screen.getByRole('heading', { name: /Edit Vendor/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Vendor Name/i)).toHaveValue(mockVendorsData[0].name);
    expect(screen.getByLabelText(/Contact Person/i)).toHaveValue(mockVendorsData[0].contact_person!);
    expect(screen.getByLabelText(/Email/i)).toHaveValue(mockVendorsData[0].email!);
    expect(screen.getByLabelText(/Phone Number/i)).toHaveValue(mockVendorsData[0].phone_number!);
    expect(screen.getByLabelText(/Address/i)).toHaveValue(mockVendorsData[0].address!);
  });

  it('successfully edits an existing vendor', async () => {
    mockGetVendors.mockResolvedValue(mockPaginatedResponse);
    const updatedVendor: VendorData = {
      name: 'Updated Dell Corp',
      contact_person: 'Jane Smith',
      email: 'jane.s@dell.com',
      phone_number: '111-222-3333',
      address: '2 Dell Way, Round Rock, TX',
    };
    mockUpdateVendor.mockResolvedValue({ id: mockVendorsData[0].id, ...updatedVendor });

    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(screen.getByText(mockVendorsData[0].name)).toBeInTheDocument());

    const editIcons = await screen.findAllByTestId('EditIcon');
    await user.click(editIcons[0].closest('button')!);

    const dialog = await screen.findByRole('dialog');

    await user.clear(within(dialog).getByLabelText(/Vendor Name/i));
    await user.type(within(dialog).getByLabelText(/Vendor Name/i), updatedVendor.name);
    await user.clear(within(dialog).getByLabelText(/Contact Person/i));
    await user.type(within(dialog).getByLabelText(/Contact Person/i), updatedVendor.contact_person!);
    await user.clear(within(dialog).getByLabelText(/Email/i));
    await user.type(within(dialog).getByLabelText(/Email/i), updatedVendor.email!);
    await user.clear(within(dialog).getByLabelText(/Phone Number/i));
    await user.type(within(dialog).getByLabelText(/Phone Number/i), updatedVendor.phone_number!);
    await user.clear(within(dialog).getByLabelText(/Address/i));
    await user.type(within(dialog).getByLabelText(/Address/i), updatedVendor.address!);

    const saveButton = within(dialog).getByRole('button', { name: /Save Changes/i });
    await user.click(saveButton);

    expect(mockUpdateVendor).toHaveBeenCalledWith(
      expect.anything(),
      mockVendorsData[0].id,
      updatedVendor
    );
    expect(mockGetVendors).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Vendor updated successfully!')).toBeInTheDocument();
  });

  it('opens delete confirmation dialog when delete button is clicked', async () => {
    mockGetVendors.mockResolvedValue(mockPaginatedResponse);
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(screen.getByText(mockVendorsData[0].name)).toBeInTheDocument());

    const deleteIcons = await screen.findAllByTestId('DeleteIcon');
    await user.click(deleteIcons[0].closest('button')!);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText((content, element) => {
      const expectedTextStart = "Are you sure you want to delete the vendor:";
      const expectedName = mockVendorsData[0].name;
      const expectedTextEnd = "?";
      const strongContent = element?.querySelector('strong')?.textContent;
      return content.includes(expectedTextStart) && content.includes(expectedTextEnd) && strongContent === expectedName;
    })).toBeInTheDocument();
  });

  it('successfully deletes a vendor after confirmation', async () => {
    mockGetVendors.mockResolvedValue(mockPaginatedResponse);
    mockDeleteVendor.mockResolvedValue({});

    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(screen.getByText(mockVendorsData[0].name)).toBeInTheDocument());

    const deleteIcons = await screen.findAllByTestId('DeleteIcon');
    await user.click(deleteIcons[0].closest('button')!);

    const dialog = await screen.findByRole('dialog');
    const deleteButtonInDialog = within(dialog).getByRole('button', { name: /Delete/i });
    await user.click(deleteButtonInDialog);

    expect(mockDeleteVendor).toHaveBeenCalledWith(expect.anything(), mockVendorsData[0].id);
    expect(mockGetVendors).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Vendor deleted successfully!')).toBeInTheDocument();
  });

  it('cancels delete action when "Cancel" is clicked in confirmation dialog', async () => {
    mockGetVendors.mockResolvedValue(mockPaginatedResponse);
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(screen.getByText(mockVendorsData[0].name)).toBeInTheDocument());

    const deleteIcons = await screen.findAllByTestId('DeleteIcon');
    await user.click(deleteIcons[0].closest('button')!);

    const dialog = await screen.findByRole('dialog');
    const cancelButtonInDialog = within(dialog).getByRole('button', { name: /Cancel/i });
    await user.click(cancelButtonInDialog);

    expect(mockDeleteVendor).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('requires vendor name when creating', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('button', { name: /Add Vendor/i }));
    const dialog = await screen.findByRole('dialog');
    const createButton = within(dialog).getByRole('button', { name: /Create Vendor/i });

    const nameInput = within(dialog).getByLabelText(/Vendor Name/i);
    expect(nameInput).toHaveValue('');

    await user.click(createButton);

    expect(await within(dialog).findByText('Vendor name is required.')).toBeVisible();
    expect(mockCreateVendor).not.toHaveBeenCalled();
  });
});
