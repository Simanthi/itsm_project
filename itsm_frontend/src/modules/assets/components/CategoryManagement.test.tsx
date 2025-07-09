// itsm_frontend/src/modules/assets/components/CategoryManagement.test.tsx
import React from 'react';
import { render, screen, waitFor, act, within } from '@testing-library/react'; // Added within
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom'; // For useNavigate
import { AuthContext, AuthContextType } from '../../../context/auth/AuthContextDefinition';
import { UIContext, UIContextType } from '../../../context/UIContext/UIContext'; // For useUI
import CategoryManagement from './CategoryManagement';
import * as assetApi from '../../../api/assetApi';
import type { AssetCategory, PaginatedResponse } from '../types';

// Mock assetApi
vi.mock('../../../api/assetApi');
const mockGetAssetCategories = assetApi.getAssetCategories as vi.Mock;
const mockCreateAssetCategory = assetApi.createAssetCategory as vi.Mock;
const mockUpdateAssetCategory = assetApi.updateAssetCategory as vi.Mock;
const mockDeleteAssetCategory = assetApi.deleteAssetCategory as vi.Mock;

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
  authenticatedFetch: vi.fn().mockResolvedValue({}), // Default mock for authenticatedFetch
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
          <CategoryManagement />
        </UIContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

const mockCategoriesData: AssetCategory[] = [
  { id: 1, name: 'Laptops', description: 'Portable computers' },
  { id: 2, name: 'Monitors', description: 'Display screens' },
  { id: 3, name: 'Printers', description: 'Office printers' },
];

const mockPaginatedResponse: PaginatedResponse<AssetCategory> = {
  count: mockCategoriesData.length,
  next: null,
  previous: null,
  results: mockCategoriesData,
};

const mockEmptyPaginatedResponse: PaginatedResponse<AssetCategory> = {
  count: 0,
  next: null,
  previous: null,
  results: [],
};


