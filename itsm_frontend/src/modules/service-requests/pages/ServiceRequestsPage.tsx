// itsm_frontend/src/modules/service-requests/components/ServiceRequestsPage.tsx
import React, { useState } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Print as PrintIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  DataGrid,
  type GridColDef,
  type GridRowId,
  type GridRowSelectionModel, // Re-import GridRowSelectionModel
  // Removed GridCallbackDetails as it's not needed if _details is removed
} from '@mui/x-data-grid';
import { useServiceRequests } from '../hooks/useServiceRequests';
import { type ServiceRequest } from '../types/ServiceRequestTypes';

// Define a local type for valueFormatter params, as GridValueFormatterParams might not be exported
interface CustomGridValueFormatterParams<R, V> {
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
  const { serviceRequests, loading, error } = useServiceRequests();
  // State to store selected row IDs as an array of GridRowId
  const [selectedRequestIds, setSelectedRequestIds] = useState<GridRowId[]>([]);

  const handleCreateNew = () => {
    navigate('/service-requests/new');
  };

  const handleEdit = () => {
    if (selectedRequestIds.length === 1) {
      navigate(`/service-requests/edit/${selectedRequestIds[0]}`);
    } else {
      alert('Please select exactly one request to edit.');
    }
  };

  const handlePrintPreview = () => {
    alert('Print Preview functionality is not yet implemented.');
  };

  const handlePrint = () => {
    alert('Print functionality is not yet implemented.');
  };

  // Define columns for DataGrid
  const columns: GridColDef<ServiceRequest>[] = [
    { field: 'request_id', headerName: 'Request ID', width: 150 },
    { field: 'title', headerName: 'Title', width: 250 },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 200 },
    { field: 'category', headerName: 'Category', width: 150 },
    { field: 'status', headerName: 'Status', width: 120 },
    { field: 'priority', headerName: 'Priority', width: 120 },
    { field: 'requested_by_username', headerName: 'Requested By', width: 150 },
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 150,
      valueFormatter: (params: CustomGridValueFormatterParams<ServiceRequest, string | null | undefined>) => formatDate(params.value),
    },
    { field: 'assigned_to_username', headerName: 'Assigned To', width: 150,
      valueFormatter: (params: CustomGridValueFormatterParams<ServiceRequest, string | null | undefined>) => params.value || 'Unassigned',
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          Service Requests
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
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
            disabled={selectedRequestIds.length !== 1}
          >
            Edit Request
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrintPreview}
            disabled={selectedRequestIds.length === 0}
          >
            Print Preview
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            disabled={selectedRequestIds.length === 0}
          >
            Print Request
          </Button>
        </Box>
      </Box>

      <Box sx={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={serviceRequests}
          columns={columns}
          getRowId={(row) => row.id!}
          checkboxSelection
          // FIX: Updated onRowSelectionModelChange to match expected type and remove unused '_details'
          onRowSelectionModelChange={(newSelectionModel: GridRowSelectionModel) => {
            // newSelectionModel is an object with 'ids' (a Set of GridRowId)
            setSelectedRequestIds(Array.from(newSelectionModel.ids));
          }}
          // FIX: Changed 'type' to 'include' to match GridRowSelectionModel's allowed values
          rowSelectionModel={{ type: 'include', ids: new Set(selectedRequestIds) }}
          disableRowSelectionOnClick
          loading={loading}
        />
      </Box>
    </Box>
  );
};

export default ServiceRequestsPage;
