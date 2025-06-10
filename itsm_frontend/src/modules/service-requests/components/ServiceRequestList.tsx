// itsm_frontend/src/modules/service-requests/components/ServiceRequestList.tsx
import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { DataGrid, type GridColDef, type GridRowSelectionModel, type GridRowId } from '@mui/x-data-grid';
import { Button, Box, Typography, CircularProgress, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { type ServiceRequest } from '../types/ServiceRequestTypes';
import { getServiceRequests, deleteServiceRequest } from '../../../api/serviceRequestApi';
import { useAuth } from '../../../../src/context/auth/AuthContext'; // FIX 1: Corrected useAuth import

// FIX 2: Define a local interface for valueFormatter params to resolve 'never' type
interface DateValueFormatterParams {
  value: string | null | undefined;
}

const ServiceRequestList: React.FC = () => {
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequestIds, setSelectedRequestIds] = useState<Array<GridRowId>>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();
  const { token } = useAuth();

  // FIX 5: Wrap fetchServiceRequests in useCallback to resolve ESLint warning
  const fetchServiceRequests = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getServiceRequests(token);
      setServiceRequests(data);
    } catch (err) {
      console.error("Error fetching service requests:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [token]); // token is a dependency for fetchServiceRequests

  useEffect(() => {
    if (token) {
      fetchServiceRequests();
    } else {
      setLoading(false);
      setError("Please log in to view service requests.");
    }
  }, [token, fetchServiceRequests]); // Added fetchServiceRequests to dependency array

  const handleDelete = async () => {
    if (selectedRequestIds.length === 0) {
      alert('Please select requests to delete.');
      return;
    }
    if (!token) {
      alert("Authentication token not found. Please log in.");
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedRequestIds.length} request(s)?`)) {
      setSubmitting(true);
      try {
        await Promise.all(selectedRequestIds.map(id => deleteServiceRequest(Number(id), token)));
        fetchServiceRequests();
        setSelectedRequestIds([]);
        alert('Selected requests deleted successfully!');
      } catch (err) {
        console.error("Error deleting service requests:", err);
        setError(err instanceof Error ? err.message : String(err));
        alert(`Failed to delete requests: ${err}`);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleCreateNew = () => {
    navigate('/service-requests/new');
  };

  const handleEdit = () => {
    if (selectedRequestIds.length === 1) {
      const requestIdToEdit = selectedRequestIds[0];
      navigate(`/service-requests/edit/${requestIdToEdit}`);
    } else {
      alert('Please select exactly one request to edit.');
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
    { field: 'assigned_to_username', headerName: 'Assigned To', width: 150 },
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 180,
      valueFormatter: (params: DateValueFormatterParams) => params.value ? new Date(params.value).toLocaleString() : ''
    },
    {
      field: 'updated_at',
      headerName: 'Last Updated',
      width: 180,
      valueFormatter: (params: DateValueFormatterParams) => params.value ? new Date(params.value).toLocaleString() : ''
    },
  ];

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">Error loading service requests: {error}</Alert>;
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
        <Button variant="contained" color="secondary" onClick={handleEdit} disabled={selectedRequestIds.length !== 1}>
          Edit Selected
        </Button>
        <Button variant="contained" color="error" onClick={handleDelete} disabled={selectedRequestIds.length === 0 || submitting}>
          Delete Selected ({selectedRequestIds.length})
        </Button>
        <Button variant="outlined" onClick={fetchServiceRequests} disabled={submitting}>
          Refresh
        </Button>
      </Box>
      <div style={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={serviceRequests}
          columns={columns}
          getRowId={(row) => row.id!}
          checkboxSelection
          onRowSelectionModelChange={(newSelectionModel: GridRowSelectionModel) => {
            // FIX 3: Safely extract 'ids' (which is a Set) from the newSelectionModel object
            // and convert it to an Array for the state.
            const model = newSelectionModel as { ids: Set<GridRowId> } | GridRowId[];
            if (Array.isArray(model)) {
                setSelectedRequestIds(model); // If it's directly an array (older versions)
            } else if (model.ids instanceof Set) {
                setSelectedRequestIds(Array.from(model.ids)); // If it's the object with a Set (newer versions)
            } else {
                // Fallback for unexpected types, log or handle error
                console.warn("Unexpected newSelectionModel type:", newSelectionModel);
                setSelectedRequestIds([]);
            }
          }}
          // FIX 4: Pass the selectedRequestIds wrapped in the expected object format for rowSelectionModel
          // The type is 'include' or 'exclude' for the 'type' property based on MUI X v6/v7 types.
          // The 'ids' property expects a Set<GridRowId> in some newer versions.
          rowSelectionModel={{ type: 'include', ids: new Set(selectedRequestIds) }}
          disableRowSelectionOnClick
          loading={loading || submitting}
        />
      </div>
    </Box>
  );
};

export default ServiceRequestList;