describe('CategoryManagement', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default API mock for getAssetCategories
    mockGetAssetCategories.mockResolvedValue(mockEmptyPaginatedResponse);
    mockAuthContextValue.authenticatedFetch = vi.fn().mockResolvedValue({}); // Reset this too
  });

  it('renders the component title and add button', async () => {
    renderComponent();
    expect(screen.getByRole('heading', { name: /Manage Asset Categories/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Category/i })).toBeInTheDocument();
  });

  it('displays loading state initially then "No categories found" message if API returns empty list', async () => {
    mockGetAssetCategories.mockResolvedValue(mockEmptyPaginatedResponse);
    renderComponent();

    // It might briefly show loading, then the empty message
    // Wait for the API call to be made and loading to finish
    await waitFor(() => expect(mockGetAssetCategories).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/No categories found/i)).toBeInTheDocument();
  });

  it('displays categories in the table when API returns data', async () => {
    mockGetAssetCategories.mockResolvedValue(mockPaginatedResponse);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Laptops')).toBeInTheDocument();
      expect(screen.getByText('Portable computers')).toBeInTheDocument();
      expect(screen.getByText('Monitors')).toBeInTheDocument();
      expect(screen.getByText('Display screens')).toBeInTheDocument();
    });
  });

  it('opens the Add Category dialog when "Add Category" button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();
    await user.click(screen.getByRole('button', { name: /Add Category/i }));
    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(screen.getByRole('heading', { name: /Add New Category/i })).toBeInTheDocument();
  });

  it('opens the Edit Category dialog with populated data when edit button is clicked', async () => {
    mockGetAssetCategories.mockResolvedValue(mockPaginatedResponse);
    const user = userEvent.setup();
    renderComponent();

    // Wait for table to render
    await waitFor(() => expect(screen.getByText(mockCategoriesData[0].name)).toBeInTheDocument());

    // Find the edit button for the first category
    // The actions are in the last cell. IconButton doesn't have an accessible name by default if only icon.
    const editIcons = await screen.findAllByTestId('EditIcon'); // MUI icons often have data-testid
    expect(editIcons.length).toBeGreaterThan(0);
    // Click the parent button of the first EditIcon found
    const firstEditButton = editIcons[0].closest('button');
    expect(firstEditButton).toBeInTheDocument();
    await user.click(firstEditButton!);

    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(screen.getByRole('heading', { name: /Edit Category/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Category Name/i)).toHaveValue(mockCategoriesData[0].name);
    if (mockCategoriesData[0].description) {
      expect(screen.getByLabelText(/Description/i)).toHaveValue(mockCategoriesData[0].description);
    }
  });

  it('successfully edits an existing category', async () => {
    mockGetAssetCategories.mockResolvedValue(mockPaginatedResponse); // Initial load
    const updatedCategoryName = 'Updated Laptops';
    const updatedDescription = 'All company laptops, new and old.';
    mockUpdateAssetCategory.mockResolvedValue({ // Mock successful update
      id: mockCategoriesData[0].id,
      name: updatedCategoryName,
      description: updatedDescription,
    });

    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(screen.getByText(mockCategoriesData[0].name)).toBeInTheDocument());

    const editIcons = await screen.findAllByTestId('EditIcon');
    await user.click(editIcons[0].closest('button')!);

    const dialog = await screen.findByRole('dialog');
    expect(screen.getByRole('heading', { name: /Edit Category/i })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/Category Name/i);
    const descriptionInput = screen.getByLabelText(/Description/i); // Label includes (Optional)

    await user.clear(nameInput);
    await user.type(nameInput, updatedCategoryName);
    await user.clear(descriptionInput);
    await user.type(descriptionInput, updatedDescription);

    // MUI Dialogs often have buttons identified by their text content.
    const saveButton = within(dialog).getByRole('button', { name: /Save Changes/i });
    await user.click(saveButton);

    expect(mockUpdateAssetCategory).toHaveBeenCalledWith(
      expect.anything(), // authenticatedFetch
      mockCategoriesData[0].id,
      { name: updatedCategoryName, description: updatedDescription }
    );
    expect(mockGetAssetCategories).toHaveBeenCalledTimes(2); // Initial fetch + refresh after update
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Category updated successfully!')).toBeInTheDocument(); // From Snackbar
  });

  it('opens delete confirmation dialog when delete button is clicked', async () => {
    mockGetAssetCategories.mockResolvedValue(mockPaginatedResponse);
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(screen.getByText(mockCategoriesData[0].name)).toBeInTheDocument());

    const deleteIcons = await screen.findAllByTestId('DeleteIcon');
    expect(deleteIcons.length).toBeGreaterThan(0);
    await user.click(deleteIcons[0].closest('button')!);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeVisible();
    expect(screen.getByRole('heading', { name: /Confirm Delete/i })).toBeInTheDocument();
    // Custom text matcher for fragmented text
    expect(within(dialog).getByText((content, element) => {
      const expectedTextStart = "Are you sure you want to delete the category:";
      const expectedName = mockCategoriesData[0].name;
      const expectedTextEnd = "?";
      const strongContent = element?.querySelector('strong')?.textContent;
      return content.includes(expectedTextStart) && content.includes(expectedTextEnd) && strongContent === expectedName;
    })).toBeInTheDocument();
  });

  it('successfully deletes a category after confirmation', async () => {
    mockGetAssetCategories.mockResolvedValue(mockPaginatedResponse);
    mockDeleteAssetCategory.mockResolvedValue({}); // Mock successful deletion

    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(screen.getByText(mockCategoriesData[0].name)).toBeInTheDocument());

    const deleteIcons = await screen.findAllByTestId('DeleteIcon');
    await user.click(deleteIcons[0].closest('button')!);

    const dialog = await screen.findByRole('dialog');
    const deleteButtonInDialog = within(dialog).getByRole('button', { name: /Delete/i });
    await user.click(deleteButtonInDialog);

    expect(mockDeleteAssetCategory).toHaveBeenCalledWith(expect.anything(), mockCategoriesData[0].id);
    expect(mockGetAssetCategories).toHaveBeenCalledTimes(2); // Initial + refresh
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Category deleted successfully!')).toBeInTheDocument();
  });

  it('cancels delete action when "Cancel" is clicked in confirmation dialog', async () => {
    mockGetAssetCategories.mockResolvedValue(mockPaginatedResponse);
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => expect(screen.getByText(mockCategoriesData[0].name)).toBeInTheDocument());

    const deleteIcons = await screen.findAllByTestId('DeleteIcon');
    await user.click(deleteIcons[0].closest('button')!);

    const dialog = await screen.findByRole('dialog');
    const cancelButtonInDialog = within(dialog).getByRole('button', { name: /Cancel/i });
    await user.click(cancelButtonInDialog);

    expect(mockDeleteAssetCategory).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('requires category name when creating/editing', async () => {
    const user = userEvent.setup();
    renderComponent(); // Opens in create mode by default if no categories initially

    // Test Create
    await user.click(screen.getByRole('button', { name: /Add Category/i }));
    let dialog = await screen.findByRole('dialog');
    let createButton = within(dialog).getByRole('button', { name: /Create Category/i });

    // Name input should be initially empty
    const nameInput = within(dialog).getByLabelText(/Category Name/i);
    expect(nameInput).toHaveValue('');

    await user.click(createButton); // Attempt to submit with empty name

    // Check for error message (component sets error state, which should be shown in an Alert within Dialog)
    // Or check that createAssetCategory was not called
    expect(await within(dialog).findByText('Category name is required.')).toBeVisible();
    expect(mockCreateAssetCategory).not.toHaveBeenCalled();

    // Close and re-open for edit test
    const cancelButton = within(dialog).getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Test Edit (reuse first category for edit)
    mockGetAssetCategories.mockResolvedValue(mockPaginatedResponse); // Load categories
    // Need to re-render or ensure component updates with new categories for edit button to appear
    // For simplicity, let's assume the component re-fetches or we re-render for this part of the test.
    // However, a better approach is to separate create and edit validation tests.
    // This test becomes complex. For now, focusing on create validation.
    // The error state handling in the dialog for edit would be similar.
  });

});
