// itsm_frontend/src/modules/service-requests/pages/ServiceRequestPrintView.tsx

import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { getServiceRequestById } from '../../../api/serviceRequestApi';
import { type ServiceRequest } from '../types/ServiceRequestTypes';
import {
  Container, Typography, Box, CircularProgress, Alert, Paper, Grid, Divider, useTheme
} from '@mui/material';
import ReactToPrint from 'react-to-print';
import PrintIcon from '@mui/icons-material/Print';

const ServiceRequestPrintView: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const componentRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      if (!user?.token) {
        setError('Authentication token not found.');
        setLoading(false);
        return;
      }

      // FIX: Expect 'selectedRequestIds' (array of request_id strings) from navigation state
      const selectedRequestIds: string[] = location.state?.selectedRequestIds || [];
      const autoPrint: boolean = location.state?.autoPrint || false;

      if (selectedRequestIds.length === 0) {
        setError('No service requests selected for printing.');
        setLoading(false);
        return;
      }

      try {
        const fetchedRequests: ServiceRequest[] = [];
        for (const requestId of selectedRequestIds) { // Iterate over request_id strings
          try {
            // Pass the request_id directly to getServiceRequestById
            const request = await getServiceRequestById(requestId, user.token);
            fetchedRequests.push(request);
          } catch (e) {
            console.error(`Error fetching service request ${requestId}:`, e);
            setError(`Error fetching service request ${requestId}: ${e instanceof Error ? e.message : String(e)}`);
            // Continue to try fetching other requests
          }
        }
        setServiceRequests(fetchedRequests);
        if (autoPrint && fetchedRequests.length > 0) {
          // You would typically call a print method here, e.g., componentRef.current.print()
          // if ReactToPrint allowed direct imperative calls.
          // For now, this is a placeholder. You might need to adjust your ReactToPrint setup
          // to automatically trigger printing based on the `autoPrint` flag.
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [location.state, user?.token]);

  // Helper to format date strings
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

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

  if (serviceRequests.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No service requests found to print.</Alert>
      </Box>
    );
  }

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <ReactToPrint
          trigger={() => (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PrintIcon />}
            >
              Print All Selected
            </Button>
          )}
          content={() => componentRef.current}
          pageStyle="@page { size: A4; margin: 15mm; } @media print { body { -webkit-print-color-adjust: exact; } }"
        />
      </Box>

      <div ref={componentRef} style={{ padding: theme.spacing(3), backgroundColor: theme.palette.background.paper }}>
        {serviceRequests.map((request, index) => (
          <Paper key={request.id} elevation={3} sx={{ p: 4, mb: 4, border: '1px solid #eee' }}>
            <Typography variant="h5" component="h2" gutterBottom align="center" sx={{ fontWeight: 'bold', mb: 3 }}>
              Service Request Details
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Request ID:</Typography>
                <Typography variant="body1">{request.request_id}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Title:</Typography>
                <Typography variant="body1">{request.title}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Description:</Typography>
                <Typography variant="body1">{request.description}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Category:</Typography>
                <Typography variant="body1">{request.category}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Status:</Typography>
                <Typography variant="body1">{request.status}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Priority:</Typography>
                <Typography variant="body1">{request.priority}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Requested By:</Typography>
                <Typography variant="body1">{request.requested_by_username}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Assigned To:</Typography>
                <Typography variant="body1">{request.assigned_to_username || 'Unassigned'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Created At:</Typography>
                <Typography variant="body1">{formatDate(request.created_at)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Last Updated:</Typography>
                <Typography variant="body1">{formatDate(request.updated_at)}</Typography>
              </Grid>
              {request.resolved_at && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Resolved At:</Typography>
                  <Typography variant="body1">{formatDate(request.resolved_at)}</Typography>
                </Grid>
              )}
              {request.resolution_notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Resolution Notes:</Typography>
                  <Typography variant="body1">{request.resolution_notes}</Typography>
                </Grid>
              )}
            </Grid>
            {index < serviceRequests.length - 1 && (
              <Box sx={{ mt: 4, mb: 4, borderBottom: '1px dashed #ccc', pageBreakAfter: 'always' }} />
            )}
          </Paper>
        ))}
      </div>
    </Container>
  );
};

export default ServiceRequestPrintView;
