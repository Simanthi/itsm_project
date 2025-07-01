import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Box,
  Typography,
  MenuItem,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select, // Added Select here
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionIcon from '@mui/icons-material/Description'; // Re-add for IOM button

import { useAuth } from '../../../context/auth/useAuth';
import { useUI } from '../../../context/UIContext/useUI';
import {
  getAssetById,
  createAsset,
  updateAsset,
  getAssetCategories,
  getLocations,
  getVendors,
} from '../../../api/assetApi';
import { getUserList } from '../../../api/authApi'; // For fetching users
import type {
  AssetData,
  AssetCategory,
  Location,
  Vendor,
  User as ApiUser, // Rename to avoid conflict with potential local User type
} from '../types';

// Mimic Django choices for status filter - ensure these match backend model choices
const ASSET_STATUS_CHOICES = [
  { value: 'in_use', label: 'In Use' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'maintenance', label: 'Under Maintenance' },
  { value: 'retired', label: 'Retired' },
  { value: 'disposed', label: 'Disposed' },
];

const initialFormData: AssetData = {
  name: '',
  asset_tag: '',
  serial_number: null,
  status: ASSET_STATUS_CHOICES[0].value,
  category_id: null,
  location_id: null,
  vendor_id: null,
  assigned_to_id: null,
  purchase_date: null,
  warranty_end_date: null,
  description: null,
};

type RawAssetData = Omit<
  AssetData,
  'category_id' | 'location_id' | 'vendor_id' | 'assigned_to_id'
> & {
  category?: { id: number; name: string } | null;
  location?: { id: number; name: string } | null;
  vendor?: { id: number; name: string } | null;
  assigned_to?: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
  } | null;
};

