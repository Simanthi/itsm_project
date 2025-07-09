// itsm_frontend/src/modules/service-catalog/pages/CatalogPage.test.tsx
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react'; // Added within
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, AuthContextType } from '../../../context/auth/AuthContextDefinition';
import { UIContextProvider } from '../../../context/UIContext/UIContextProvider'; // For potential snackbars from useUI
import CatalogPage from './CatalogPage';
import * as serviceCatalogApi from '../api/serviceCatalogApi';
import type { CatalogCategory, CatalogItem } from '../types';

// Mock serviceCatalogApi
vi.mock('../api/serviceCatalogApi');
const mockGetCatalogCategories = serviceCatalogApi.getCatalogCategories as vi.Mock;
const mockGetCatalogItems = serviceCatalogApi.getCatalogItems as vi.Mock;

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockAuthContextValue: AuthContextType = {
  user: { id: 1, name: 'Test User', username: 'testuser', email: 'test@example.com', role: 'user', is_staff: false, groups: [] },
  token: 'test-token',
  isAuthenticated: true,
  loading: false, // Assume auth is done loading for most tests
  login: vi.fn(),
  logout: vi.fn(),
  authenticatedFetch: vi.fn().mockResolvedValue({}),
};

// A minimal UIContext mock, as CatalogPage doesn't seem to use useUI directly for its own snackbars/dialogs
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

const renderComponent = (authContextOverrides?: Partial<AuthContextType>) => {
  const authValue = { ...mockAuthContextValue, ...authContextOverrides };
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <UIContextProvider> {/* UIContextProvider might be used by children or layout */}
          <CatalogPage />
        </UIContextProvider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

// Mock Data
const mockCategories: CatalogCategory[] = [
  { id: 1, name: 'Hardware', description: 'Physical equipment' },
  { id: 2, name: 'Software', description: 'Applications and licenses' },
];

const mockItemsCategory1: CatalogItem[] = [
  { id: 101, category_id: 1, name: 'Laptop Request', short_description: 'Request a new laptop', icon_url: null, estimated_fulfillment_time: '5 days' },
  { id: 102, category_id: 1, name: 'Monitor Request', short_description: 'Request an additional monitor', icon_url: null, estimated_fulfillment_time: '3 days' },
];

const mockItemsCategory2: CatalogItem[] = [
  { id: 201, category_id: 2, name: 'Software License', short_description: 'Request a new software license', icon_url: null, estimated_fulfillment_time: '2 days' },
];


describe('CatalogPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Default mocks
    mockGetCatalogCategories.mockResolvedValue([...mockCategories]); // Return a copy
    mockGetCatalogItems.mockImplementation(async (fetch, categoryId) => {
      if (categoryId === 1) return [...mockItemsCategory1];
      if (categoryId === 2) return [...mockItemsCategory2];
      return [];
    });
    mockAuthContextValue.authenticatedFetch = vi.fn().mockResolvedValue({});
    mockAuthContextValue.loading = false;
    mockAuthContextValue.isAuthenticated = true;
  });

  it('renders the main title', async () => {
    renderComponent();
    expect(await screen.findByRole('heading', { name: /Service Catalog/i })).toBeInTheDocument();
  });

  it('shows loading spinner when auth is loading', () => {
    renderComponent({ loading: true, isAuthenticated: false }); // Auth loading
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows loading spinner when categories are loading and auth is done', () => {
    mockGetCatalogCategories.mockImplementation(() => new Promise(() => {})); // Keep categories pending
    renderComponent({ loading: false, isAuthenticated: true });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows "Please log in" message if not authenticated and auth is done loading', async () => {
    renderComponent({ isAuthenticated: false, loading: false });
    expect(await screen.findByText(/Please log in to view the service catalog./i)).toBeInTheDocument();
  });

  it('displays error message if fetching categories fails', async () => {
    mockGetCatalogCategories.mockRejectedValue(new Error('Failed to load categories'));
    renderComponent();
    expect(await screen.findByText(/Failed to load categories/i)).toBeInTheDocument(); // Corrected expected message
  });

  it('displays "No service catalog categories found" when API returns empty list', async () => {
    mockGetCatalogCategories.mockResolvedValue([]);
    renderComponent();
    expect(await screen.findByText(/No service catalog categories found./i)).toBeInTheDocument();
  });

  it('displays categories as accordions and loads items on expand', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Check categories are rendered
    expect(await screen.findByText('Hardware')).toBeInTheDocument();
    expect(screen.getByText('Software')).toBeInTheDocument();

    // Click to expand the first category (Hardware)
    const hardwareAccordionSummary = screen.getByText('Hardware');
    await user.click(hardwareAccordionSummary);

    // Check if getCatalogItems was called for Hardware (category id 1)
    await waitFor(() => expect(mockGetCatalogItems).toHaveBeenCalledWith(expect.anything(), 1));

    // Check for items of category 1
    expect(await screen.findByText('Laptop Request')).toBeInTheDocument();
    expect(screen.getByText('Request a new laptop')).toBeInTheDocument();
    expect(screen.getByText('Monitor Request')).toBeInTheDocument();
  });

  it('displays "No items found in this category" if items list is empty for an expanded category', async () => {
    const user = userEvent.setup();
    mockGetCatalogItems.mockImplementation(async (fetch, categoryId) => {
      if (categoryId === 1) return []; // Category 1 has no items
      if (categoryId === 2) return [...mockItemsCategory2];
      return [];
    });
    renderComponent();

    expect(await screen.findByText('Hardware')).toBeInTheDocument();
    const hardwareAccordionSummary = screen.getByText('Hardware');
    await user.click(hardwareAccordionSummary);

    await waitFor(() => expect(mockGetCatalogItems).toHaveBeenCalledWith(expect.anything(), 1));
    expect(await screen.findByText(/No items found in this category./i)).toBeInTheDocument();
  });

  it('navigates to new service request page with prefill data on "Request this" click', async () => {
    const user = userEvent.setup();
    renderComponent();

    expect(await screen.findByText('Hardware')).toBeInTheDocument();
    const hardwareAccordionSummary = screen.getByText('Hardware');
    await user.click(hardwareAccordionSummary); // Expand to show items

    // Find the "Laptop Request" item's card first
    const laptopRequestCardTextElement = await screen.findByText('Laptop Request');
    const laptopRequestCard = laptopRequestCardTextElement.closest('.MuiCard-root'); // Find the parent Card element
    expect(laptopRequestCard).toBeInTheDocument(); // Ensure the card was found

    // Find the "Request this" button within that specific card
    const requestThisButtonInCard = within(laptopRequestCard!).getByRole('button', { name: /Request this/i });
    await user.click(requestThisButtonInCard);

    expect(mockNavigate).toHaveBeenCalledWith(
      '/service-requests/new',
      {
        state: {
          catalog_item_id: mockItemsCategory1[0].id,
          prefill_title: mockItemsCategory1[0].name,
          prefill_description: mockItemsCategory1[0].short_description,
        },
      }
    );
  });
});
