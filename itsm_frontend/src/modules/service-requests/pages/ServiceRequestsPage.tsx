// itsm_frontend/src/modules/service-requests/pages/ServiceRequestsPage.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Delete as DeleteIcon, // Import DeleteIcon
  Visibility as ViewIcon, // Import ViewIcon for the view action
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  DataGrid,
  type GridColDef,
  type GridRowId,
  type GridRowSelectionModel,
  type GridPaginationModel,
  GridActionsCellItem,
} from '@mui/x-data-grid';
import { useServiceRequests } from '../hooks/useServiceRequests';
import { type ServiceRequest } from '../types/ServiceRequestTypes';
import { useUI } from '../../../context/UIContext/useUI'; // Import useUI hook

// Define a local type for valueFormatter params.
interface CustomGridValueFormatterParams<
  R = ServiceRequest,
  V = string | null | undefined,
> {
  value: V;
  id: GridRowId;
  field: string;
  row: R;
}

// Helper function to format date strings robustly
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) {
    return 'N/A';
  }
  const date = new Date(String(dateString));
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  return date.toLocaleDateString();
};

const ServiceRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    serviceRequests,
    loading,
    error,
    deleteServiceRequest, // Import deleteServiceRequest
    // fetchServiceRequests, // Removed as it's unused directly in this component
    totalCount,
    paginationModel,
    setPaginationModel,
  } = useServiceRequests();
  const { showSnackbar, showConfirmDialog } = useUI(); // Use showSnackbar and showConfirmDialog from UI context
  const [selectedRowModel, setSelectedRowModel] =
    useState<GridRowSelectionModel>({
      type: 'include',
      ids: new Set<GridRowId>(),
    });

  // --- Action Handlers for DataGrid Rows ---
  const handleViewRow = (id: GridRowId) => {
    // Assuming id is the human-readable request_id from the row
    const selectedRequest = serviceRequests.find((req) => req.request_id === id);
    if (selectedRequest) {
      navigate(`/service-requests/view/${selectedRequest.request_id}`);
    } else {
      showSnackbar('Request not found.', 'error');
    }
  };

  const handleEditRow = (id: GridRowId) => {
    // Assuming id is the human-readable request_id from the row
    const selectedRequest = serviceRequests.find((req) => req.request_id === id);
    if (selectedRequest) {
      navigate(`/service-requests/edit/${selectedRequest.request_id}`);
    } else {
      showSnackbar('Request not found.', 'error');
    }
  };

  const handleDeleteRow = (id: GridRowId) => {
    const requestToDelete = serviceRequests.find((req) => req.request_id === id);
    if (!requestToDelete) {
      showSnackbar('Request not found for deletion.', 'error');
      return;
    }

    const confirmMessage = `Are you sure you want to delete service request ${requestToDelete.request_id}? This action cannot be undone.`;
    showConfirmDialog(
      'Confirm Deletion',
      confirmMessage,
      async () => {
        try {
          await deleteServiceRequest(requestToDelete.request_id); // Uses the string request_id
          showSnackbar(
            `Service request ${requestToDelete.request_id} deleted successfully.`,
            'success',
          );
          // Data refresh is handled by useServiceRequests hook
        } catch (err) {
          console.error('Error deleting service request:', err);
          showSnackbar(
            `Failed to delete request: ${err instanceof Error ? err.message : String(err)}`,
            'error',
          );
        }
      },
      () => {
        showSnackbar('Deletion cancelled.', 'info');
      },
    );
  };
  // --- End Action Handlers ---

  useEffect(() => {
    console.log('ServiceRequestsPage: Component rendered.');
    console.log(
      'ServiceRequestsPage: serviceRequests received from context (length):',
      serviceRequests.length,
    );
    serviceRequests.forEach((req) =>
      console.log(
        `  ServiceRequestsPage Input Req ID: ${req.id}, Req_ID: ${req.request_id}, Status: ${req.status}, Priority: ${req.priority}, Assigned To: ${req.assigned_to_username}`,
      ),
    );
  }, [serviceRequests]);

  const handleCreateNew = () => {
    navigate('/service-requests/new');
  };

  const handleEdit = () => {
    const currentSelectedIds = Array.from(selectedRowModel.ids);
    if (currentSelectedIds.length === 1) {
      // Find the selected service request object to get its 'request_id'
      const selectedRequest = serviceRequests.find(
        (req) => String(req.id) === String(currentSelectedIds[0]),
      );
      if (selectedRequest) {
        // Navigate using the human-readable request_id, as expected by backend API
        navigate(`/service-requests/edit/${selectedRequest.request_id}`);
      } else {
        // This alert should ideally not be hit if DataGrid rows are from serviceRequests
        showSnackbar(
          'Selected request not found in current data set. Please refresh.',
          'warning',
        ); // Use Snackbar
      }
    } else {
      showSnackbar('Please select exactly one request to edit.', 'warning'); // Use Snackbar
    }
  };

  const handlePrintPreview = () => {
    const currentSelectedIds = Array.from(selectedRowModel.ids);
    if (currentSelectedIds.length > 0) {
      // Map numeric internal IDs to human-readable request_ids for print preview
      const selectedRequestIds = serviceRequests
        .filter((req) => currentSelectedIds.includes(String(req.id)))
        .map((req) => req.request_id);

      if (selectedRequestIds.length > 0) {
        navigate('/service-requests/print-preview', {
          state: { selectedRequestIds: selectedRequestIds, autoPrint: false },
        });
      } else {
        showSnackbar('No valid requests selected for preview.', 'warning'); // Use Snackbar
      }
    } else {
      showSnackbar('Please select at least one request to preview.', 'warning'); // Use Snackbar
    }
  };

  const handlePrint = () => {
    const currentSelectedIds = Array.from(selectedRowModel.ids);
    if (currentSelectedIds.length > 0) {
      // Map numeric internal IDs to human-readable request_ids for printing
      const selectedRequestIds = serviceRequests
        .filter((req) => currentSelectedIds.includes(String(req.id)))
        .map((req) => req.request_id);

      if (selectedRequestIds.length > 0) {
        navigate('/service-requests/print-preview', {
          state: { selectedRequestIds: selectedRequestIds, autoPrint: true },
        });
      } else {
        showSnackbar('No valid requests selected for print.', 'warning'); // Use Snackbar
      }
    } else {
      showSnackbar('Please select at least one request to print.', 'warning'); // Use Snackbar
    }
  };

  const handleDelete = () => {
    const selectedIds = Array.from(selectedRowModel.ids);
    if (selectedIds.length === 0) {
      showSnackbar('Please select requests to delete.', 'warning');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedIds.length} service request(s)? This action cannot be undone.`;
    showConfirmDialog(
      'Confirm Deletion',
      confirmMessage,
      async () => {
        // onConfirm callback
        // The deleteServiceRequest from context now handles multiple deletions and notifications
        const requestsToDelete = serviceRequests
          .filter((req) => selectedIds.includes(String(req.id)))
          .map((req) => req.request_id); // Get the string request_id

        if (requestsToDelete.length === 0) {
          showSnackbar(
            'No valid requests found for deletion. Please refresh.',
            'warning',
          );
          return;
        }

        try {
          // Assuming deleteServiceRequest can handle an array of IDs or is called in a loop
          // For simplicity, let's assume it handles one ID and we loop.
          // The context's deleteServiceRequest likely handles single ID and refreshes.
          // If it handles multiple, adjust accordingly.
          // For now, we'll show a single success/failure message after all attempts.
          // let allSucceeded = true; // Removed as it's unused
          for (const requestId of requestsToDelete) {
            if (requestId) {
              // Ensure requestId is not undefined
              await deleteServiceRequest(requestId); // This will call fetchServiceRequests internally
            }
          }
          // The context's deleteServiceRequest should ideally handle success/error messages
          // and call fetchServiceRequests. If not, uncomment and adjust:
          // await fetchServiceRequests(); // Refresh data
          setSelectedRowModel({ type: 'include', ids: new Set() }); // Clear selection
          showSnackbar(
            'Selected service requests processed for deletion.',
            'success',
          );
        } catch (err) {
          console.error('Error deleting service requests:', err);
          showSnackbar(
            `Failed to delete some requests: ${err instanceof Error ? err.message : String(err)}`,
            'error',
          );
        }
      },
      () => {
        // onCancel callback
        showSnackbar('Deletion cancelled.', 'info');
      },
    );
  };

  const columns: GridColDef<ServiceRequest>[] = [
    { field: 'request_id', headerName: 'Request ID', width: 150 },
    { field: 'title', headerName: 'Title', width: 250 },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 200 },
    { field: 'category', headerName: 'Category', width: 150 },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => {
        const status = params.value as ServiceRequest['status'];
        let color = 'default';
        switch (status) {
          case 'new':
            color = 'primary';
            break;
          case 'in_progress':
            color = 'warning';
            break;
          case 'resolved':
            color = 'success';
            break;
          case 'closed':
            color = 'info';
            break;
          case 'cancelled':
            color = 'error';
            break;
          default:
            color = 'default';
        }
        return (
          <Box
            component="span"
            sx={{
              color: `${color}.main`,
              bgcolor: `${color}.lightest`, // Assuming you have theme variations like 'lightest' or use alpha
              px: 1,
              py: 0.5,
              borderRadius: '4px',
              fontWeight: 'medium',
              border: `1px solid ${color}.main`,
            }}
          >
            {status
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase())}
          </Box>
        );
      },
    },
    { field: 'priority', headerName: 'Priority', width: 120 },
    { field: 'requested_by_username', headerName: 'Requested By', width: 150 },
    {
      field: 'assigned_to_username',
      headerName: 'Assigned To',
      width: 150,
      renderCell: (params) => {
        const assignedTo = params.value;
        // Display 'Unassigned' if null or empty string
        return assignedTo || 'Unassigned';
      },
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 150,
      valueFormatter: (
        params:
          | CustomGridValueFormatterParams<
              ServiceRequest,
              string | null | undefined
            >
          | undefined,
      ) => {
        if (!params || params.value === undefined || params.value === null) {
          return 'N/A';
        }
        return formatDate(params.value);
      },
    },
    {
      field: 'updated_at',
      headerName: 'Last Updated',
      width: 150,
      valueFormatter: (
        params:
          | CustomGridValueFormatterParams<
              ServiceRequest,
              string | null | undefined
            >
          | undefined,
      ) => {
        if (!params || params.value === undefined || params.value === null) {
          return 'N/A';
        }
        return formatDate(params.value);
      },
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      cellClassName: 'actions',
      getActions: ({ row }: { row: ServiceRequest }) => {
        // Use row.request_id for actions, as this is the identifier used in navigation/API calls
        // The DataGrid's internal `id` is still row.id (numeric), but actions should use the human-readable ID.
        return [
          <GridActionsCellItem
            key={`view-${row.request_id}`}
            icon={<ViewIcon />}
            label="View"
            onClick={() => handleViewRow(row.request_id)}
            color="primary"
          />,
          <GridActionsCellItem
            key={`edit-${row.request_id}`}
            icon={<EditIcon />}
            label="Edit"
            onClick={() => handleEditRow(row.request_id)}
            color="inherit"
          />,
          <GridActionsCellItem
            key={`delete-${row.request_id}`}
            icon={<DeleteIcon />}
            label="Delete"
            onClick={() => handleDeleteRow(row.request_id)}
            color="error" // Reverted to this to check original error type
          />,
        ];
      },
    },
  ];

  if (loading) {
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
        <Typography sx={{ ml: 2 }}>Loading service requests...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load service requests: {error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      {/* Add flexWrap: 'wrap' to allow buttons to wrap on smaller screens */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          flexWrap: 'wrap',
          gap: { xs: 1, sm: 2 },
        }}
      >
        <Typography
          variant="h5"
          component="h1"
          sx={{ minWidth: 0, mb: { xs: 1, sm: 0 }, flexShrink: 1 }}
        >
          Service Requests
        </Typography>
        {/* Add flexWrap: 'wrap' to the button container as well */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
          >
            Create New Request
          </Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            disabled={Array.from(selectedRowModel.ids).length !== 1}
          >
            Edit Request
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrintPreview}
            disabled={Array.from(selectedRowModel.ids).length === 0}
          >
            Print Preview
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            disabled={Array.from(selectedRowModel.ids).length === 0}
          >
            Print Request
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
            disabled={Array.from(selectedRowModel.ids).length === 0}
          >
            Delete Request(s)
          </Button>
        </Box>
      </Box>

      <Box sx={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={serviceRequests}
          columns={columns}
          getRowId={(row) => String(row.id)} // Ensure DataGrid uses the numeric `id` as string
          checkboxSelection
          onRowSelectionModelChange={(
            newSelectionModel: GridRowSelectionModel,
          ) => {
            setSelectedRowModel(newSelectionModel);
          }}
          rowSelectionModel={selectedRowModel}
          disableRowSelectionOnClick
          loading={loading}
          paginationMode="server"
          rowCount={totalCount}
          paginationModel={paginationModel}
          onPaginationModelChange={(model: GridPaginationModel) => {
            setPaginationModel(model);
          }}
          pageSizeOptions={[5, 10, 25, 50, 100]}
        />
      </Box>
    </Box>
  );
};

export default ServiceRequestsPage;
