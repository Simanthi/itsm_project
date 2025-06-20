// itsm_frontend/src/modules/service-requests/pages/ServiceRequestDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Button,
  Divider,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Edit as EditIcon, Print as PrintIcon } from '@mui/icons-material';
import { useServiceRequests } from '../hooks/useServiceRequests'; // To potentially get a single request if already loaded
import { type ServiceRequest } from '../types/ServiceRequestTypes';
import { getServiceRequestById } from '../../../api/serviceRequestApi'; // Direct API call
import { useAuth } from '../../../context/auth/useAuth'; // For authenticatedFetch
import { formatDate } from '../../../utils/formatters'; // Assuming a shared formatter

const ServiceRequestDetailPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { authenticatedFetch } = useAuth();
  // const { getRequestById: getRequestFromContext } = useServiceRequests(); // Context hook - Removed

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequestDetails = async () => {
      if (!requestId) {
        setError('Request ID is missing.');
        setLoading(false);
        return;
      }
      if (!authenticatedFetch) {
        setError('Authentication context is not available.');
        setLoading(false);
        return;
      }

      setLoading(true);
      // Fetch directly from API
      try {
        const data = await getServiceRequestById(authenticatedFetch, requestId);
        setRequest(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch service request details:', err);
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRequestDetails();
  }, [requestId, authenticatedFetch]);

  const getStatusColor = (status: ServiceRequest['status'] | undefined) => {
    if (!status) return 'default';
    switch (status) {
      case 'new': return 'primary';
      case 'in_progress': return 'warning';
      case 'resolved': return 'success';
      case 'closed': return 'info';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading request details...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load service request details: {error}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  if (!request) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Service request not found.</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  const statusDisplay = request.status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
  const statusColor = getStatusColor(request.status);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '1000px', margin: 'auto' }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h1">
            Service Request: {request.request_id}
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/service-requests')}
              sx={{ mr: 1 }}
            >
              Back to List
            </Button>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/service-requests/edit/${request.request_id}`)}
              sx={{ mr: 1 }}
            >
              Edit
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<PrintIcon />}
              onClick={() => navigate('/service-requests/print-preview', { state: { selectedRequestIds: [request.request_id], autoPrint: false } })}
            >
              Print Preview
            </Button>
          </Box>
        </Box>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              {request.title}
            </Typography>
            <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
              {request.description}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Details</Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" display="block" color="textSecondary">Status</Typography>
                <Box
                  component="span"
                  sx={{
                    color: `${statusColor}.main`,
                    bgcolor: `${statusColor}.lightest`,
                    px: 1, py: 0.5, borderRadius: '4px', fontWeight: 'medium', border: `1px solid ${statusColor}.main`, display: 'inline-block'
                  }}
                >
                  {statusDisplay}
                </Box>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" display="block" color="textSecondary">Priority</Typography>
                <Typography variant="body2">{request.priority?.replace(/\b\w/g, (l) => l.toUpperCase()) || 'N/A'}</Typography>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Typography variant="caption" display="block" color="textSecondary">Category</Typography>
                <Typography variant="body2">{request.category?.replace(/\b\w/g, (l) => l.toUpperCase()) || 'N/A'}</Typography>
              </Box>
               {request.catalog_item_name && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" display="block" color="textSecondary">Catalog Item</Typography>
                  <Typography variant="body2">{request.catalog_item_name}</Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12}><Divider sx={{ my: 2 }} /></Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">Requested By:</Typography>
            <Typography variant="body1">{request.requested_by_username || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">Assigned To:</Typography>
            <Typography variant="body1">{request.assigned_to_username || 'Unassigned'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">Created At:</Typography>
            <Typography variant="body1">{formatDate(request.created_at)}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">Last Updated:</Typography>
            <Typography variant="body1">{formatDate(request.updated_at)}</Typography>
          </Grid>

          {request.resolved_at && (
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="textSecondary">Resolved At:</Typography>
              <Typography variant="body1">{formatDate(request.resolved_at)}</Typography>
            </Grid>
          )}

          {request.resolution_notes && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 2 }}>Resolution Notes:</Typography>
              <Paper variant="outlined" sx={{ p: 2, mt: 1, backgroundColor: 'grey.50' }}>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {request.resolution_notes}
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Paper>
    </Box>
  );
};

export default ServiceRequestDetailPage;
