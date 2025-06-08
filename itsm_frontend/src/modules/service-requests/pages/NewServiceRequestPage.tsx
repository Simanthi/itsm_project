// itsm_frontend/src/features/serviceRequests/pages/NewServiceRequestPage.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Alert, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack'; // Import the back arrow icon

import ServiceRequestForm from '../components/ServiceRequestForm';
import { useServiceRequests } from '../hooks/useServiceRequests';
import { type ServiceRequest } from '../types/ServiceRequestTypes';

function NewServiceRequestPage() {
  const { id } = useParams<{ id: string }>(); // Get the ID from the URL params if in edit mode
  const navigate = useNavigate();
  const { serviceRequests } = useServiceRequests(); // Access all service requests from context
  const [initialFormData, setInitialFormData] = useState<ServiceRequest | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      // If an ID is present, we are in edit mode
      setIsLoading(true);
      setError(null);
      // In a real application, you'd fetch data from an API here
      const foundRequest = serviceRequests.find(req => req.id === id);
      if (foundRequest) {
        setInitialFormData(foundRequest);
      } else {
        setError(`Service Request with ID ${id} not found.`);
        // Optionally navigate to 404 or service requests list if not found
        // navigate('/service-requests', { replace: true });
      }
      setIsLoading(false);
    } else {
      // No ID, so it's a new request
      setInitialFormData(undefined); // Ensure no old data is passed
      setIsLoading(false);
    }
  }, [id, serviceRequests, navigate]); // Depend on id and serviceRequests for updates

  const pageTitle = id ? `Edit Service Request: ${id}` : 'Create New Service Request';

  // Function to handle navigating back to the service requests list
  const handleBack = () => {
    navigate('/service-requests');
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h5">Loading...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="contained" onClick={() => navigate('/service-requests')} sx={{ mt: 2 }}>
          Back to Service Requests
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, height: '100%', overflow: 'auto' }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}> {/* Container for button and title */}
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1"> {/* Use component="h1" for semantic HTML */}
          {pageTitle}
        </Typography>
      </Box>
      {/* Pass initialFormData to the ServiceRequestForm */}
      <ServiceRequestForm initialData={initialFormData} />
    </Box>
  );
}

export default NewServiceRequestPage;