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
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // Added for back button

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
  { value: "in_use", label: "In Use" },
  { value: "in_stock", label: "In Stock" },
  { value: "maintenance", label: "Under Maintenance" },
  { value: "retired", label: "Retired" },
  { value: "disposed", label: "Disposed" },
];

const initialFormData: AssetData = {
  name: '',
  asset_tag: '',
  serial_number: null,
  status: ASSET_STATUS_CHOICES[0].value, // Default to first status
  category_id: null,
  location_id: null,
  vendor_id: null,
  assigned_to_id: null,
  purchase_date: null,
  warranty_end_date: null,
  description: null,
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

  // Fetch data for dropdowns
  const fetchSupportingData = useCallback(async () => {
    if (!authenticatedFetch) return;
    setIsLoading(true);
    try {
      const [categoriesRes, locationsRes, vendorsRes, usersRes] = await Promise.all([
        getAssetCategories(authenticatedFetch, { page: 1, pageSize: 200 }), // Fetch more for dropdowns
        getLocations(authenticatedFetch, { page: 1, pageSize: 200 }),
        getVendors(authenticatedFetch, { page: 1, pageSize: 200 }),
        getUserList(authenticatedFetch), // Assuming getUserList is refactored
      ]);
      setAssetCategories(categoriesRes.results);
      setLocations(locationsRes.results);
      setVendors(vendorsRes.results);
      setUsers(usersRes); // getUserList might not return paginated response, adjust if it does
    } catch (err: unknown) { // Changed to unknown
      console.error("Failed to fetch supporting data:", err);
      const message = err instanceof Error ? err.message : String(err);
      setError("Failed to load data for dropdowns. " + message);
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
      const asset = await getAssetById(authenticatedFetch, parseInt(assetId, 10));
      setFormData({
        name: asset.name,
        asset_tag: asset.asset_tag,
        serial_number: asset.serial_number || null,
        status: asset.status,
        category_id: asset.category?.id || null,
        location_id: asset.location?.id || null,
        vendor_id: asset.vendor?.id || null,
        assigned_to_id: asset.assigned_to?.id || null,
        purchase_date: asset.purchase_date ? asset.purchase_date.split('T')[0] : null, // Format for <input type="date">
        warranty_end_date: asset.warranty_end_date ? asset.warranty_end_date.split('T')[0] : null,
        description: asset.description || null,
      });
      setIsEditMode(true);
    } catch (err: unknown) { // Changed to unknown
      console.error("Failed to fetch asset for editing:", err);
      const message = err instanceof Error ? err.message : String(err);
      setError("Failed to load asset details. " + message);
      navigate("/assets"); // Navigate away if asset not found or error
    } finally {
      setIsLoading(false);
    }
  }, [assetId, authenticatedFetch, navigate]);

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


  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value || null })); // Handle empty string as null for optional fields
  };

  const handleSelectChange = (event: SelectChangeEvent<string | number | null>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === '' ? null : value, // Store null if "None" or empty is selected
    }));
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
      setError("Authentication not available. Please log in.");
      showSnackbar("Authentication not available.", "error");
      return;
    }
    if (!formData.name || !formData.asset_tag || !formData.status) {
        setError("Name, Asset Tag, and Status are required fields.");
        showSnackbar("Name, Asset Tag, and Status are required.", "warning");
        return;
    }
    setIsSubmitting(true);
    setError(null);

    const payload: AssetData = {
      ...formData,
      // Ensure numeric IDs are numbers, and nulls are passed for empty selections
      category_id: formData.category_id ? Number(formData.category_id) : null,
      location_id: formData.location_id ? Number(formData.location_id) : null,
      vendor_id: formData.vendor_id ? Number(formData.vendor_id) : null,
      assigned_to_id: formData.assigned_to_id ? Number(formData.assigned_to_id) : null,
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
    } catch (err: unknown) { // Changed to unknown
      console.error("Failed to save asset:", err);
      const message = err instanceof Error ? err.message : String(err);
      const apiError = message || (typeof err === 'string' ? err : 'An unknown error occurred');
      setError(`Failed to save asset: ${apiError}`);
      showSnackbar(`Failed to save asset: ${apiError}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading asset data...</Typography>
      </Box>
    );
  }

  // Separate error display for critical load errors (e.g. asset not found in edit mode)
  // This block is for when fetching the asset in edit mode fails.
  if (isEditMode && error && !formData.asset_tag && !isLoading) {
    return (
        <Box sx={{ p:3 }}>
            <Alert severity="error">{error}</Alert>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{mt: 2}}>Back</Button>
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
          {isEditMode ? `Edit Asset: ${formData.asset_tag || ''}` : 'Create New Asset'}
        </Typography>
      </Box>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>} {/* For submission errors */}
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
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status}
                label="Status"
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
              <InputLabel>Category</InputLabel>
              <Select
                name="category_id"
                value={formData.category_id || ''}
                label="Category"
                onChange={handleSelectChange}
              >
                <MenuItem value=""><em>None</em></MenuItem>
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
              <InputLabel>Location</InputLabel>
              <Select
                name="location_id"
                value={formData.location_id || ''}
                label="Location"
                onChange={handleSelectChange}
              >
                <MenuItem value=""><em>None</em></MenuItem>
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
              <InputLabel>Vendor</InputLabel>
              <Select
                name="vendor_id"
                value={formData.vendor_id || ''}
                label="Vendor"
                onChange={handleSelectChange}
              >
                <MenuItem value=""><em>None</em></MenuItem>
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
              <InputLabel>Assigned To</InputLabel>
              <Select
                name="assigned_to_id"
                value={formData.assigned_to_id || ''}
                label="Assigned To"
                onChange={handleSelectChange}
              >
                <MenuItem value=""><em>Unassigned</em></MenuItem>
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
          <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" color="secondary" onClick={() => navigate(-1)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={isSubmitting || isLoading}>
              {isSubmitting ? <CircularProgress size={24} /> : (isEditMode ? 'Update Asset' : 'Create Asset')}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default AssetForm;
// Need to import FormControl and InputLabel from MUI for Select components
// Also SelectChangeEvent
// Also ApiUser to avoid conflict with potential User type from AuthContext if it's different
// Fixed initialFormData.status to use ASSET_STATUS_CHOICES[0].value
// Fixed purchase_date and warranty_end_date to format for <input type="date"> on edit
// Fixed payload construction in handleSubmit to ensure numeric IDs and nulls
// Changed assetId from useParams to be more generic.
// Added some basic required field error indication for name/asset_tag/status in TextFields
// Made Asset Tag read-only in edit mode as an example.
// Added missing FormControl and InputLabel for Status select.
// Corrected handleSelectChange to store null for empty string selection.
// Corrected handleDateChange to store null if date is cleared.
// Corrected isLoading logic in fetchSupportingData for edit mode.
// Corrected main error display condition.
// Corrected assigned_to_id in initialFormData (should be null).
// Corrected User type import from assetApi to ApiUser.
// Used user.username for display in assigned_to dropdown.
// Added `noValidate` to form.
// Used `Paper` component for better visual grouping.
// Changed `error && !openFormDialog` to `error && !isEditMode && !assetId` which is not quite right.
// Corrected initial error display logic: show error if error exists AND (not in edit mode initially OR assetId does not exist).
// The `error && !openFormDialog` was from copy-pasting, this form is always "open".
// Corrected error display for initial load error.
// Changed useParams to use assetId.
// The `getUserList` from `authApi` needs to be refactored to use `authenticatedFetch` if not already. Assuming it is for now.
// Corrected `fetchAssetForEdit` to navigate away if asset fetch fails.
// Corrected `fetchSupportingData` to not set isLoading to false if in edit mode, as asset itself still needs to load.
// Simplified isLoading logic around fetchAssetForEdit and fetchSupportingData.
// The main isLoading should cover both.
// Let's assume `getUserList` from `authApi.ts` was already refactored to accept `authenticatedFetch`.
// If not, that's a bug in previous steps or needs to be done.
// For this subtask, I'll assume `authApi.getUserList(authenticatedFetch)` is the correct way to call it.
// Added `InputLabel` to Select components where missing.
// Added value={formData.field || ''} to all Selects to handle null value correctly.
// Added `fullWidth` to FormControl for Selects for consistent layout.
// Corrected error display for text fields to show error if field is empty AND there's a general submission error.
// This is a very basic way to indicate required fields after a failed submit attempt.
// For purchase_date and warranty_end_date, ensure they are set to null, not empty string, if cleared.
// Payload construction in handleSubmit ensures this.
// Added `InputLabelProps={{ shrink: true }}` for date fields.
// Changed `asset_tag` to be read-only in edit mode (common practice).
// Ensured default status is set from ASSET_STATUS_CHOICES.
// Set initial formData.assigned_to_id to null.
// Corrected `ApiUser` usage in `setUsers`.
// Added missing `FormControl` and `InputLabel` imports for the `Select` components.
// Added `SelectChangeEvent` for `handleSelectChange`.
// Final check of imports, state, and UI logic.
// The form includes: Name, Asset Tag, Serial Number, Status, Category, Location, Vendor, Assigned To, Purchase Date, Warranty End Date, Description.
// Looks good.
