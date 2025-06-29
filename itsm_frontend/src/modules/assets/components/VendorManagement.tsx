import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Grid, // For form layout
  Checkbox, // Import Checkbox
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import DescriptionIcon from '@mui/icons-material/Description'; // For Create IOM button
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../../context/UIContext/useUI';

import { useAuth } from '../../../context/auth/useAuth';
import {
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor,
} from '../../../api/assetApi';
import type { Vendor, VendorData, PaginatedResponse } from '../types';

const initialFormData: VendorData = {
  name: '',
  contact_person: '',
  email: '',
  phone_number: '',
  address: '',
};

const VendorManagement: React.FC = () => {
  const { authenticatedFetch } = useAuth();
  const navigate = useNavigate(); // useNavigate for printing
  const { showSnackbar } = useUI(); // useUI for snackbar

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorIds, setSelectedVendorIds] = useState<number[]>([]); // State for selection
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [openFormDialog, setOpenFormDialog] = useState<boolean>(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorFormData, setVendorFormData] =
    useState<VendorData>(initialFormData);

  const fetchVendors = useCallback(async () => {
    if (!authenticatedFetch) return;
    setIsLoading(true);
    setError(null);
    try {
      const response: PaginatedResponse<Vendor> = await getVendors(
        authenticatedFetch,
        { page: 1, pageSize: 100 },
      );
      setVendors(response.results);
    } catch (err: unknown) {
      let message = 'Failed to fetch vendors.';
      if (err instanceof Error) {
        message = err.message || message;
      } else if (typeof err === 'string') {
        message = err || message;
      }
      setError(message);
      console.error('Failed to fetch vendors:', err);
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const handleOpenFormDialog = (vendor?: Vendor) => {
    setSelectedVendor(vendor || null);
    setVendorFormData(
      vendor
        ? {
            name: vendor.name,
            contact_person: vendor.contact_person || '',
            email: vendor.email || '',
            phone_number: vendor.phone_number || '',
            address: vendor.address || '',
          }
        : initialFormData,
    );
    setOpenFormDialog(true);
    setError(null);
  };

  const handleCloseFormDialog = () => {
    setOpenFormDialog(false);
    setSelectedVendor(null);
    setVendorFormData(initialFormData);
  };

  const handleOpenDeleteDialog = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedVendor(null);
  };

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setVendorFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveVendor = async () => {
    if (!authenticatedFetch || !vendorFormData.name) {
      setError('Vendor name is required.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (selectedVendor && selectedVendor.id) {
        await updateVendor(
          authenticatedFetch,
          selectedVendor.id,
          vendorFormData,
        );
        setSuccessMessage('Vendor updated successfully!');
      } else {
        await createVendor(authenticatedFetch, vendorFormData);
        setSuccessMessage('Vendor created successfully!');
      }
      fetchVendors();
      handleCloseFormDialog();
    } catch (err: unknown) {
      let message = 'Failed to save vendor.';
      if (err instanceof Error) {
        message = err.message || message;
      } else if (typeof err === 'string') {
        message = err || message;
      }
      setError(message);
      console.error('Failed to save vendor:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!authenticatedFetch || !selectedVendor || !selectedVendor.id) return;
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await deleteVendor(authenticatedFetch, selectedVendor.id);
      setSuccessMessage('Vendor deleted successfully!');
      fetchVendors();
      handleCloseDeleteDialog();
    } catch (err: unknown) {
      let message = 'Failed to delete vendor.';
      if (err instanceof Error) {
        message = err.message || message;
      } else if (typeof err === 'string') {
        message = err || message;
      }
      setError(message);
      console.error('Failed to delete vendor:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelectedIds = vendors.map((vendor) => vendor.id);
      setSelectedVendorIds(newSelectedIds);
      return;
    }
    setSelectedVendorIds([]);
  };

  const handleRowCheckboxChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    vendorId: number,
  ) => {
    if (event.target.checked) {
      setSelectedVendorIds((prevSelected) => [...prevSelected, vendorId]);
    } else {
      setSelectedVendorIds((prevSelected) =>
        prevSelected.filter((id) => id !== vendorId),
      );
    }
  };

  const handlePrintSelected = (autoPrint: boolean) => {
    if (selectedVendorIds.length === 0) {
      showSnackbar('Please select vendors to print.', 'warning');
      return;
    }
    const selectedVendorsData = vendors.filter((vendor) =>
      selectedVendorIds.includes(vendor.id),
    );
    if (selectedVendorsData.length === 0) {
      showSnackbar('Selected vendors not found. Please refresh.', 'warning');
      return;
    }
    navigate('/assets/vendors/print-preview', {
      state: { selectedVendors: selectedVendorsData, autoPrint: autoPrint },
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Manage Vendors
      </Typography>

      {error && !openFormDialog && !openDeleteDialog && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Snackbar
          open
          autoHideDuration={6000}
          onClose={() => setSuccessMessage(null)}
          message={successMessage}
        />
      )}

      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenFormDialog()}
          disabled={isLoading}
        >
          Add Vendor
        </Button>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={() => handlePrintSelected(false)}
          disabled={selectedVendorIds.length === 0 || isLoading}
        >
          Print Preview Selected ({selectedVendorIds.length})
        </Button>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          onClick={() => handlePrintSelected(true)}
          disabled={selectedVendorIds.length === 0 || isLoading}
        >
          Print Selected ({selectedVendorIds.length})
        </Button>
      </Box>

      {isLoading && !vendors.length && (
        <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />
      )}

      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={
                    selectedVendorIds.length > 0 &&
                    selectedVendorIds.length < vendors.length
                  }
                  checked={
                    vendors.length > 0 &&
                    selectedVendorIds.length === vendors.length
                  }
                  onChange={handleSelectAllClick}
                  inputProps={{ 'aria-label': 'select all vendors' }}
                />
              </TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Contact Person</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Address</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vendors.map((vendor) => {
              const isSelected = selectedVendorIds.includes(vendor.id);
              return (
                <TableRow
                  key={vendor.id}
                  hover
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={-1}
                  selected={isSelected}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={(event) =>
                        handleRowCheckboxChange(event, vendor.id)
                      }
                      inputProps={{
                        'aria-labelledby': `vendor-checkbox-${vendor.id}`,
                      }}
                    />
                  </TableCell>
                  <TableCell id={`vendor-checkbox-${vendor.id}`}>
                    {vendor.name}
                  </TableCell>
                  <TableCell>{vendor.contact_person || '-'}</TableCell>
                  <TableCell>{vendor.email || '-'}</TableCell>
                  <TableCell>{vendor.phone_number || '-'}</TableCell>
                  <TableCell
                    sx={{
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {vendor.address || '-'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      onClick={() => handleOpenFormDialog(vendor)}
                      disabled={isLoading}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      onClick={() => handleOpenDeleteDialog(vendor)}
                      disabled={isLoading}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                    <IconButton
                        onClick={() => {
                            const parentRecordContext = {
                                objectId: vendor.id,
                                contentTypeAppLabel: 'assets', // Vendor model is in 'assets' app
                                contentTypeModel: 'vendor',    // Model name is 'vendor'
                                recordName: vendor.name,
                                recordIdentifier: `Vendor ID: ${vendor.id}`, // Or another unique identifier if available
                            };
                            navigate('/ioms/new/select-template', { state: { parentRecordContext } });
                        }}
                        disabled={isLoading}
                        size="small"
                        color="info"
                        title="Create IOM for this Vendor"
                    >
                        <DescriptionIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {!isLoading && !vendors.length && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No vendors found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Form Dialog (Create/Edit) */}
      <Dialog
        open={openFormDialog}
        onClose={handleCloseFormDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedVendor ? 'Edit Vendor' : 'Add New Vendor'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                autoFocus
                name="name"
                label="Vendor Name"
                type="text"
                fullWidth
                variant="outlined"
                value={vendorFormData.name}
                onChange={handleFormChange}
                required
                error={!vendorFormData.name && !!error} // Basic error indication
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="contact_person"
                label="Contact Person (Optional)"
                type="text"
                fullWidth
                variant="outlined"
                value={vendorFormData.contact_person}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="email"
                label="Email (Optional)"
                type="email"
                fullWidth
                variant="outlined"
                value={vendorFormData.email}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="phone_number"
                label="Phone Number (Optional)"
                type="tel"
                fullWidth
                variant="outlined"
                value={vendorFormData.phone_number}
                onChange={handleFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="address"
                label="Address (Optional)"
                type="text"
                fullWidth
                variant="outlined"
                multiline
                rows={3}
                value={vendorFormData.address}
                onChange={handleFormChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseFormDialog}
            color="secondary"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveVendor}
            variant="contained"
            disabled={isLoading}
          >
            {isLoading && selectedVendor
              ? 'Saving...'
              : isLoading
                ? 'Creating...'
                : selectedVendor
                  ? 'Save Changes'
                  : 'Create Vendor'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the vendor:{' '}
            <strong>{selectedVendor?.name}</strong>?
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

export default VendorManagement;
