// itsm_frontend/src/features/serviceRequests/pages/ServiceRequestPrintView.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Grid, CircularProgress, Button } from '@mui/material'; // Ensure Button is imported

// Assume you have a hook or API to fetch multiple service requests
// import { useServiceRequestsByIds } from '../hooks/useServiceRequestsByIds'; // A hook that takes an array of IDs

interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  requestedBy: string;
  requestedDate: string;
  category: string;
  // ... other fields as needed for print
}

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
        const allMockData: ServiceRequest[] = [
          { id: 'SR001', title: 'Printer Toner Refill - Office B', description: 'Toner low for LaserJet 4000 in Office B. Please refill.', status: 'Open', requestedBy: 'John Doe', requestedDate: '2023-10-26', category: 'IT Consumables' },
          { id: 'SR002', title: 'New Laptop Request - Marketing', description: 'Requesting a new laptop for new hire Jane Smith in Marketing department.', status: 'Pending Approval', requestedBy: 'Alice Smith', requestedDate: '2023-10-25', category: 'Hardware Request' },
          { id: 'SR003', title: 'Software Install - Photoshop', description: 'Need Photoshop installed on my new workstation.', status: 'Closed', requestedBy: 'Bob Johnson', requestedDate: '2023-10-20', category: 'Software Request' }
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
      // Use a setTimeout to ensure the DOM has fully rendered before printing
      const printTimeout = setTimeout(() => {
        window.print();
        // Optional: After printing, you might want to navigate back.
        // However, detecting when a print dialog is *closed* by the user is complex
        // and not reliably cross-browser. The user can just use the browser's back button
        // or click the "Back" button we are adding below.
      }, 500); // Give it half a second to render

      // Clean up the timeout if component unmounts
      return () => clearTimeout(printTimeout);
    }
  }, [loading, error, autoPrint, navigate]); // Added navigate to dependency array

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
        {/* Also show back button here if there's an error */}
        <Button variant="contained" onClick={() => navigate('/service-requests')} sx={{ mt: 2 }}>Go to Service Requests</Button>
      </Box>
    );
  }

  if (!serviceRequestsToPrint.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>No service requests found for printing.</Typography>
        {/* Also show back button here if no requests are found */}
        <Button variant="contained" onClick={() => navigate('/service-requests')} sx={{ mt: 2 }}>Go to Service Requests</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Container for the back and print buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        {/* ADDED: Back Button */}
        <Button variant="outlined" onClick={() => navigate('/service-requests')}>
          Back to Service Requests
        </Button>

        {/* Conditional "Print Now" button (only visible if not auto-printing) */}
        {/* {!autoPrint && ( */}
            <Button variant="contained" onClick={() => window.print()}>Print Now</Button>
        {/* )} */}
      </Box>

      {serviceRequestsToPrint.map((request) => (
        <Paper key={request.id} sx={{ p: 3, mb: 4, border: '1px solid #eee' }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            Service Request: {request.title} (ID: {request.id})
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1"><strong>Requested By:</strong> {request.requestedBy}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1"><strong>Requested Date:</strong> {request.requestedDate}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body1"><strong>Category:</strong> {request.category}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body1"><strong>Status:</strong> {request.status}</Typography>
            </Grid>
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