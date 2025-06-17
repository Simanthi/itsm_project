import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  // AppBar, // Removed AppBar
  // Toolbar, // Removed Toolbar
} from '@mui/material';
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
const SIDEBAR_WIDTH = 240; // Assuming a common sidebar width in pixels
const ServiceRequestPrintView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { authenticatedFetch } = useAuth(); // Removed token
  const theme = useTheme();
  const { selectedRequestIds, autoPrint } =
    (location.state as LocationState) || {
      selectedRequestIds: [],
      autoPrint: false,
    };

  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [printRootElement, setPrintRootElement] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    const element = document.getElementById('print-root');
    if (element) {
      setPrintRootElement(element);
    } else {
      console.error(
        'Print root element #print-root not found in index.html. Print functionality may not work.',
      );
      setError(
        'Print functionality not initialized. Missing #print-root element in your public/index.html.',
      );
      setLoading(false);
    }
  }, []);

  const fetchRequestsForPrint = useCallback(async () => {
    if (!authenticatedFetch) {
      // Check for authenticatedFetch
      setError('Authentication context not available. Please log in.');
      setLoading(false);
      return;
    }
    if (selectedRequestIds.length === 0) {
      setError('No service requests selected for printing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fetchedRequests: ServiceRequest[] = [];
      for (const reqId of selectedRequestIds) {
        try {
          const request = await getServiceRequestById(
            authenticatedFetch,
            reqId,
          ); // Pass authenticatedFetch
          fetchedRequests.push(request);
        } catch (singleFetchError) {
          console.error(`Failed to fetch request ${reqId}:`, singleFetchError);
        }
      }
      setServiceRequests(fetchedRequests);
      if (fetchedRequests.length === 0 && selectedRequestIds.length > 0) {
        setError(
          'Could not fetch any of the selected service requests. They might not exist or you lack permission.',
        );
      }
    } catch (err) {
      console.error('Error fetching service requests for print:', err);
      setError(
        'Failed to load service requests for print preview due to a general error.',
      );
    } finally {
      setLoading(false);
    }
  }, [selectedRequestIds, authenticatedFetch]); // Added authenticatedFetch to dependencies

  useEffect(() => {
    fetchRequestsForPrint();
  }, [fetchRequestsForPrint]);

  useEffect(() => {
    if (
      !loading &&
      !error &&
      serviceRequests.length > 0 &&
      autoPrint &&
      printRootElement
    ) {
      printRootElement.style.display = 'block';

      const timer = setTimeout(() => {
        window.print();

        printRootElement.style.display = 'none';

        navigate(location.pathname, {
          replace: true,
          state: {
            selectedRequestIds: selectedRequestIds,
            autoPrint: false,
          },
        });
      }, 500);

      return () => {
        clearTimeout(timer);
        if (printRootElement) {
          printRootElement.style.display = 'none';
        }
      };
    }
  }, [
    loading,
    error,
    serviceRequests.length,
    autoPrint,
    navigate,
    printRootElement,
    location.pathname,
    selectedRequestIds,
  ]);

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

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
          flexDirection: 'column',
        }}
      >
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Preparing print preview...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        {!autoPrint && <BackButton sx={{ mt: 2 }} />}
      </Box>
    );
  }

  if (serviceRequests.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No service requests found for printing.</Alert>
        {!autoPrint && <BackButton sx={{ mt: 2 }} />}
      </Box>
    );
  }

  const printContent = (
    <>
      {/* Fixed Container for both "Back" and "Print" buttons.
          This Box is fixed to the viewport, but its 'width', 'left', and 'transform'
          properties are set to make it appear horizontally centered and aligned with
          the main content container's 80% max-width. */}
      {!autoPrint && (
        <Box
          sx={{
            position: 'fixed',
            top: 80, // Positioned 80px from the top of the viewport.
            left: SIDEBAR_WIDTH, // Starts from where the sidebar ends.
            width: `calc(100vw - ${SIDEBAR_WIDTH}px)`, // Spans the remaining viewport width.
            display: 'flex',
            justifyContent: 'space-between', // Distributes items to ends of the flex container.
            zIndex: theme.zIndex.drawer + 1, // Ensures buttons are on top of other content.
            padding: '0 20px', // Horizontal padding within the fixed container.
            boxSizing: 'border-box', // Crucial: padding is included in the element's total width.
            //backgroundColor: theme.palette.background.paper, // Use theme background for integration.
            //boxShadow: theme.shadows[1], // Add shadow for visual separation.
            //borderRadius: theme.shape.borderRadius || 4, // Match other elements' rounded corners.
          }}
        >
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
                  autoPrint: true,
                },
              });
            }}
            startIcon={<PrintIcon />}
          >
            Print
          </Button>
        </Box>
      )}

      {/* Main content container for service request details. */}
      <Box
        className="print-container"
        sx={{
          maxWidth: '80%',
          // Adjust margin-top to account for the fixed button box's height and desired spacing.
          // Roughly: fixed_box_top (80px) + fixed_box_height (~40-50px) + desired_spacing (e.g., 20px) = ~140-150px
          marginTop: autoPrint ? '0' : '64px', // When not printing, push content below fixed buttons
          marginBottom: '30px',
          marginLeft: 'auto',
          marginRight: 'auto',
          padding: '30px',
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
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: theme.palette.primary.main }}
            >
              Service Request: {request.request_id}
            </Typography>
            <Typography variant="h6" sx={{ mt: 1 }}>
              {request.title}
            </Typography>
            <p
              style={{
                lineHeight: 1.6,
                marginBottom: '8px',
                color: theme.palette.text.primary,
              }}
            >
              <strong>Description:</strong> {request.description}
            </p>
            <p
              style={{
                lineHeight: 1.6,
                marginBottom: '8px',
                color: theme.palette.text.primary,
              }}
            >
              <strong>Category:</strong> {request.category}
            </p>
            <p
              style={{
                lineHeight: 1.6,
                marginBottom: '8px',
                color: theme.palette.text.primary,
              }}
            >
              <strong>Status:</strong>{' '}
              {request.status
                .replace(/_/g, ' ')
                .split(' ')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')}
            </p>
            <p
              style={{
                lineHeight: 1.6,
                marginBottom: '8px',
                color: theme.palette.text.primary,
              }}
            >
              <strong>Priority:</strong> {request.priority}
            </p>
            <p
              style={{
                lineHeight: 1.6,
                marginBottom: '8px',
                color: theme.palette.text.primary,
              }}
            >
              <strong>Requested By:</strong> {request.requested_by_username}
            </p>
            <p
              style={{
                lineHeight: 1.6,
                marginBottom: '8px',
                color: theme.palette.text.primary,
              }}
            >
              <strong>Assigned To:</strong>{' '}
              {request.assigned_to_username || 'Unassigned'}
            </p>
            {request.resolution_notes && (
              <p
                style={{
                  lineHeight: 1.6,
                  marginBottom: '8px',
                  color: theme.palette.text.primary,
                }}
              >
                <strong>Resolution Notes:</strong> {request.resolution_notes}
              </p>
            )}
            <p
              style={{
                lineHeight: 1.6,
                marginBottom: '8px',
                color: theme.palette.text.primary,
              }}
            >
              <strong>Created At:</strong>{' '}
              {new Date(request.created_at).toLocaleString()}
            </p>
            <p
              style={{
                lineHeight: 1.6,
                marginBottom: '8px',
                color: theme.palette.text.primary,
              }}
            >
              <strong>Last Updated:</strong>{' '}
              {new Date(request.updated_at).toLocaleString()}
            </p>
            {request.resolved_at && (
              <p
                style={{
                  lineHeight: 1.6,
                  marginBottom: '8px',
                  color: theme.palette.text.primary,
                }}
              >
                <strong>Resolved At:</strong>{' '}
                {new Date(request.resolved_at).toLocaleString()}
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
