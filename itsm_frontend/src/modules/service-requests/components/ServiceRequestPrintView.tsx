// itsm_frontend/src/features/serviceRequests/pages/ServiceRequestPrintView.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Grid, CircularProgress, Button } from '@mui/material';

// Import the global ServiceRequest type from ServiceRequestTypes.ts
import { type ServiceRequest } from '../types/ServiceRequestTypes';

// REMOVE THE OLD LOCAL INTERFACE DEFINITION HERE:
// interface ServiceRequest {
//   id: string;
//   title: string;
//   description: string;
//   status: string;
//   requestedBy: string; // This is now requested_by (number)
//   requestedDate: string; // This is now created_at (ISO string)
//   category: string;
//   // ... other fields as needed for print
// }

function ServiceRequestPrintView() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [serviceRequestsToPrint, setServiceRequestsToPrint] = useState<ServiceRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { selectedIds, autoPrint } = (location.state as { selectedIds: string[]; autoPrint?: boolean }) || { selectedIds: [] };

  useEffect(() => {
    if (!selectedIds || selectedIds.length === 0) {
      setError("No service requests selected for printing.");
      setLoading(false);
      return;
    }

    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        // --- Replace this mock data with your actual data fetching logic ---
        // This should fetch the details for all IDs in `selectedIds`
        // Make sure this mock data fully matches the ServiceRequest type from ServiceRequestTypes.ts
        const allMockData: ServiceRequest[] = [
          {
            id: 'SR001',
            request_id: 'SR-PRINT-001',
            title: 'Printer Toner Refill - Office B',
            description: 'Toner low for LaserJet 4000 in Office B. Please refill.',
            status: 'new', // Aligned with new status type
            category: 'hardware', // Aligned with new category type
            priority: 'medium', // Aligned with new priority type
            requested_by: 'james', // User ID
            created_at: '2023-10-26T10:00:00Z', // ISO string
            updated_at: '2023-10-26T10:00:00Z',
            resolution_notes: null,
            resolved_at: null,
            assigned_to: null,
          },
          {
            id: 'SR002',
            request_id: 'SR-PRINT-002',
            title: 'New Laptop Request - Marketing',
            description: 'Requesting a new laptop for new hire Jane Smith in Marketing department.',
            status: 'pending_approval', // Aligned with new status type
            category: 'hardware',
            priority: 'high',
            requested_by: 'james',
            created_at: '2023-10-25T14:30:00Z',
            updated_at: '2023-10-25T14:30:00Z',
            resolution_notes: null,
            resolved_at: null,
            assigned_to: null,
          },
          {
            id: 'SR003',
            request_id: 'SR-PRINT-003',
            title: 'Software Install - Photoshop',
            description: 'Need Photoshop installed on my new workstation.',
            status: 'closed', // Aligned with new status type
            category: 'software',
            priority: 'medium',
            requested_by: 'james',
            created_at: '2023-10-20T09:00:00Z',
            updated_at: '2023-10-20T11:00:00Z',
            resolution_notes: "Photoshop installed and licensed.",
            resolved_at: '2023-10-20T11:00:00Z',
            assigned_to: 'james',
          }
        ];

        const filteredRequests = allMockData.filter(req => selectedIds.includes(req.id));

        if (filteredRequests.length > 0) {
          setServiceRequestsToPrint(filteredRequests);
        } else {
          setError("Selected service requests not found or no data available.");
        }
        // --- End of mock data replacement ---

      } catch (err) {
        setError("Failed to load service request details.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [selectedIds]); // Re-fetch if selectedIds change

  useEffect(() => {
    if (!loading && !error && autoPrint) {
      const printTimeout = setTimeout(() => {
        window.print();
      }, 500); // Give it half a second to render

      return () => clearTimeout(printTimeout);
    }
  }, [loading, error, autoPrint]); // Removed navigate from dependency array as it's not used in this effect

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
            Service Request: {request.title} (ID: {request.request_id || request.id}) {/* Display request_id if available */}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              {/* Display requested_by (ID) or provide a lookup if you implement user names */}
              <Typography variant="body1"><strong>Requested By:</strong> {request.requested_by}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              {/* Display created_at formatted as a date */}
              <Typography variant="body1"><strong>Requested Date:</strong> {new Date(request.created_at).toLocaleDateString()}</Typography>
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
            {request.resolution_notes && ( // Only show if resolution_notes exists
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