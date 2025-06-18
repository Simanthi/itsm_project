import React, { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress, Alert } from '@mui/material';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { ChangeRequest, NewChangeRequestData } from '../types';
import { getChangeRequests, deleteChangeRequest, createChangeRequest, updateChangeRequest } from '../api';
import { useUI } from '../../../context/UIContext/useUI';
import ChangeRequestForm from '../components/ChangeRequestForm';
// import { useAuth } from '../../../context/auth/useAuth'; // Not strictly needed if apiClient handles auth

const ChangeManagementPage: React.FC = () => {
  const { showSnackbar, showConfirmDialog } = useUI();
  // const { authenticatedFetch } = useAuth(); // Use if your api functions need it explicitly

  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCR, setEditingCR] = useState<ChangeRequest | null>(null);

  const fetchCRs = useCallback(async () => {
    setLoading(true);
    try {
      const items = await getChangeRequests();
      setChangeRequests(items);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch change requests';
      setError(errorMsg);
      showSnackbar(errorMsg, 'error');
      setChangeRequests([]);
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchCRs();
  }, [fetchCRs]);

  const handleOpenCreateForm = () => {
    setEditingCR(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (cr: ChangeRequest) => {
    setEditingCR(cr);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCR(null);
  };

  const handleSubmitForm = async (data: NewChangeRequestData, id?: number) => {
    // No need to setLoading(true) here, individual actions will set their own loading if needed
    // or rely on the DataGrid's loading prop during refresh.
    try {
      if (id) {
        await updateChangeRequest(id, data);
        showSnackbar('Change Request updated successfully!', 'success');
      } else {
        await createChangeRequest(data);
        showSnackbar('Change Request created successfully!', 'success');
      }
      await fetchCRs(); // Refresh list
      handleCloseForm();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save Change Request';
      showSnackbar(errorMsg, 'error');
      // setError(errorMsg); // Optionally set page-level error
    }
  };

  const handleDeleteCR = (id: number) => {
    showConfirmDialog(
      'Confirm Delete',
      `Are you sure you want to delete Change Request ID ${id}? This action cannot be undone.`,
      async () => {
        try {
          await deleteChangeRequest(id);
          showSnackbar('Change Request deleted successfully!', 'success');
          await fetchCRs(); // Refresh list
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to delete Change Request';
          showSnackbar(errorMsg, 'error');
        }
      }
    );
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const columns: GridColDef<ChangeRequest>[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'title', headerName: 'Title', width: 250 },
    { field: 'change_type', headerName: 'Type', width: 120 },
    { field: 'status', headerName: 'Status', width: 150 },
    { field: 'impact', headerName: 'Impact', width: 100 },
    { field: 'assigned_to_username', headerName: 'Assigned To', width: 150, valueGetter: (value) => value || 'Unassigned' },
    { field: 'planned_start_date', headerName: 'Planned Start', width: 180, valueFormatter: (value) => formatDate(value) },
    { field: 'planned_end_date', headerName: 'Planned End', width: 180, valueFormatter: (value) => formatDate(value) },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      cellClassName: 'actions',
      getActions: ({ row }) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleOpenEditForm(row)}
          key={`edit-${row.id}`}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => handleDeleteCR(row.id)}
          key={`delete-${row.id}`}
          sx={{ color: 'error.main' }}
        />,
      ],
    },
  ];

  if (loading && changeRequests.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }
  if (error && changeRequests.length === 0) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1">Manage Change Requests</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateForm}>
          New Change Request
        </Button>
      </Box>
      {error && changeRequests.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>{`Last operation error: ${error}`}</Alert>}
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={changeRequests}
          columns={columns}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          loading={loading}
        />
      </Box>
      <ChangeRequestForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmitForm}
        initialData={editingCR}
      />
    </Box>
  );
};

export default ChangeManagementPage;