const AssetForm: React.FC = () => {
  const { assetId } = useParams<{ assetId?: string }>(); // assetId from URL
  const navigate = useNavigate();
  const { authenticatedFetch, user: currentUser } = useAuth(); // Get current user for potential defaults
  const { showSnackbar } = useUI();

  const [formData, setFormData] = useState<AssetData>(initialFormData);
  const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false); // For loading initial data (asset, dropdowns)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Add this state to track when asset data is loaded
  const [assetDataRaw, setAssetDataRaw] = useState<RawAssetData | null>(null);

  // Fetch data for dropdowns
  const fetchSupportingData = useCallback(async () => {
    if (!authenticatedFetch) return;
    setIsLoading(true);
    try {
      const [categoriesRes, locationsRes, vendorsRes, usersRes] =
        await Promise.all([
          getAssetCategories(authenticatedFetch, { page: 1, pageSize: 200 }), // Fetch more for dropdowns
          getLocations(authenticatedFetch, { page: 1, pageSize: 200 }),
          getVendors(authenticatedFetch, { page: 1, pageSize: 200 }),
          getUserList(authenticatedFetch), // Assuming getUserList is refactored
        ]);
      setAssetCategories(categoriesRes.results);
      setLocations(locationsRes.results);
      setVendors(vendorsRes.results);
      setUsers(usersRes); // getUserList might not return paginated response, adjust if it does
    } catch (err: unknown) {
      // Changed to unknown
      console.error('Failed to fetch supporting data:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError('Failed to load data for dropdowns. ' + message);
    } finally {
      // Keep loading true if we are in edit mode and asset data is still to be fetched
      if (!assetId) setIsLoading(false);
    }
  }, [authenticatedFetch, assetId]);

  // Fetch asset details if in edit mode
  const fetchAssetForEdit = useCallback(async () => {
    if (!assetId || !authenticatedFetch) return;
    setIsLoading(true); // Ensure loading is true when fetching asset
    setError(null);
    try {
      const asset = await getAssetById(
        authenticatedFetch,
        parseInt(assetId, 10),
      );
      setAssetDataRaw(asset); // <-- store raw asset data
      setIsEditMode(true);
    } catch (err: unknown) {
      // Changed to unknown
      console.error('Failed to fetch asset for editing:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError('Failed to load asset details. ' + message);
      navigate('/assets'); // Navigate away if asset not found or error
    } finally {
      setIsLoading(false);
    }
  }, [assetId, authenticatedFetch, navigate]);

  // Add this effect to set formData only after both assetDataRaw and dropdowns are loaded
  useEffect(() => {
    if (
      assetDataRaw &&
      assetCategories.length &&
      locations.length &&
      vendors.length &&
      users.length
    ) {
      console.log('Setting formData:', {
        category_id: assetDataRaw.category?.id,
        location_id: assetDataRaw.location?.id,
        vendor_id: assetDataRaw.vendor?.id,
        assigned_to_id: assetDataRaw.assigned_to?.id,
      });
      setFormData({
        name: assetDataRaw.name,
        asset_tag: assetDataRaw.asset_tag,
        serial_number: assetDataRaw.serial_number || null,
        status: assetDataRaw.status,
        category_id: assetDataRaw.category?.id || null,
        location_id: assetDataRaw.location?.id || null,
        vendor_id: assetDataRaw.vendor?.id || null,
        assigned_to_id: assetDataRaw.assigned_to?.id || null,
        purchase_date: assetDataRaw.purchase_date
          ? assetDataRaw.purchase_date.split('T')[0]
          : null,
        warranty_end_date: assetDataRaw.warranty_end_date
          ? assetDataRaw.warranty_end_date.split('T')[0]
          : null,
        description: assetDataRaw.description || null,
      });
    }
  }, [assetDataRaw, assetCategories, locations, vendors, users]);

  useEffect(() => {
    fetchSupportingData();
  }, [fetchSupportingData]);

  useEffect(() => {
    if (assetId) {
      fetchAssetForEdit();
    } else {
      // If not edit mode, and currentUser is available, set as default assigned_to
      // and potentially requested_by if that field were here.
      // For AssetForm, assigned_to_id is what we might default.
      // But assets are not typically self-assigned on creation by default user.
      // So, keeping it null or letting admin choose is fine.
      // setFormData(prev => ({...prev, assigned_to_id: currentUser?.id || null}));
      setIsLoading(false); // Not fetching an asset, so stop loading (supporting data might still be loading via its own effect)
    }
  }, [assetId, fetchAssetForEdit, currentUser]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value || null })); // Handle empty string as null for optional fields
  };

  const handleSelectChange = (event: SelectChangeEvent<string | number>) => {
    const { name, value } = event.target;
    setFormData((prev) => {
      if (name === 'status') {
        return { ...prev, status: value as string };
      }
      // For ID fields, allow null or number
      return {
        ...prev,
        [name]: value === '' ? null : Number(value),
      };
    });
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value || null, // Store null if date is cleared
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authenticatedFetch) {
      setError('Authentication not available. Please log in.');
      showSnackbar('Authentication not available.', 'error');
      return;
    }
    if (!formData.name || !formData.asset_tag || !formData.status) {
      setError('Name, Asset Tag, and Status are required fields.');
      showSnackbar('Name, Asset Tag, and Status are required.', 'warning');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    const payload: AssetData = {
      ...formData,
      // Ensure numeric IDs are numbers, and nulls are passed for empty selections
      category_id: formData.category_id,
      location_id: formData.location_id ? Number(formData.location_id) : null,
      vendor_id: formData.vendor_id ? Number(formData.vendor_id) : null,
      assigned_to_id: formData.assigned_to_id
        ? Number(formData.assigned_to_id)
        : null,
      // Ensure empty strings for dates/text fields are converted to null if backend expects null
      serial_number: formData.serial_number || null,
      purchase_date: formData.purchase_date || null,
      warranty_end_date: formData.warranty_end_date || null,
      description: formData.description || null,
    };

    try {
      if (isEditMode && assetId) {
        await updateAsset(authenticatedFetch, parseInt(assetId, 10), payload);
        showSnackbar('Asset updated successfully!', 'success');
      } else {
        await createAsset(authenticatedFetch, payload);
        showSnackbar('Asset created successfully!', 'success');
      }
      navigate('/assets'); // Navigate to asset list page
    } catch (err: unknown) {
      // Changed to unknown
      console.error('Failed to save asset:', err);
      const message = err instanceof Error ? err.message : String(err);
      const apiError =
        message ||
        (typeof err === 'string' ? err : 'An unknown error occurred');
      setError(`Failed to save asset: ${apiError}`);
      showSnackbar(`Failed to save asset: ${apiError}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading asset data...</Typography>
      </Box>
    );
  }

  // Separate error display for critical load errors (e.g. asset not found in edit mode)
  // This block is for when fetching the asset in edit mode fails.
  if (isEditMode && error && !formData.asset_tag && !isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Back
        </Button>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 4 }, m: { xs: 1, md: 2 } }} elevation={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
        <Typography variant="h5" component="h1">
          {isEditMode
            ? `Edit Asset: ${formData.asset_tag || ''}`
            : 'Create New Asset'}
        </Typography>
      </Box>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}{' '}
        {/* For submission errors */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              name="name"
              label="Asset Name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              required
              error={!formData.name && !!error}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="asset_tag"
              label="Asset Tag"
              value={formData.asset_tag}
              onChange={handleChange}
              fullWidth
              required
              error={!formData.asset_tag && !!error}
              InputProps={{
                readOnly: isEditMode, // Asset tag might be non-editable after creation
                style: isEditMode ? { backgroundColor: '#f0f0f0' } : {},
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="serial_number"
              label="Serial Number"
              value={formData.serial_number || ''}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required error={!formData.status && !!error}>
              <InputLabel id="asset-status-label">Status</InputLabel>
              <Select
                labelId="asset-status-label"
                id="asset-status-select"
                name="status"
                value={formData.status}
                label="Status" // MUI uses this to ensure label floats correctly, and can contribute to accessible name
                onChange={handleSelectChange}
              >
                {ASSET_STATUS_CHOICES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="asset-category-label">Category</InputLabel>
              <Select
                labelId="asset-category-label"
                id="asset-category-select"
                name="category_id"
                value={formData.category_id ?? ''}
                label="Category"
                onChange={handleSelectChange}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {assetCategories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="asset-location-label">Location</InputLabel>
              <Select
                labelId="asset-location-label"
                id="asset-location-select"
                name="location_id"
                value={formData.location_id || ''}
                label="Location"
                onChange={handleSelectChange}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {locations.map((location) => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="asset-vendor-label">Vendor</InputLabel>
              <Select
                labelId="asset-vendor-label"
                id="asset-vendor-select"
                name="vendor_id"
                value={formData.vendor_id || ''}
                label="Vendor"
                onChange={handleSelectChange}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {vendors.map((vendor) => (
                  <MenuItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="asset-assigned-to-label">Assigned To</InputLabel>
              <Select
                labelId="asset-assigned-to-label"
                id="asset-assigned-to-select"
                name="assigned_to_id"
                value={formData.assigned_to_id || ''}
                label="Assigned To"
                onChange={handleSelectChange}
              >
                <MenuItem value="">
                  <em>Unassigned</em>
                </MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.username} ({user.first_name} {user.last_name})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="purchase_date"
              label="Purchase Date"
              type="date"
              value={formData.purchase_date || ''}
              onChange={handleDateChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="warranty_end_date"
              label="Warranty End Date"
              type="date"
              value={formData.warranty_end_date || ''}
              onChange={handleDateChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="description"
              label="Description"
              value={formData.description || ''}
              onChange={handleChange}
              fullWidth
              multiline
              rows={4}
            />
          </Grid>
          <Grid
            item
            xs={12}
            sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}
          >
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <CircularProgress size={24} />
              ) : isEditMode ? (
                'Update Asset'
              ) : (
                'Create Asset'
              )}
            </Button>
            {isEditMode && assetDataRaw && assetId && ( // Show Create IOM button only in edit mode with asset data
                <Button
                    variant="outlined"
                    color="info"
                    startIcon={<DescriptionIcon />}
                    onClick={() => {
                        const parentRecordContext = {
                            objectId: parseInt(assetId, 10),
                            contentTypeAppLabel: 'assets', // From assets.apps.AssetsConfig.name
                            contentTypeModel: 'asset',    // From Asset._meta.model_name
                            recordName: assetDataRaw.name,
                            recordIdentifier: assetDataRaw.asset_tag,
                        };
                        navigate('/ioms/new/select-template', { state: { parentRecordContext } });
                    }}
                    disabled={isSubmitting || isLoading}
                    sx={{ ml: 1 }}
                >
                    Create IOM for this Asset
                </Button>
            )}
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default AssetForm;
// ... (existing comments remain)
// Re-added DescriptionIcon for IOM button.
// Added Create IOM button logic.
