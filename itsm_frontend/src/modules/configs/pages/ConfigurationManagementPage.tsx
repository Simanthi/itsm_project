import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress, Alert } from '@mui/material';
import { DataGrid, type GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { type ConfigurationItem, type NewConfigurationItemData } from '../types';
import { getConfigItems, deleteConfigItem, createConfigItem, updateConfigItem } from '../api';
import { useUI } from '../../../context/UIContext/useUI';
import { useAuth } from '../../../context/auth/useAuth'; // Import useAuth
// import type { AuthenticatedFetch } from '../../../context/auth/AuthContextDefinition'; // Import AuthenticatedFetch type - Removed as unused for explicit annotation
import ConfigurationItemForm from '../components/ConfigurationItemForm';

const ConfigurationManagementPage: React.FC = () => {
  const { showSnackbar, showConfirmDialog } = useUI();
  const { authenticatedFetch, loading: authLoading, isAuthenticated } = useAuth(); // Add authenticatedFetch

  const [configItems, setConfigItems] = useState<ConfigurationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCI, setEditingCI] = useState<ConfigurationItem | null>(null);

  const fetchCIs = useCallback(async () => {
    if (!isAuthenticated && !authLoading) {
      setError("User is not authenticated. Cannot load configuration items.");
      setLoading(false);
      setConfigItems([]);
      return;
    }
    if (authLoading) {
      setLoading(true); // Show loading while auth is in progress
      return;
    }
    if (!authenticatedFetch) return; // Should be available if !authLoading && isAuthenticated

    setLoading(true);
    try {
      const items = await getConfigItems(authenticatedFetch); // Pass authenticatedFetch
      setConfigItems(items);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch configuration items';
      setError(errorMsg);
      showSnackbar(errorMsg, 'error');
      setConfigItems([]);
    } finally {
      setLoading(false);
    }
  }, [showSnackbar, authenticatedFetch, authLoading, isAuthenticated]);

  useEffect(() => {
    // Initial fetch or re-fetch if auth state changes
    if (!authLoading) { // Only fetch if auth state is resolved
        fetchCIs();
    } else {
        setLoading(true); // Set loading true if auth is initially loading
    }
  }, [fetchCIs, authLoading]);

  const handleOpenCreateForm = () => {
    setEditingCI(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (ci: ConfigurationItem) => {
    setEditingCI(ci);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCI(null);
  };

  const handleSubmitForm = async (data: NewConfigurationItemData, id?: number) => {
    if (!authenticatedFetch || !isAuthenticated) {
      showSnackbar('User not authenticated.', 'error');
      return;
    }
    setLoading(true); // Indicate loading for the submit operation itself
    try {
      if (id) {
        await updateConfigItem(authenticatedFetch, id, data); // Pass authenticatedFetch
        showSnackbar('Configuration Item updated successfully!', 'success');
      } else {
        await createConfigItem(authenticatedFetch, data); // Pass authenticatedFetch
        showSnackbar('Configuration Item created successfully!', 'success');
      }
      // No need to setLoading(false) here if fetchCIs will be called and manage it.
      await fetchCIs(); // fetchCIs will set loading states
      handleCloseForm();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save Configuration Item';
      showSnackbar(errorMsg, 'error');
      setError(errorMsg); // Set error for potential display
      setLoading(false); // Explicitly set loading false on error if fetchCIs isn't called or if it bails early
    }
  };

  const handleDeleteCI = (id: number) => {
    if (!authenticatedFetch || !isAuthenticated) {
      showSnackbar('User not authenticated.', 'error');
      return;
    }
    showConfirmDialog(
      'Confirm Delete',
      `Are you sure you want to delete Configuration Item ID ${id}? This action cannot be undone.`,
      async () => {
        // setLoading(true) will be handled by fetchCIs if successful, or set explicitly on error
        try {
          await deleteConfigItem(authenticatedFetch, id); // Pass authenticatedFetch
          showSnackbar('Configuration Item deleted successfully!', 'success');
          await fetchCIs(); // Refresh list, this will handle loading state
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to delete Configuration Item';
          showSnackbar(errorMsg, 'error');
          setError(errorMsg); // Set error for potential display
          // If fetchCIs might not run or might bail due to auth, ensure loading is false.
          // However, fetchCIs itself should handle its loading states.
          // If the delete failed, the list isn't changing, so setLoading(false) might be needed if fetchCIs doesn't run.
          // For simplicity, let fetchCIs manage loading, assuming delete was successful for it to be called.
          // If delete fails, we might want a setLoading(false) here.
          // Let's assume for now that if delete fails, we don't want to stop a global page loader if one was active.
          // The original code set setLoading(true) before the try block.
        }
      }
    );
  };

  const columns: GridColDef<ConfigurationItem>[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'name', headerName: 'Name', width: 250 },
    { field: 'ci_type', headerName: 'Type', width: 150 },
    { field: 'status', headerName: 'Status', width: 120 },
    {
      field: 'linked_asset_details',
      headerName: 'Linked Asset',
      width: 200,
      valueGetter: (params: { row: ConfigurationItem }) =>
        params.row.linked_asset_details
          ? `${params.row.linked_asset_details.asset_tag} - ${params.row.linked_asset_details.name}`
          : 'N/A',
    },
    { field: 'criticality', headerName: 'Criticality', width: 120 },
    { field: 'version', headerName: 'Version', width: 100 },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      cellClassName: 'actions',
      getActions: ({ row }: { row: ConfigurationItem }) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleOpenEditForm(row)}
          key={`edit-${row.id}`}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon sx={{ color: 'error.main' }} />}
          label="Delete"
          onClick={() => handleDeleteCI(row.id)}
          key={`delete-${row.id}`}
        />,
      ],
    },
  ];

  // Combined loading state, also consider authLoading for initial page load
  if ((loading && configItems.length === 0) || (authLoading && !isAuthenticated && configItems.length === 0)) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }

  // Handle not authenticated state after auth loading is complete
  if (!isAuthenticated && !authLoading) {
    return (
      <Box sx={{ p: 3, width: '100%' }}>
        <Typography variant="h5" component="h1" sx={{ mb: 2 }}>Manage Configuration Items</Typography>
        <Alert severity="info">Please log in to view configuration items.</Alert>
      </Box>
    );
  }

  // Error when fetching CIs, but user is authenticated (and not initial auth loading)
  if (error && configItems.length === 0 && isAuthenticated && !authLoading) {
    return (
         <Box sx={{ p: 3, width: '100%' }}>
            <Typography variant="h5" component="h1" sx={{ mb: 2 }}>Manage Configuration Items</Typography>
            <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
         </Box>
    );
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1">Manage Configuration Items</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateForm}>
          New CI
        </Button>
      </Box>
      {/* Display non-critical errors if CIs are present */}
      {error && configItems.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>{`Operation error: ${error}`}</Alert>}
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={configItems}
          columns={columns}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          loading={loading} // This loading state is managed by fetchCIs
        />
      </Box>
      {isFormOpen && authenticatedFetch && ( // Ensure authenticatedFetch is available before rendering form
        <ConfigurationItemForm
          open={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={handleSubmitForm}
          initialData={editingCI}
          authenticatedFetch={authenticatedFetch} // Pass authenticatedFetch
        />
      )}
    </Box>
  );
};

export default ConfigurationManagementPage;
