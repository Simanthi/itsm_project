// itsm_frontend/src/modules/service-requests/components/ServiceRequestPrintView.tsx
import { useEffect, useState } from 'react'; // Removed direct 'React' import if unused
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Grid, CircularProgress, Button } from '@mui/material';
import { type ServiceRequest } from '../types/ServiceRequestTypes';
import { getServiceRequestById } from '../../../api/serviceRequestApi';
import { useAuth } from '../../../context/auth/useAuth';
import { type GridRowId } from '@mui/x-data-grid'; // FIX: Import GridRowId

// Helper function to format date strings (re-used from ServiceRequestsPage)
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

function ServiceRequestPrintView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [serviceRequestsToPrint, setServiceRequestsToPrint] = useState<ServiceRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Extract selectedIds and autoPrint from location state
  const { selectedIds, autoPrint } = (location.state as { selectedIds: GridRowId[]; autoPrint?: boolean }) || { selectedIds: [], autoPrint: false };

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setError("Authentication required to view print preview.");
      setLoading(false);
      return;
    }
    if (!selectedIds || selectedIds.length === 0) {
      setError("No service requests selected for printing.");
      setLoading(false);
      return;
    }

    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedRequests: ServiceRequest[] = [];
        for (const id of selectedIds) {
          try {
            const request = await getServiceRequestById(String(id), token);
            fetchedRequests.push(request);
          } catch (itemError) {
            console.error(`Error fetching service request ${id}:`, itemError);
          }
        }

        if (fetchedRequests.length > 0) {
          setServiceRequestsToPrint(fetchedRequests);
        } else {
          setError("No service requests found for printing or failed to load all selected requests.");
        }
      } catch (err) {
        setError("Failed to load service request details.");
        console.error("General error in fetchRequests:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [selectedIds, token, isAuthenticated]);

  useEffect(() => {
    if (!loading && !error && autoPrint && serviceRequestsToPrint.length > 0) {
      const printTimeout = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(printTimeout);
    }
  }, [loading, error, autoPrint, serviceRequestsToPrint]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
        <Button variant="contained" onClick={() => navigate('/service-requests')} sx={{ mt: 2 }}>Go to Service Requests</Button>
      </Box>
    );
  }

  if (!serviceRequestsToPrint.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No service requests found for printing.</Typography>
        <Button variant="contained" onClick={() => navigate('/service-requests')} sx={{ mt: 2 }}>Go to Service Requests</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button variant="outlined" onClick={() => navigate('/service-requests')}>
          Back to Service Requests
        </Button>
        <Button variant="contained" onClick={() => window.print()}>Print Now</Button>
      </Box>
      {serviceRequestsToPrint.map((request) => (
        <Paper key={request.id} sx={{ p: 3, mb: 4, border: '1px solid #eee' }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            Service Request: {request.title} (ID: {request.request_id || request.id})
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1"><strong>Requested By:</strong> {request.requested_by_username}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1"><strong>Requested Date:</strong> {formatDate(request.created_at)}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body1"><strong>Category:</strong> {request.category}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body1"><strong>Priority:</strong> {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body1"><strong>Status:</strong> {request.status.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}</Typography>
            </Grid>
            {request.assigned_to_username && (
              <Grid item xs={12}>
                <Typography variant="body1"><strong>Assigned To:</strong> {request.assigned_to_username}</Typography>
              </Grid>
            )}
            {request.resolution_notes && (
              <Grid item xs={12}>
                <Typography variant="body1"><strong>Resolution Notes:</strong></Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{request.resolution_notes}</Typography>
              </Grid>
            )}
            <Grid item xs={12}>
              <Typography variant="body1"><strong>Description:</strong></Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{request.description}</Typography>
            </Grid>
          </Grid>
        </Paper>
      ))}
    </Box>
  );
}

export default ServiceRequestPrintView;