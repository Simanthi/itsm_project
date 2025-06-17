// itsm_frontend/src/modules/service-requests/components/ServiceRequestList.tsx
import React, { useState, useEffect } from 'react';
import {
  DataGrid,
  type GridColDef,
  type GridRowSelectionModel,
  type GridRowId,
} from '@mui/x-data-grid';
import {
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { type ServiceRequest } from '../types/ServiceRequestTypes';
import { deleteServiceRequest } from '../../../api/serviceRequestApi';
import { useAuth } from '../../../context/auth/useAuth';
import { useServiceRequests } from '../hooks/useServiceRequests';
import { useUI } from '../../../context/UIContext/useUI'; // Import useUI hook

interface DateValueFormatterParams {
  value: string | null | undefined;
}

const ServiceRequestList: React.FC = () => {
  const navigate = useNavigate();
  const { authenticatedFetch } = useAuth(); // Removed token
  const { serviceRequests, loading, error, fetchServiceRequests } =
    useServiceRequests();
  const { showSnackbar, showConfirmDialog } = useUI(); // Use UI hooks
  const [selectedRequestIds, setSelectedRequestIds] = useState<
    Array<GridRowId>
  >([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    console.log(
      'ServiceRequestList: Component rendered. serviceRequests from context:',
      serviceRequests.length,
    );
    console.log(
      'ServiceRequestList: Full serviceRequests array (passed to DataGrid):',
      serviceRequests,
    );
    serviceRequests.forEach((req) =>
      console.log(
        `  DataGrid Input Req ID: ${req.id}, Req_ID: ${req.request_id}, Status: ${req.status}, Priority: ${req.priority}, Assigned To: ${req.assigned_to_username}`,
      ),
    );
  }, [serviceRequests]);

  const handleDelete = () => {
    if (selectedRequestIds.length === 0) {
      showSnackbar('Please select requests to delete.', 'warning'); // Use Snackbar
      return;
    }
    if (!authenticatedFetch) {
      // Check for authenticatedFetch
      showSnackbar(
        'Authentication context not available. Please log in.',
        'error',
      ); // Use Snackbar
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedRequestIds.length} request(s)? This action cannot be undone.`;
    showConfirmDialog(
      'Confirm Deletion',
      confirmMessage,
      async () => {
        // onConfirm callback
        setSubmitting(true);
        try {
          const requestsToDelete = serviceRequests.filter((req) =>
            selectedRequestIds.includes(String(req.id)),
          );
          await Promise.all(
            requestsToDelete.map((req) => {
              if (req.request_id) {
                return deleteServiceRequest(authenticatedFetch, req.request_id); // Pass authenticatedFetch
              } else if (req.id) {
                return deleteServiceRequest(authenticatedFetch, String(req.id)); // Pass authenticatedFetch
              }
              return Promise.resolve(); // Should not happen if data is valid
            }),
          );
          await fetchServiceRequests();
          setSelectedRequestIds([]);
          showSnackbar('Selected requests deleted successfully!', 'success'); // Use Snackbar
        } catch (err) {
          console.error('Error deleting service requests:', err);
          showSnackbar(
            `Failed to delete requests: ${err instanceof Error ? err.message : String(err)}`,
            'error',
          ); // Use Snackbar
        } finally {
          setSubmitting(false);
        }
      },
      () => {
        // onCancel callback
        showSnackbar('Deletion cancelled.', 'info'); // Optional: show info on cancel
      },
    );
  };

  const handleCreateNew = () => {
    navigate('/service-requests/new');
  };

  const handleEdit = () => {
    if (selectedRequestIds.length === 1) {
      const selectedRequest = serviceRequests.find(
        (req) => String(req.id) === String(selectedRequestIds[0]),
      );
      if (selectedRequest) {
        navigate(`/service-requests/edit/${selectedRequest.request_id}`);
      } else {
        showSnackbar(
          'Selected request not found in current data. Please refresh.',
          'warning',
        ); // Use Snackbar
      }
    } else {
      showSnackbar('Please select exactly one request to edit.', 'warning'); // Use Snackbar
    }
  };

  const columns: GridColDef<ServiceRequest>[] = [
    { field: 'request_id', headerName: 'Request ID', width: 120 },
    { field: 'title', headerName: 'Title', width: 200 },
    { field: 'description', headerName: 'Description', flex: 1 },
    { field: 'category', headerName: 'Category', width: 150 },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'priority', headerName: 'Priority', width: 120 },
    { field: 'requested_by_username', headerName: 'Requested By', width: 150 },
    {
      field: 'assigned_to_username',
      headerName: 'Assigned To',
      width: 150,
      renderCell: (params) => {
        const assignedTo = params.value;
        return assignedTo || 'Unassigned';
      },
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 180,
      valueFormatter: (params: DateValueFormatterParams) =>
        params.value ? new Date(params.value).toLocaleString() : '',
    },
    {
      field: 'updated_at',
      headerName: 'Last Updated',
      width: 180,
      valueFormatter: (params: DateValueFormatterParams) =>
        params.value ? new Date(params.value).toLocaleString() : '',
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">Error loading service requests: {error}</Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Service Requests
      </Typography>
      <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
        <Button variant="contained" color="primary" onClick={handleCreateNew}>
          Create New Request
        </Button>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleEdit}
          disabled={selectedRequestIds.length !== 1}
        >
          Edit Selected
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDelete}
          disabled={selectedRequestIds.length === 0 || submitting}
        >
          Delete Selected ({selectedRequestIds.length})
        </Button>
        <Button
          variant="outlined"
          onClick={fetchServiceRequests}
          disabled={submitting}
        >
          Refresh
        </Button>
      </Box>
      <div style={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={serviceRequests}
          columns={columns}
          getRowId={(row) => row.id!}
          checkboxSelection
          onRowSelectionModelChange={(
            newSelectionModel: GridRowSelectionModel,
          ) => {
            if (Array.isArray(newSelectionModel)) {
              setSelectedRequestIds(newSelectionModel);
            } else if (
              'ids' in newSelectionModel &&
              newSelectionModel.ids instanceof Set
            ) {
              setSelectedRequestIds(Array.from(newSelectionModel.ids));
            } else {
              console.warn(
                'Unexpected newSelectionModel type for DataGrid:',
                newSelectionModel,
              );
              setSelectedRequestIds([]);
            }
          }}
          rowSelectionModel={{
            type: 'include',
            ids: new Set(selectedRequestIds),
          }}
          disableRowSelectionOnClick
          loading={loading || submitting}
          key={serviceRequests.length} // Force re-render of DataGrid when serviceRequests change
        />
      </div>
    </Box>
  );
};

export default ServiceRequestList;
