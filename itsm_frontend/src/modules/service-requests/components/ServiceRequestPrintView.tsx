import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Typography, Box, CircularProgress, Alert, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; 
import { getServiceRequestById } from '../../../api/serviceRequestApi';
import { useAuth } from '../../../context/auth/useAuth';
import { type ServiceRequest } from '../types/ServiceRequestTypes';
import { type ButtonProps } from '@mui/material/Button'; 


interface LocationState {
  selectedRequestIds: string[];
  autoPrint?: boolean;
}

const ServiceRequestPrintView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useAuth();
  const theme = useTheme();
  const { selectedRequestIds, autoPrint } = (location.state as LocationState) || { selectedRequestIds: [], autoPrint: false };

  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [printRootElement, setPrintRootElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const element = document.getElementById('print-root');
    if (element) {
      setPrintRootElement(element);
    } else {
      console.error("Print root element #print-root not found in index.html");
      setError("Print functionality not initialized. Missing #print-root element.");
      setLoading(false);
    }
  }, []);

  const fetchRequestsForPrint = useCallback(async () => {
    if (!token) {
      setError("Authentication token not found. Please log in.");
      setLoading(false);
      return;
    }
    if (selectedRequestIds.length === 0) {
      setError("No service requests selected for printing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fetchedRequests: ServiceRequest[] = [];
      for (const reqId of selectedRequestIds) {
        try {
          const request = await getServiceRequestById(reqId, token);
          fetchedRequests.push(request);
        } catch (singleFetchError) {
          console.error(`Failed to fetch request ${reqId}:`, singleFetchError);
        }
      }
      setServiceRequests(fetchedRequests);
      if (fetchedRequests.length === 0 && selectedRequestIds.length > 0) {
          setError("Could not fetch any of the selected service requests.");
      }
    } catch (err) {
      console.error("Error fetching service requests for print:", err);
      setError("Failed to load service requests for print preview.");
    } finally {
      setLoading(false);
    }
  }, [selectedRequestIds, token]);

  useEffect(() => {
    fetchRequestsForPrint();
  }, [fetchRequestsForPrint]);

  useEffect(() => {
    if (!loading && !error && serviceRequests.length > 0 && autoPrint && printRootElement) {
      printRootElement.style.display = 'block';

      const timer = setTimeout(() => {
        window.print();
        
        printRootElement.style.display = 'none';
        
        navigate(location.pathname, {
          replace: true,
          state: {
            selectedRequestIds: selectedRequestIds,
            autoPrint: false
          }
        });

      }, 500);

      return () => {
        clearTimeout(timer);
        if (printRootElement) {
          printRootElement.style.display = 'none';
        }
      };
    }
  }, [loading, error, serviceRequests.length, autoPrint, navigate, printRootElement, location.pathname, selectedRequestIds]);


  // Define the BackButton component properly to accept and forward props, including 'sx'
  const BackButton: React.FC<ButtonProps> = (props) => (
    <Button
      variant="contained"
      color="primary"
      onClick={() => navigate('/service-requests')}
      startIcon={<ArrowBackIcon />}
      {...props} 
    >
      Back
    </Button>
  );


  // Render loading/error states
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Preparing print preview...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        {/* In error/empty states, this button is just at the bottom, not fixed */}
        {!autoPrint && <BackButton sx={{ mt: 2 }} />} 
      </Box>
    );
  }

  if (serviceRequests.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No service requests found for printing.</Alert>
        {/* In error/empty states, this button is just at the bottom, not fixed */}
        {!autoPrint && <BackButton sx={{ mt: 2 }} />} 
      </Box>
    );
  }

  // Define the content to be printed/previewed
  const printContent = (
    <>
      {/* Fixed Container for both buttons, directly mimicking print-container's horizontal layout */}
      {!autoPrint && (
        <Box sx={{
          position: 'fixed',
          top: 80,            // Positions it below your app bar (adjust if your app bar height differs)
          maxWidth: '75%',    // <<< CRITICAL: Matches the print-container's max width
          width: '100%',      // Ensures it takes available space up to maxWidth
          left: '50%',        // Start from 50% of the viewport width
          transform: 'translateX(-50%)', // Shift back by half of its own width to center
          display: 'flex',
          justifyContent: 'space-between', // Pushes buttons to opposite ends
          zIndex: 9999,       // Ensures it's above other content
          padding: '0 30px',  // <<< CRITICAL: Applies padding to align with print-container's inner content
          boxSizing: 'border-box', // Include padding in width calculation
        }}>
          {/* Back Button */}
          <BackButton /> 

          {/* Print Button */}
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              navigate(location.pathname, {
                replace: true,
                state: {
                  selectedRequestIds: selectedRequestIds,
                  autoPrint: true
                }
              });
            }}
            startIcon={<PrintIcon />}
          >
            Print Requests
          </Button>
        </Box>
      )}

      <Box
        className="print-container"
        sx={{
          maxWidth: '75%', // Main content max width
          // Adjusted margin-top to ensure the main content clears the fixed button area.
          // This value should be approximately: top_position_of_fixed_box + height_of_buttons + desired_spacing
          // (e.g., 80px + ~40px button height + ~20px desired spacing = 140px)
          margin: '140px auto 30px auto', 
          padding: '30px', // Main content internal padding
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[1],
          minHeight: 'calc(1122px - 60px)',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          borderRadius: theme.shape.borderRadius || 4,
        }}
      >
        {/* Content of the service request items */}
        {serviceRequests.map((request) => (
          <Box
            key={request.id}
            className="print-item"
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              padding: '15px',
              backgroundColor: theme.palette.background.default,
              borderRadius: theme.shape.borderRadius || 4,
              boxSizing: 'border-box',
            }}
          >
            <Typography variant="h5" gutterBottom sx={{ color: theme.palette.primary.main }}>
              Service Request: {request.request_id}
            </Typography>
            <Typography variant="h6" sx={{ mt: 1 }}>{request.title}</Typography>
            <p style={{ lineHeight: 1.6, marginBottom: '8px', color: theme.palette.text.primary }}>
              <strong>Description:</strong> {request.description}
            </p>
            <p style={{ lineHeight: 1.6, marginBottom: '8px', color: theme.palette.text.primary }}>
              <strong>Category:</strong> {request.category}
            </p>
            <p style={{ lineHeight: 1.6, marginBottom: '8px', color: theme.palette.text.primary }}>
              <strong>Status:</strong> {request.status.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </p>
            <p style={{ lineHeight: 1.6, marginBottom: '8px', color: theme.palette.text.primary }}>
              <strong>Priority:</strong> {request.priority}
            </p>
            <p style={{ lineHeight: 1.6, marginBottom: '8px', color: theme.palette.text.primary }}>
              <strong>Requested By:</strong> {request.requested_by_username}
            </p>
            <p style={{ lineHeight: 1.6, marginBottom: '8px', color: theme.palette.text.primary }}>
              <strong>Assigned To:</strong> {request.assigned_to_username || 'Unassigned'}
            </p>
            {request.resolution_notes && (
              <p style={{ lineHeight: 1.6, marginBottom: '8px', color: theme.palette.text.primary }}>
                <strong>Resolution Notes:</strong> {request.resolution_notes}
              </p>
            )}
            <p style={{ lineHeight: 1.6, marginBottom: '8px', color: theme.palette.text.primary }}>
              <strong>Created At:</strong> {new Date(request.created_at).toLocaleString()}
            </p>
            <p style={{ lineHeight: 1.6, marginBottom: '8px', color: theme.palette.text.primary }}>
              <strong>Last Updated:</strong> {new Date(request.updated_at).toLocaleString()}
            </p>
            {request.resolved_at && (
              <p style={{ lineHeight: 1.6, marginBottom: '8px', color: theme.palette.text.primary }}>
                <strong>Resolved At:</strong> {new Date(request.resolved_at).toLocaleString()}
              </p>
            )}
          </Box>
        ))}
      </Box>
    </>
  );

  return autoPrint && printRootElement
    ? ReactDOM.createPortal(printContent, printRootElement)
    : printContent;
};

export default ServiceRequestPrintView;
