// itsm_frontend/src/features/serviceRequests/components/ServiceRequestPrintView.tsx
import { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, Divider, Button } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { useLocation, useNavigate } from 'react-router-dom';
import { useServiceRequests } from '../hooks/useServiceRequests';
import { type ServiceRequest } from '../types/ServiceRequestTypes';

function ServiceRequestPrintView() {
  const location = useLocation(); // Used to get state passed during navigation
  const navigate = useNavigate();
  const { serviceRequests } = useServiceRequests();
  const [requestsToPrint, setRequestsToPrint] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Expect selectedIds to be passed via navigation state
    const selectedIds = location.state?.selectedIds as string[] | undefined;

    if (!selectedIds || selectedIds.length === 0) {
      setError('No service requests selected for print preview.');
      setIsLoading(false);
      return;
    }

    // Filter service requests from our mock data based on selected IDs
    const foundRequests = serviceRequests.filter(req => selectedIds.includes(req.id));

    if (foundRequests.length === 0) {
      setError('Selected service requests not found in the system.');
    } else if (foundRequests.length !== selectedIds.length) {
      // This case handles if some IDs were passed but not all were found
      setError('Some selected service requests could not be found.');
    }
    setRequestsToPrint(foundRequests);
    setIsLoading(false);
  }, [location.state, serviceRequests]); // Re-run when navigation state or serviceRequests change

  const handlePrint = () => {
    window.print(); // Trigger the browser's native print dialog
  };

  const handleBack = () => {
    navigate('/service-requests'); // Navigate back to the service requests list
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h5">Loading print preview...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h5" color="error">Error: {error}</Typography>
        <Button variant="contained" onClick={handleBack} sx={{ mt: 2 }}>
          Back to Service Requests
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, '@media print': { p: 0 } }}> {/* Adjust padding for print */}
      {/* Buttons and title for the web view, hidden during print */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 2,
        '@media print': { display: 'none' } // Hide this box when printing
      }}>
        <Typography variant="h5">Service Request(s) Print Preview</Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{ mr: 1 }}
          >
            Print
          </Button>
          <Button
            variant="outlined"
            onClick={handleBack}
          >
            Back
          </Button>
        </Box>
      </Box>

      {/* Content to be printed */}
      {requestsToPrint.length === 0 ? (
        <Typography variant="body1">No requests found to print based on selection.</Typography>
      ) : (
        requestsToPrint.map((request, index) => (
          <Paper key={request.id} elevation={0} sx={{ // Use elevation 0 for cleaner print
            mb: 3,
            p: 3,
            border: '1px solid #eee', // Light border for separation in web view
            '@media print': {
              border: 'none', // Remove border for print
              boxShadow: 'none', // Remove shadow for print
              pageBreakInside: 'avoid', // Try to keep entire request on one page
              mb: 0, // Remove margin between items for cleaner page breaks
              p: 0, // Remove padding for print
              '&:not(:last-of-type)': {
                pageBreakAfter: 'always' // Optional: force new page after each request
              }
            }
          }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', '@media print': { color: 'black' } }}>
              Service Request ID: {request.id} - {request.title}
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Requested By:</Typography>
                <Typography variant="body1">{request.requestedBy}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Requested Date:</Typography>
                <Typography variant="body1">{request.requestedDate}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Status:</Typography>
                <Typography variant="body1">{request.status}</Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Description:</Typography>
                <Typography variant="body1">{request.description}</Typography>
              </Grid>
            </Grid>
            {index < requestsToPrint.length - 1 && (
              // Divider for web view, replaced by page-break for print
              <Divider sx={{ my: 3, '@media print': { display: 'none' } }} />
            )}
          </Paper>
        ))
      )}
    </Box>
  );
}

export default ServiceRequestPrintView;