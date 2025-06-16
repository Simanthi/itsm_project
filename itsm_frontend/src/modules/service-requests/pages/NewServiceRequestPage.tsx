// itsm_frontend/src/modules/service-requests/pages/NewServiceRequestPage.tsx

import { useState, useEffect, useCallback } from 'react'; // Removed React default import
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
import { getServiceRequestById } from '../../../api/serviceRequestApi'; // Import API call for fetching request
import { useAuth } from '../../../context/auth/useAuth'; // Import useAuth to get token
import { type ServiceRequest } from '../types/ServiceRequestTypes'; // Import ServiceRequest type

function NewServiceRequestPage() {
  const { id } = useParams<{ id?: string }>(); // 'id' will be the request_id string (e.g., "SR-AA-0001")
  const navigate = useNavigate();
  const { authenticatedFetch } = useAuth(); // Removed token

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
      if (id) { // authenticatedFetch check is handled by the useEffect wrapper
        setLoading(true);
        setError(null);
        try {
          const requestData = await getServiceRequestById(authenticatedFetch, id); // Pass authenticatedFetch
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

    if (authenticatedFetch) {
      // Only attempt to fetch if authenticatedFetch is available
      fetchInitialData();
    } else {
      // If id is present but authenticatedFetch is not, it's an error condition for edit mode.
      if (id) {
          setError('Authentication context not available. Please log in to load this request.');
      }
      setLoading(false); // Ensure loading stops
    }
  }, [id, authenticatedFetch, parseError]);

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
        <Button variant="contained" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Back
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
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
        <Typography variant="h5" component="h1">
          {pageTitle}
        </Typography>
      </Box>
      {/*
        Pass initialFormData to ServiceRequestForm only after it's loaded.
        For new requests (id is undefined), initialFormData will be undefined,
        and ServiceRequestForm will correctly initialize as a new request form.
      */}
      <ServiceRequestForm initialData={initialFormData} />
    </Box>
  );
}

export default NewServiceRequestPage;
