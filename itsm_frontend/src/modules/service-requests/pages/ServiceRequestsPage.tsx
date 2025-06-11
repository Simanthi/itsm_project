// itsm_frontend/src/modules/service-requests/pages/ServiceRequestsPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box, CircularProgress, Alert, Button, Typography
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Print as PrintIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  DataGrid,
  type GridColDef,
  type GridRowId,
  type GridRowSelectionModel, // Keep this import for the prop type
  type GridCallbackDetails,
} from '@mui/x-data-grid';
import { useServiceRequests } from '../hooks/useServiceRequests';
import { type ServiceRequest } from '../types/ServiceRequestTypes';

// Define a local type for valueFormatter params.
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
  // FIX: Manage selectedRequestIds as a GridRowSelectionModel object
  // Initialize with an empty Set for ids and type 'include'
  const [selectedRowModel, setSelectedRowModel] = useState<GridRowSelectionModel>({
    type: 'include',
    ids: new Set<GridRowId>(),
  });

  // Effect to inspect serviceRequests when it changes
  useEffect(() => {
    console.log("ServiceRequestsPage: Component rendered.");
    console.log("ServiceRequestsPage: serviceRequests received from context (length):", serviceRequests.length);
    serviceRequests.forEach(req => console.log(`  ServiceRequestsPage Input Req ID: ${req.id}, Req_ID: ${req.request_id}, Status: ${req.status}, Priority: ${req.priority}, Assigned To: ${req.assigned_to_username}`));
  }, [serviceRequests]);


  const handleCreateNew = () => {
    navigate('/service-requests/new');
  };

  const handleEdit = () => {
    // FIX: Access selected IDs from the selectedRowModel state
    const currentSelectedIds = Array.from(selectedRowModel.ids);
    if (currentSelectedIds.length === 1) {
      navigate(`/service-requests/edit/${currentSelectedIds[0]}`);
    } else {
      alert('Please select exactly one request to edit.');
    }
  };

  const handlePrintPreview = () => {
    // FIX: Access selected IDs from the selectedRowModel state
    const currentSelectedIds = Array.from(selectedRowModel.ids);
    if (currentSelectedIds.length > 0) {
      navigate('/service-requests/print-preview', { state: { selectedIds: currentSelectedIds, autoPrint: false } });
    } else {
      alert('Please select at least one request to preview.');
    }
  };

  const handlePrint = () => {
    // FIX: Access selected IDs from the selectedRowModel state
    const currentSelectedIds = Array.from(selectedRowModel.ids);
    if (currentSelectedIds.length > 0) {
      navigate('/service-requests/print-preview', { state: { selectedIds: currentSelectedIds, autoPrint: true } });
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
      field: 'assigned_to_username',
      headerName: 'Assigned To',
      width: 150,
      renderCell: (params) => {
        const assignedTo = params.value;
        // Log the exact value the DataGrid render cell receives
        console.log(`  DataGrid Render Cell for ID: ${params.row.id}, Assigned To value: '${assignedTo}'`);
        return assignedTo || 'Unassigned';
      },
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 150,
      valueFormatter: (params: CustomGridValueFormatterParams<ServiceRequest, string | null | undefined> | undefined) => {
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
      valueFormatter: (params: CustomGridValueFormatterParams<ServiceRequest, string | null | undefined> | undefined) => {
        if (!params || params.value === undefined || params.value === null) {
          return 'N/A';
        }
        return formatDate(params.value);
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
            // FIX: Check length of IDs within the selectedRowModel
            disabled={Array.from(selectedRowModel.ids).length !== 1}
          >
            Edit Request
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrintPreview}
            // FIX: Check length of IDs within the selectedRowModel
            disabled={Array.from(selectedRowModel.ids).length === 0}
          >
            Print Preview
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            // FIX: Check length of IDs within the selectedRowModel
            disabled={Array.from(selectedRowModel.ids).length === 0}
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
          // FIX: Correctly handle GridRowSelectionModel from the callback
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          onRowSelectionModelChange={(newSelectionModel: GridRowSelectionModel, _details: GridCallbackDetails) => {
            // newSelectionModel itself is the GridRowSelectionModel object
            setSelectedRowModel(newSelectionModel); 
          }}
          // FIX: Pass selectedRowModel directly to rowSelectionModel
          rowSelectionModel={selectedRowModel} 
          disableRowSelectionOnClick
          loading={loading}
        />
      </Box>
    </Box>
  );
};

export default ServiceRequestsPage;