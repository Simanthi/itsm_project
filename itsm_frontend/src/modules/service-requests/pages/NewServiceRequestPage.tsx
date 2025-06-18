// itsm_frontend/src/modules/service-requests/pages/NewServiceRequestPage.tsx

import { useState, useEffect, useCallback } from 'react'; // Removed React default import
import { useParams, useNavigate, useLocation } from 'react-router-dom'; // Added useLocation
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
import { getCatalogItemById } from '../../service-catalog/api'; // API to fetch catalog item
import { CatalogItem } from '../../service-catalog/types'; // Type for catalog item

interface LocationState {
  catalog_item_id?: number;
  prefill_title?: string;
  prefill_description?: string;
}

function NewServiceRequestPage() {
  const { id } = useParams<{ id?: string }>(); // 'id' will be the request_id string (e.g., "SR-AA-0001")
  const navigate = useNavigate();
  const location = useLocation(); // Get location object
  const { authenticatedFetch } = useAuth();

  const [initialFormData, setInitialFormData] = useState<Partial<ServiceRequest> | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [catalogItemDetails, setCatalogItemDetails] = useState<CatalogItem | null>(null);
  const [prefillData, setPrefillData] = useState<{
    catalog_item_id?: number;
    title?: string;
    description?: string;
  }>({});

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

  // Effect to handle pre-fill data from location state (from Service Catalog)
  useEffect(() => {
    const locationState = location.state as LocationState | null;
    if (locationState?.catalog_item_id && !id) { // Only if creating new, not editing
      setLoading(true);
      const fetchCatalogItem = async () => {
        try {
          const item = await getCatalogItemById(locationState.catalog_item_id!);
          setCatalogItemDetails(item);
          // Set prefill data from catalog item or location state
          setPrefillData({
            catalog_item_id: item.id,
            title: locationState.prefill_title || item.name,
            description: locationState.prefill_description || item.short_description,
          });
        } catch (catErr) {
          console.error('Error fetching catalog item details:', catErr);
          setError(parseError(catErr));
          // Still use any prefill data passed directly in state
           setPrefillData({
            catalog_item_id: locationState.catalog_item_id,
            title: locationState.prefill_title,
            description: locationState.prefill_description,
          });
        } finally {
          // setLoading(false) will be handled by the main data fetching useEffect
        }
      };
      fetchCatalogItem();
    }
  }, [location.state, id, parseError]);


  // Effect to fetch initial data for editing OR set prefill for new from catalog
  useEffect(() => {
    const fetchInitialOrSetPrefill = async () => {
      if (id) { // Editing existing SR
        setLoading(true);
        setError(null);
        try {
          const requestData = await getServiceRequestById(authenticatedFetch, id);
          setInitialFormData(requestData);
          // If editing, also fetch its catalog item if linked, for display consistency
          if (requestData.catalog_item) {
             const item = await getCatalogItemById(requestData.catalog_item as number); // Assuming catalog_item is ID
             setCatalogItemDetails(item);
          }
        } catch (err) {
          console.error('Error fetching service request data for edit:', err);
          setError(parseError(err));
        } finally {
          setLoading(false);
        }
      } else if (prefillData.catalog_item_id) { // New SR, with prefill data ready
        setInitialFormData({
          title: prefillData.title || '',
          description: prefillData.description || '',
          catalog_item: prefillData.catalog_item_id, // Pass catalog_item ID
          // Set other defaults if needed
        });
        setLoading(false);
      } else { // New SR, no prefill
        setLoading(false);
        setInitialFormData(undefined);
      }
    };

    // Only run if not editing, OR if prefillData is ready (after catalog item fetch)
    if (id || Object.keys(prefillData).length > 0 || !(location.state as LocationState)?.catalog_item_id) {
        fetchInitialOrSetPrefill();
    }
  }, [id, authenticatedFetch, parseError, prefillData, location.state]);

  const pageTitle = id
    ? `Edit Service Request: ${id}`
    : 'Create New Service Request';

  // const handleBack = () => { // No longer used
  //   navigate('/service-requests');
  // };

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
      <ServiceRequestForm
        initialData={initialFormData}
        catalogItemName={catalogItemDetails?.name} // Pass catalog item name for display
      />
    </Box>
  );
}

export default NewServiceRequestPage;
