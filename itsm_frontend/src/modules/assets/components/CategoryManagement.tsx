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
  getAssetCategories,
  createAssetCategory,
  updateAssetCategory,
  deleteAssetCategory,
} from '../../../api/assetApi';
import type { AssetCategory, AssetCategoryData, PaginatedResponse } from '../../../api/assetApi';

const CategoryManagement: React.FC = () => {
  const { authenticatedFetch } = useAuth();

  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [openFormDialog, setOpenFormDialog] = useState<boolean>(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);

  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<AssetCategoryData>({
    name: '',
    description: '',
  });

  const fetchCategories = useCallback(async () => {
    if (!authenticatedFetch) return;
    setIsLoading(true);
    setError(null);
    try {
      // Using a large page size to get all categories for now.
      // Implement proper pagination if the number of categories grows significantly.
      const response: PaginatedResponse<AssetCategory> = await getAssetCategories(authenticatedFetch, { page: 1, pageSize: 100 });
      setCategories(response.results);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch categories.');
      console.error("Failed to fetch categories:", err);
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenFormDialog = (category?: AssetCategory) => {
    setSelectedCategory(category || null);
    setCategoryFormData(
      category ? { name: category.name, description: category.description || '' } : { name: '', description: '' }
    );
    setOpenFormDialog(true);
    setError(null); // Clear previous errors
  };

  const handleCloseFormDialog = () => {
    setOpenFormDialog(false);
    setSelectedCategory(null);
    setCategoryFormData({ name: '', description: '' });
  };

  const handleOpenDeleteDialog = (category: AssetCategory) => {
    setSelectedCategory(category);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedCategory(null);
  };

  const handleFormChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setCategoryFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveCategory = async () => {
    if (!authenticatedFetch || !categoryFormData.name) { // Basic validation
        setError("Category name is required.");
        return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (selectedCategory && selectedCategory.id) {
        // Update existing category
        await updateAssetCategory(authenticatedFetch, selectedCategory.id, categoryFormData);
        setSuccessMessage('Category updated successfully!');
      } else {
        // Create new category
        await createAssetCategory(authenticatedFetch, categoryFormData);
        setSuccessMessage('Category created successfully!');
      }
      fetchCategories(); // Refresh list
      handleCloseFormDialog();
    } catch (err: any) {
      setError(err.message || 'Failed to save category.');
      console.error("Failed to save category:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!authenticatedFetch || !selectedCategory || !selectedCategory.id) return;
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await deleteAssetCategory(authenticatedFetch, selectedCategory.id);
      setSuccessMessage('Category deleted successfully!');
      fetchCategories(); // Refresh list
      handleCloseDeleteDialog();
    } catch (err: any) {
      setError(err.message || 'Failed to delete category.');
      console.error("Failed to delete category:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Manage Asset Categories
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
        Add Category
      </Button>

      {isLoading && !categories.length && <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />}

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
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>{category.name}</TableCell>
                <TableCell>{category.description || '-'}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpenFormDialog(category)} disabled={isLoading} size="small">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleOpenDeleteDialog(category)} disabled={isLoading} size="small">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && !categories.length && (
                <TableRow>
                    <TableCell colSpan={3} align="center">No categories found.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Form Dialog (Create/Edit) */}
      <Dialog open={openFormDialog} onClose={handleCloseFormDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Category Name"
            type="text"
            fullWidth
            variant="outlined"
            value={categoryFormData.name}
            onChange={handleFormChange}
            required
            error={!categoryFormData.name && !!error} // Show error if name is empty on submit attempt
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
            value={categoryFormData.description}
            onChange={handleFormChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFormDialog} color="secondary" disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSaveCategory} variant="contained" disabled={isLoading}>
            {isLoading && selectedCategory ? 'Saving...' : isLoading ? 'Creating...' : selectedCategory ? 'Save Changes' : 'Create Category'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the category: <strong>{selectedCategory?.name}</strong>?
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

export default CategoryManagement;
