import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress, Alert } from '@mui/material';
import { DataGrid, type GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { type ConfigurationItem, type NewConfigurationItemData } from '../types';
import { getConfigItems, deleteConfigItem, createConfigItem, updateConfigItem } from '../api';
import { useUI } from '../../../context/UIContext/useUI';
import ConfigurationItemForm from '../components/ConfigurationItemForm';

const ConfigurationManagementPage: React.FC = () => {
  const { showSnackbar, showConfirmDialog } = useUI();

  const [configItems, setConfigItems] = useState<ConfigurationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCI, setEditingCI] = useState<ConfigurationItem | null>(null);

  const fetchCIs = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getConfigItems();
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
  }, [showSnackbar]);

  useEffect(() => {
    fetchCIs();
  }, [fetchCIs]);

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
    setLoading(true);
    try {
      if (id) {
        await updateConfigItem(id, data);
        showSnackbar('Configuration Item updated successfully!', 'success');
      } else {
        await createConfigItem(data);
        showSnackbar('Configuration Item created successfully!', 'success');
      }
      await fetchCIs();
      handleCloseForm();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save Configuration Item';
      showSnackbar(errorMsg, 'error');
      setError(errorMsg);
    }
  };

  const handleDeleteCI = (id: number) => {
    showConfirmDialog(
      'Confirm Delete',
      `Are you sure you want to delete Configuration Item ID ${id}? This action cannot be undone.`,
      async () => {
        setLoading(true);
        try {
          await deleteConfigItem(id);
          showSnackbar('Configuration Item deleted successfully!', 'success');
          await fetchCIs();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to delete Configuration Item';
          showSnackbar(errorMsg, 'error');
          setError(errorMsg);
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

  if (loading && configItems.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }
  if (error && configItems.length === 0) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1">Manage Configuration Items</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateForm}>
          New CI
        </Button>
      </Box>
      {error && configItems.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>{`Last operation error: ${error}`}</Alert>}
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={configItems}
          columns={columns}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          loading={loading}
        />
      </Box>
      <ConfigurationItemForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmitForm}
        initialData={editingCI}
      />
    </Box>
  );
};

export default ConfigurationManagementPage;
