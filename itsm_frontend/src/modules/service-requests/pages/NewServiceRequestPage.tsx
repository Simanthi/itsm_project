// itsm_frontend/src/modules/service-requests/pages/NewServiceRequestPage.tsx

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import ServiceRequestForm from '../components/ServiceRequestForm';
import { getServiceRequestById } from '../../../api/serviceRequestApi';
import { useAuth } from '../../../context/auth/useAuth';
import { type ServiceRequest } from '../types/ServiceRequestTypes';

function NewServiceRequestPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { authenticatedFetch } = useAuth();

  const [initialFormData, setInitialFormData] = useState<
    ServiceRequest | undefined
  >(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const parseError = useCallback((err: unknown): string => {
    if (err instanceof Error) {
      if (err.message.includes('API error: ') && err.message.includes('{')) {
        try {
          const errorPart = err.message.substring(err.message.indexOf('{'));
          const errorDetails = JSON.parse(errorPart);
          const firstKey = Object.keys(errorDetails)[0];
          if (
            firstKey &&
            Array.isArray(errorDetails[firstKey]) &&
            typeof errorDetails[firstKey][0] === 'string'
          ) {
            return `${firstKey.replace(/_/g, ' ')}: ${errorDetails[firstKey][0]}`;
          }
          return `Details: ${JSON.stringify(errorDetails)}`;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
          return err.message;
        }
      }
      return err.message;
    }
    return String(err);
  }, []);

  // Effect to fetch initial data for editing
  useEffect(() => {
    const fetchInitialData = async () => {
      // The `id` check already handles whether to fetch or not
      // and `authenticatedFetch` is guaranteed to be a function by its type.
      if (id) {
        setLoading(true);
        setError(null);
        try {
          // No need to check authenticatedFetch here again, it's a dependency of the useEffect
          const requestData = await getServiceRequestById(authenticatedFetch, id);
          setInitialFormData(requestData);
        } catch (err) {
          console.error('Error fetching service request data for edit:', err);
          setError(parseError(err));
        } finally {
          setLoading(false);
        }
      } else {
        // If no ID is present, it's a new request, so no initial data to load
        setLoading(false);
        setInitialFormData(undefined); // Ensure it's undefined for new requests
      }
    };

    // Call the async function. authenticatedFetch being in the dependency array
    // means this effect will re-run if authenticatedFetch changes (which it shouldn't
    // during a typical component lifecycle once it's established).
    // The previous `if (authenticatedFetch)` check was redundant.
    fetchInitialData();

  }, [id, authenticatedFetch, parseError]); // Keep authenticatedFetch in dependency array

  const pageTitle = id
    ? `Edit Service Request: ${id}`
    : 'Create New Service Request';

  const handleBack = () => {
    navigate('/service-requests');
  };

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
        <Typography sx={{ ml: 2, mt: 2 }}>
          Loading service request details...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load service request: {error}</Alert>
        <Button variant="contained" onClick={handleBack} sx={{ mt: 2 }}>
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
        <Typography variant="h1" component="h1">
          {pageTitle}
        </Typography>
      </Box>
      <ServiceRequestForm initialData={initialFormData} />
    </Box>
  );
}

export default NewServiceRequestPage;