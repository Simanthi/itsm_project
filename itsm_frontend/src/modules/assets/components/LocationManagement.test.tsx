// itsm_frontend/src/modules/assets/components/LocationManagement.test.tsx
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react'; // Added within
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, AuthContextType } from '../../../context/auth/AuthContextDefinition';
import { UIContext, UIContextType } from '../../../context/UIContext/UIContext';
import LocationManagement from './LocationManagement';
import * as assetApi from '../../../api/assetApi';
import type { Location, PaginatedResponse } from '../types';

// Mock assetApi
vi.mock('../../../api/assetApi');
const mockGetLocations = assetApi.getLocations as vi.Mock;
const mockCreateLocation = assetApi.createLocation as vi.Mock;
const mockUpdateLocation = assetApi.updateLocation as vi.Mock;
const mockDeleteLocation = assetApi.deleteLocation as vi.Mock;

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
          <LocationManagement />
        </UIContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

const mockLocationsData: Location[] = [
  { id: 1, name: 'Main Office', description: 'Primary company headquarters' },
  { id: 2, name: 'Warehouse A', description: 'Storage facility A' },
  { id: 3, name: 'Remote Office X', description: 'Branch office X' },
];

const mockPaginatedResponse: PaginatedResponse<Location> = {
  count: mockLocationsData.length,
  next: null,
  previous: null,
  results: mockLocationsData,
};

const mockEmptyPaginatedResponse: PaginatedResponse<Location> = {
  count: 0,
  next: null,
  previous: null,
  results: [],
};

describe('LocationManagement', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetLocations.mockResolvedValue(mockEmptyPaginatedResponse);
    mockAuthContextValue.authenticatedFetch = vi.fn().mockResolvedValue({});
  });

  it('renders the component title and add button', async () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: /Manage Locations/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Location/i })).toBeInTheDocument();
  });

  it('displays "No locations found" message if API returns empty list', async () => {
    renderComponent();
    await waitFor(() => expect(mockGetLocations).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/No locations found/i)).toBeInTheDocument();
  });

  it('displays locations in the table when API returns data', async () => {
    mockGetLocations.mockResolvedValue(mockPaginatedResponse);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Main Office')).toBeInTheDocument();
      expect(screen.getByText('Primary company headquarters')).toBeInTheDocument();
      expect(screen.getByText('Warehouse A')).toBeInTheDocument();
    });
  });

  it('opens the Add Location dialog when "Add Location" button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole('button', { name: /Add Location/i }));
    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(screen.getByRole('heading', { name: /Add New Location/i })).toBeInTheDocument();
  });

  it('opens the Edit Location dialog with populated data when edit button is clicked', async () => {
    mockGetLocations.mockResolvedValue(mockPaginatedResponse);
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => expect(screen.getByText(mockLocationsData[0].name)).toBeInTheDocument());

    const editIcons = await screen.findAllByTestId('EditIcon');
    expect(editIcons.length).toBeGreaterThan(0);
    await user.click(editIcons[0].closest('button')!);

    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(screen.getByRole('heading', { name: /Edit Location/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Location Name/i)).toHaveValue(mockLocationsData[0].name);
    if (mockLocationsData[0].description) {
      expect(screen.getByLabelText(/Description/i)).toHaveValue(mockLocationsData[0].description);
    }
  });

  it('successfully edits an existing location', async () => {
    mockGetLocations.mockResolvedValue(mockPaginatedResponse);
    const updatedLocationName = 'Updated Main Office';
    const updatedDescription = 'Main company HQ, renovated.';
    mockUpdateLocation.mockResolvedValue({ // Mock successful update
      id: mockLocationsData[0].id,
      name: updatedLocationName,
      description: updatedDescription,
    });

    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(screen.getByText(mockLocationsData[0].name)).toBeInTheDocument());

    const editIcons = await screen.findAllByTestId('EditIcon');
    await user.click(editIcons[0].closest('button')!);

    const dialog = await screen.findByRole('dialog');
    const nameInput = within(dialog).getByLabelText(/Location Name/i);
    const descriptionInput = within(dialog).getByLabelText(/Description/i);

    await user.clear(nameInput);
    await user.type(nameInput, updatedLocationName);
    await user.clear(descriptionInput);
    await user.type(descriptionInput, updatedDescription);

    const saveButton = within(dialog).getByRole('button', { name: /Save Changes/i });
    await user.click(saveButton);

    expect(mockUpdateLocation).toHaveBeenCalledWith(
      expect.anything(), // authenticatedFetch
      mockLocationsData[0].id,
      { name: updatedLocationName, description: updatedDescription }
    );
    expect(mockGetLocations).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Location updated successfully!')).toBeInTheDocument();
  });

  it('opens delete confirmation dialog when delete button is clicked', async () => {
    mockGetLocations.mockResolvedValue(mockPaginatedResponse);
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(screen.getByText(mockLocationsData[0].name)).toBeInTheDocument());

    const deleteIcons = await screen.findAllByTestId('DeleteIcon');
    await user.click(deleteIcons[0].closest('button')!);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeVisible();
    expect(screen.getByRole('heading', { name: /Confirm Delete/i })).toBeInTheDocument();
    expect(within(dialog).getByText((content, element) => {
      const expectedTextStart = "Are you sure you want to delete the location:";
      const expectedName = mockLocationsData[0].name;
      const expectedTextEnd = "?";
      const strongContent = element?.querySelector('strong')?.textContent;
      return content.includes(expectedTextStart) && content.includes(expectedTextEnd) && strongContent === expectedName;
    })).toBeInTheDocument();
  });

  it('successfully deletes a location after confirmation', async () => {
    mockGetLocations.mockResolvedValue(mockPaginatedResponse);
    mockDeleteLocation.mockResolvedValue({});

    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(screen.getByText(mockLocationsData[0].name)).toBeInTheDocument());

    const deleteIcons = await screen.findAllByTestId('DeleteIcon');
    await user.click(deleteIcons[0].closest('button')!);

    const dialog = await screen.findByRole('dialog');
    const deleteButtonInDialog = within(dialog).getByRole('button', { name: /Delete/i });
    await user.click(deleteButtonInDialog);

    expect(mockDeleteLocation).toHaveBeenCalledWith(expect.anything(), mockLocationsData[0].id);
    expect(mockGetLocations).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Location deleted successfully!')).toBeInTheDocument();
  });

  it('cancels delete action when "Cancel" is clicked in confirmation dialog', async () => {
    mockGetLocations.mockResolvedValue(mockPaginatedResponse);
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(screen.getByText(mockLocationsData[0].name)).toBeInTheDocument());

    const deleteIcons = await screen.findAllByTestId('DeleteIcon');
    await user.click(deleteIcons[0].closest('button')!);

    const dialog = await screen.findByRole('dialog');
    const cancelButtonInDialog = within(dialog).getByRole('button', { name: /Cancel/i });
    await user.click(cancelButtonInDialog);

    expect(mockDeleteLocation).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('requires location name when creating', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('button', { name: /Add Location/i }));
    const dialog = await screen.findByRole('dialog');
    const createButton = within(dialog).getByRole('button', { name: /Create Location/i });

    const nameInput = within(dialog).getByLabelText(/Location Name/i);
    expect(nameInput).toHaveValue('');

    await user.click(createButton);

    expect(await within(dialog).findByText('Location name is required.')).toBeVisible();
    expect(mockCreateLocation).not.toHaveBeenCalled();
  });
});
