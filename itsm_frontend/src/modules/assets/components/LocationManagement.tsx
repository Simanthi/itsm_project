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
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

import { useAuth } from '../../../context/auth/useAuth';
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from '../../../api/assetApi';
import type { Location, LocationData, PaginatedResponse } from '../types';

const LocationManagement: React.FC = () => {
  const { authenticatedFetch } = useAuth();

  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [openFormDialog, setOpenFormDialog] = useState<boolean>(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locationFormData, setLocationFormData] = useState<LocationData>({
    name: '',
    description: '',
  });

  const fetchLocations = useCallback(async () => {
    if (!authenticatedFetch) return;
    setIsLoading(true);
    setError(null);
    try {
      const response: PaginatedResponse<Location> = await getLocations(authenticatedFetch, { page: 1, pageSize: 100 });
      setLocations(response.results);
    } catch (err: unknown) {
      let message = 'Failed to fetch locations.';
      if (err instanceof Error) {
        message = err.message || message;
      } else if (typeof err === 'string') {
        message = err || message;
      }
      setError(message);
      console.error("Failed to fetch locations:", err);
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleOpenFormDialog = (location?: Location) => {
    setSelectedLocation(location || null);
    setLocationFormData(
      location ? { name: location.name, description: location.description || '' } : { name: '', description: '' }
    );
    setOpenFormDialog(true);
    setError(null);
  };

  const handleCloseFormDialog = () => {
    setOpenFormDialog(false);
    setSelectedLocation(null);
    setLocationFormData({ name: '', description: '' });
  };

  const handleOpenDeleteDialog = (location: Location) => {
    setSelectedLocation(location);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedLocation(null);
  };

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setLocationFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveLocation = async () => {
    if (!authenticatedFetch || !locationFormData.name) {
        setError("Location name is required.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (selectedLocation && selectedLocation.id) {
        await updateLocation(authenticatedFetch, selectedLocation.id, locationFormData);
        setSuccessMessage('Location updated successfully!');
      } else {
        await createLocation(authenticatedFetch, locationFormData);
        setSuccessMessage('Location created successfully!');
      }
      fetchLocations();
      handleCloseFormDialog();
    } catch (err: unknown) {
      let message = 'Failed to save location.';
      if (err instanceof Error) {
        message = err.message || message;
      } else if (typeof err === 'string') {
        message = err || message;
      }
      setError(message);
      console.error("Failed to save location:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!authenticatedFetch || !selectedLocation || !selectedLocation.id) return;
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await deleteLocation(authenticatedFetch, selectedLocation.id);
      setSuccessMessage('Location deleted successfully!');
      fetchLocations();
      handleCloseDeleteDialog();
    } catch (err: unknown) {
      let message = 'Failed to delete location.';
      if (err instanceof Error) {
        message = err.message || message;
      } else if (typeof err === 'string') {
        message = err || message;
      }
      setError(message);
      console.error("Failed to delete location:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        Manage Locations
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMessage && <Snackbar open autoHideDuration={6000} onClose={() => setSuccessMessage(null)} message={successMessage} />}

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => handleOpenFormDialog()}
        sx={{ mb: 2 }}
        disabled={isLoading}
      >
        Add Location
      </Button>

      {isLoading && !locations.length && <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />}

      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {locations.map((location) => (
              <TableRow key={location.id}>
                <TableCell>{location.name}</TableCell>
                <TableCell>{location.description || '-'}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpenFormDialog(location)} disabled={isLoading} size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleOpenDeleteDialog(location)} disabled={isLoading} size="small">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && !locations.length && (
                <TableRow>
                    <TableCell colSpan={3} align="center">No locations found.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Form Dialog (Create/Edit) */}
      <Dialog open={openFormDialog} onClose={handleCloseFormDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedLocation ? 'Edit Location' : 'Add New Location'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Location Name"
            type="text"
            fullWidth
            variant="outlined"
            value={locationFormData.name}
            onChange={handleFormChange}
            required
            error={!locationFormData.name && !!error}
          />
          <TextField
            margin="dense"
            name="description"
            label="Description (Optional)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={locationFormData.description}
            onChange={handleFormChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFormDialog} color="secondary" disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSaveLocation} variant="contained" disabled={isLoading}>
            {isLoading && selectedLocation ? 'Saving...' : isLoading ? 'Creating...' : selectedLocation ? 'Save Changes' : 'Create Location'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the location: <strong>{selectedLocation?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="textSecondary">
            This action cannot be undone.
          </Typography>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="secondary" disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirmed} color="error" variant="contained" disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LocationManagement;
