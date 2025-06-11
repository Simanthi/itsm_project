// itsm_frontend/src/modules/service-requests/pages/NewServiceRequestPage.tsx

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Alert, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import ServiceRequestForm from '../components/ServiceRequestForm';
import { useServiceRequests } from '../hooks/useServiceRequests';
import { type ServiceRequest } from '../types/ServiceRequestTypes';

function NewServiceRequestPage() {
  const { id } = useParams<{ id?: string }>(); // Make id optional to reflect potential absence
  const navigate = useNavigate();
  const { serviceRequests } = useServiceRequests();
  const [initialFormData, setInitialFormData] = useState<ServiceRequest | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      setError(null);
      // FIX: Convert req.id to string for comparison with id from useParams (which is always string)
      const foundRequest = serviceRequests.find(req => String(req.id) === id);
      if (foundRequest) {
        setInitialFormData(foundRequest);
      } else {
        setError(`Service Request with ID ${id} not found.`);
      }
      setIsLoading(false);
    } else {
      setInitialFormData(undefined);
      setIsLoading(false);
    }
  }, [id, serviceRequests, navigate]);

  const pageTitle = id ? `Edit Service Request: ${id}` : 'Create New Service Request';

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
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1">
          {pageTitle}
        </Typography>
      </Box>
      {/* Pass initialFormData to the ServiceRequestForm */}
      <ServiceRequestForm initialData={initialFormData} />
    </Box>
  );
}

export default NewServiceRequestPage;