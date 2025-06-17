import React, { useState, useEffect, useCallback } from 'react'; // Removed useMemo
import {
  Box,
  Typography,
  Dialog, // Added
  DialogActions, // Added
  DialogContent, // Added
  DialogTitle, // Added
  Grid, // Added
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Snackbar,
  TablePagination,
  Chip,
  Toolbar, // For filter bar layout
  Tooltip,
  Checkbox, // Import Checkbox
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select'; // Added for typed Select events
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print'; // Import PrintIcon
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility'; // Import VisibilityIcon
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear'; // For clearing filters

import { useAuth } from '../../../context/auth/useAuth';
import { useUI } from '../../../context/UIContext/useUI'; // Import useUI
import {
  getAssets,
  deleteAsset,
  getAssetCategories,
  getLocations,
} from '../../../api/assetApi'; // Import getLocations
import type {
  Asset,
  AssetCategory,
  // Vendor, // Not directly used in AssetList columns from root, but via Asset.vendor
  // User, // Not directly used in AssetList columns from root, but via Asset.assigned_to
  // PaginatedResponse // Removed as per instruction if not directly annotated
} from '../types';
import { useNavigate } from 'react-router-dom'; // For navigation

// Mimic Django choices for status filter
const ASSET_STATUS_CHOICES = [
  { value: '', label: 'All Statuses' },
  { value: 'in_use', label: 'In Use' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'maintenance', label: 'Under Maintenance' },
  { value: 'retired', label: 'Retired' },
  { value: 'disposed', label: 'Disposed' },
];

type Order = 'asc' | 'desc';

interface HeadCell {
  id:
    | keyof Asset
    | 'assigned_to_username'
    | 'category_name'
    | 'location_name'
    | 'actions'
    | 'select'; // Include pseudo-fields for sorting
  label: string;
  numeric: boolean;
  sortable?: boolean;
  padding?: 'none' | 'normal';
}

const headCells: readonly HeadCell[] = [
  { id: 'select', label: '', sortable: false, numeric: false, padding: 'none' },
  { id: 'asset_tag', numeric: false, label: 'Asset Tag', sortable: true },
  { id: 'name', numeric: false, label: 'Name', sortable: true },
  { id: 'category_name', numeric: false, label: 'Category', sortable: true }, // For sorting by category.name
  { id: 'status', numeric: false, label: 'Status', sortable: true },
  {
    id: 'assigned_to_username',
    numeric: false,
    label: 'Assigned To',
    sortable: true,
  }, // For sorting by user
  { id: 'location_name', numeric: false, label: 'Location', sortable: true }, // For sorting by location.name
  {
    id: 'purchase_date',
    numeric: false,
    label: 'Purchase Date',
    sortable: true,
  },
  { id: 'actions', numeric: false, label: 'Actions', sortable: false },
];

const AssetList: React.FC = () => {
  const { authenticatedFetch } = useAuth();
  const navigate = useNavigate();
  const { showSnackbar } = useUI(); // Import useUI

  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [totalAssets, setTotalAssets] = useState<number>(0);
  const [page, setPage] = useState<number>(0); // 0-indexed for MUI TablePagination
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([]);
  const [categoryMap, setCategoryMap] = useState<Map<number, string>>(
    new Map(),
  );
  const [locationMap, setLocationMap] = useState<Map<number, string>>(
    new Map(),
  );

  const [sortConfigKey, setSortConfigKey] = useState<
    keyof Asset | string | null
  >('asset_tag'); // Default sort
  const [sortConfigDirection, setSortConfigDirection] = useState<Order>('asc');

  const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);
  const [selectedAssetForDelete, setSelectedAssetForDelete] =
    useState<Asset | null>(null);

  const fetchAssetCategoriesForFilter = useCallback(async () => {
    if (!authenticatedFetch) return;
    try {
      const response = await getAssetCategories(authenticatedFetch, {
        page: 1,
        pageSize: 200,
      }); // Fetch more
      setAssetCategories(response.results);
      const catMap = new Map<number, string>();
      response.results.forEach((cat) => catMap.set(cat.id, cat.name));
      setCategoryMap(catMap);
    } catch (err: unknown) {
      console.error('Failed to fetch asset categories for filter:', err);
    }
  }, [authenticatedFetch]);

  const fetchLocationsForMap = useCallback(async () => {
    if (!authenticatedFetch) return;
    try {
      const response = await getLocations(authenticatedFetch, {
        page: 1,
        pageSize: 200,
      }); // Fetch many
      const locMap = new Map<number, string>();
      response.results.forEach((loc) => locMap.set(loc.id, loc.name));
      setLocationMap(locMap);
    } catch (err) {
      console.error('Failed to fetch locations for map:', err);
    }
  }, [authenticatedFetch]);

  const fetchAssets = useCallback(async () => {
    if (!authenticatedFetch) return;
    setIsLoading(true);
    setError(null);

    const filters: Record<string, string> = {};
    if (searchTerm) filters.search = searchTerm; // DRF search filter (if backend configured)
    if (statusFilter) filters.status = statusFilter;
    if (categoryFilter) filters.category_id = categoryFilter; // Assuming backend filter by category_id

    let backendSortKey: string | undefined = undefined;
    if (sortConfigKey) {
      backendSortKey = sortConfigKey as string;
      if (sortConfigKey === 'category_name') backendSortKey = 'category__name';
      else if (sortConfigKey === 'location_name')
        backendSortKey = 'location__name';
      else if (sortConfigKey === 'assigned_to_username')
        backendSortKey = 'assigned_to__username';
      // No mapping needed for direct model fields like 'asset_tag', 'name', 'status', 'purchase_date'
    }

    try {
      const response = await getAssets(authenticatedFetch, {
        page: page + 1, // API is 1-indexed
        pageSize: rowsPerPage,
        filters: filters,
        sortBy: backendSortKey,
        sortOrder: sortConfigDirection,
      });
      setAssets(response.results);
      setTotalAssets(response.count);
    } catch (err: unknown) {
      // Changed to unknown
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Failed to fetch assets.');
      console.error('Failed to fetch assets:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    authenticatedFetch,
    page,
    rowsPerPage,
    searchTerm,
    statusFilter,
    categoryFilter,
    sortConfigKey,
    sortConfigDirection,
  ]);

  useEffect(() => {
    fetchAssetCategoriesForFilter();
    fetchLocationsForMap(); // Call new function
  }, [fetchAssetCategoriesForFilter, fetchLocationsForMap]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]); // This will re-run when fetchAssets itself changes (due to its own dependencies)

  const handlePageChange = (_event: unknown, newPage: number) => {
    // event changed to _event
    setPage(newPage);
  };

  const handleRowsPerPageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setPage(0);
  };

  const handleStatusFilterChange = (event: SelectChangeEvent<string>) => {
    // Updated type
    setStatusFilter(event.target.value); // No 'as string' needed if SelectChangeEvent<string>
    setPage(0);
  };

  const handleCategoryFilterChange = (event: SelectChangeEvent<string>) => {
    // Updated type
    setCategoryFilter(event.target.value); // No 'as string' needed
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setCategoryFilter('');
    setPage(0);
    // Optionally reset sort to default
    // setSortConfigKey('asset_tag');
    // setSortConfigDirection('asc');
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelectedIds = assets.map((asset) => asset.id);
      setSelectedAssetIds(newSelectedIds);
      return;
    }
    setSelectedAssetIds([]);
  };

  const handleRowCheckboxChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    assetId: number,
  ) => {
    if (event.target.checked) {
      setSelectedAssetIds((prevSelected) => [...prevSelected, assetId]);
    } else {
      setSelectedAssetIds((prevSelected) =>
        prevSelected.filter((id) => id !== assetId),
      );
    }
  };

  const handlePrintSelected = (autoPrint: boolean) => {
    if (selectedAssetIds.length === 0) {
      showSnackbar('Please select assets to print.', 'warning');
      return;
    }
    navigate('/assets/print-preview', {
      state: { selectedAssetIds: selectedAssetIds, autoPrint: autoPrint },
    });
  };

  const handleSortRequest = (property: keyof Asset | string) => {
    const isAsc = sortConfigKey === property && sortConfigDirection === 'asc';
    setSortConfigDirection(isAsc ? 'desc' : 'asc');
    setSortConfigKey(property);
    setPage(0);
  };

  const handleAddAsset = () => {
    navigate('/assets/new'); // Navigate to a form for creating a new asset
  };

  const handleEditAsset = (id: number) => {
    navigate(`/assets/edit/${id}`); // Navigate to a form for editing
  };

  const handleOpenDeleteDialog = (asset: Asset) => {
    setSelectedAssetForDelete(asset);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedAssetForDelete(null);
  };

  const handleDeleteConfirmed = async () => {
    if (!authenticatedFetch || !selectedAssetForDelete) return;
    setIsLoading(true); // Consider a specific deleting loading state if needed
    setError(null);
    setSuccessMessage(null);
    try {
      await deleteAsset(authenticatedFetch, selectedAssetForDelete.id);
      setSuccessMessage('Asset deleted successfully!');
      fetchAssets(); // Refresh list
      handleCloseDeleteDialog();
    } catch (err: unknown) {
      // Changed to unknown
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Failed to delete asset.');
      console.error('Failed to delete asset:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusChipColor = (status: string) => {
    switch (status) {
      case 'in_use':
        return 'primary';
      case 'in_stock':
        return 'success';
      case 'maintenance':
        return 'warning';
      case 'retired':
        return 'default';
      case 'disposed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Asset List
      </Typography>

      {successMessage && (
        <Snackbar
          open
          autoHideDuration={6000}
          onClose={() => setSuccessMessage(null)}
          message={successMessage}
        />
      )}

      <Paper sx={{ mb: 2, p: 2 }} elevation={2}>
        <Toolbar>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                variant="outlined"
                label="Search Assets"
                placeholder="Tag, Name, Serial..."
                value={searchTerm}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
                  ),
                  endAdornment: searchTerm ? (
                    <IconButton onClick={handleClearSearch} size="small">
                      <ClearIcon />
                    </IconButton>
                  ) : null,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={handleStatusFilterChange} // Removed 'as any'
                  label="Status"
                >
                  {ASSET_STATUS_CHOICES.map((choice) => (
                    <MenuItem key={choice.value} value={choice.value}>
                      {choice.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={handleCategoryFilterChange} // Removed 'as any'
                  label="Category"
                  disabled={!assetCategories.length}
                >
                  <MenuItem value="">
                    <em>All Categories</em>
                  </MenuItem>
                  {assetCategories.map((category) => (
                    <MenuItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid
              item
              xs={12}
              sm={2}
              sx={{ display: 'flex', justifyContent: 'flex-end' }}
            >
              <Button onClick={handleClearFilters} variant="outlined">
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Toolbar>
      </Paper>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={handleAddAsset}
        sx={{ mb: 2 }}
      >
        Add New Asset
      </Button>
      <Button
        variant="outlined"
        startIcon={<PrintIcon />}
        onClick={() => handlePrintSelected(false)}
        disabled={selectedAssetIds.length === 0}
        sx={{ mb: 2, ml: 1 }}
      >
        Print Preview Selected ({selectedAssetIds.length})
      </Button>
      <Button
        variant="outlined"
        startIcon={<PrintIcon />}
        onClick={() => handlePrintSelected(true)}
        disabled={selectedAssetIds.length === 0}
        sx={{ mb: 2, ml: 1 }}
      >
        Print Selected ({selectedAssetIds.length})
      </Button>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {isLoading && assets.length === 0 && (
        <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />
      )}

      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={
                    selectedAssetIds.length > 0 &&
                    selectedAssetIds.length < assets.length
                  }
                  checked={
                    assets.length > 0 &&
                    selectedAssetIds.length === assets.length
                  }
                  onChange={handleSelectAllClick}
                  inputProps={{ 'aria-label': 'select all assets' }}
                />
              </TableCell>
              {headCells.slice(1).map(
                (
                  headCell, // Slice to skip 'select' cell
                ) => (
                  <TableCell
                    key={headCell.id}
                    align={headCell.numeric ? 'right' : 'left'}
                    padding={headCell.padding === 'none' ? 'none' : 'normal'}
                    sortDirection={
                      sortConfigKey === headCell.id
                        ? sortConfigDirection
                        : false
                    }
                  >
                    {headCell.sortable ? (
                      <TableSortLabel
                        active={sortConfigKey === headCell.id}
                        direction={
                          sortConfigKey === headCell.id
                            ? sortConfigDirection
                            : 'asc'
                        }
                        onClick={() => handleSortRequest(headCell.id as string)}
                      >
                        {headCell.label}
                      </TableSortLabel>
                    ) : (
                      headCell.label
                    )}
                  </TableCell>
                ),
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {!isLoading &&
              assets.map((asset) => {
                const isSelected = selectedAssetIds.includes(asset.id);
                return (
                  <TableRow
                    key={asset.id}
                    hover
                    // onClick prop removed as it was unused
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={-1}
                    selected={isSelected}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={(event) =>
                          handleRowCheckboxChange(event, asset.id)
                        }
                        inputProps={{
                          'aria-labelledby': `asset-checkbox-${asset.id}`,
                        }}
                      />
                    </TableCell>
                    <TableCell id={`asset-checkbox-${asset.id}`}>
                      {asset.asset_tag}
                    </TableCell>
                    <TableCell>{asset.name}</TableCell>
                    <TableCell>
                      {categoryMap.get(asset.category?.id ?? -1) || '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={asset.status
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                        color={getStatusChipColor(asset.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {asset.assigned_to?.username || 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      {locationMap.get(asset.location?.id ?? -1) || '-'}
                    </TableCell>
                    <TableCell>
                      {asset.purchase_date
                        ? new Date(asset.purchase_date).toLocaleDateString()
                        : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Asset">
                        <IconButton
                          onClick={() => handleEditAsset(asset.id)}
                          size="small"
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Asset">
                        <IconButton
                          onClick={() => handleEditAsset(asset.id)}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Asset">
                        <IconButton
                          onClick={() => handleOpenDeleteDialog(asset)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            {!isLoading && assets.length === 0 && (
              <TableRow>
                <TableCell colSpan={headCells.length + 1} align="center">
                  No assets found. Try adjusting your filters.
                </TableCell>
              </TableRow>
            )}
            {isLoading && (
              <TableRow>
                <TableCell colSpan={headCells.length + 1} align="center">
                  <CircularProgress sx={{ my: 2 }} />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalAssets}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the asset:{' '}
            <strong>
              {selectedAssetForDelete?.asset_tag} -{' '}
              {selectedAssetForDelete?.name}
            </strong>
            ?
          </Typography>
          <Typography variant="body2" color="textSecondary">
            This action cannot be undone.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDeleteDialog}
            color="secondary"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirmed}
            color="error"
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssetList;
