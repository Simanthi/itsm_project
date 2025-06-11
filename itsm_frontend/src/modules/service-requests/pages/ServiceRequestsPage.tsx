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
  type GridRowSelectionModel,
} from '@mui/x-data-grid';
import { useServiceRequests } from '../hooks/useServiceRequests';
import { type ServiceRequest } from '../types/ServiceRequestTypes';

// Define a local type for valueFormatter params.
// Make 'params' itself optional for extreme defensive coding if DataGrid
// might rarely pass 'undefined' for the entire params object.
interface CustomGridValueFormatterParams<R = ServiceRequest, V = string | null | undefined> {
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
    if (selectedRequestIds.length > 0) {
      navigate('/service-requests/print-preview', { state: { selectedIds: selectedRequestIds, autoPrint: false } });
    } else {
      alert('Please select at least one request to preview.');
    }
  };

  const handlePrint = () => {
    if (selectedRequestIds.length > 0) {
      navigate('/service-requests/print-preview', { state: { selectedIds: selectedRequestIds, autoPrint: true } });
    } else {
      alert('Please select at least one request to print.');
    }
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
      // FIX: Add a null/undefined check for 'params' itself before accessing 'params.value'
      valueFormatter: (params: CustomGridValueFormatterParams<ServiceRequest, string | null | undefined> | undefined) => {
        // Log to inspect the 'params' object when this formatter is called
        // console.log(`valueFormatter for created_at: params =`, params); // Enable for debugging if issues persist

        if (!params || params.value === undefined || params.value === null) {
          return 'N/A';
        }
        return formatDate(params.value);
      },
    },
    { field: 'assigned_to_username', headerName: 'Assigned To', width: 150,
      // FIX: Add a null/undefined check for 'params' itself before accessing 'params.value'
      valueFormatter: (params: CustomGridValueFormatterParams<ServiceRequest, string | null | undefined> | undefined) => {
        // Log to inspect the 'params' object when this formatter is called
        // console.log(`valueFormatter for assigned_to_username: params =`, params); // Enable for debugging if issues persist

        if (!params || params.value === undefined || params.value === null) {
          return 'Unassigned';
        }
        return params.value || 'Unassigned';
      },
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
          getRowId={(row) => String(row.id)}
          checkboxSelection
          onRowSelectionModelChange={(newSelectionModel: GridRowSelectionModel) => {
            setSelectedRequestIds(Array.from(newSelectionModel.ids));
          }}
          rowSelectionModel={{ type: 'include', ids: new Set(selectedRequestIds) }}
          disableRowSelectionOnClick
          loading={loading}
        />
      </Box>
    </Box>
  );
};

export default ServiceRequestsPage;