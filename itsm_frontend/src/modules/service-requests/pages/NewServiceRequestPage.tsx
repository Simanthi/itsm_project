// itsm_frontend/src/modules/service-requests/pages/NewServiceRequestPage.tsx

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
import { getCatalogItemById } from '../../service-catalog/api';
import { type CatalogItem } from '../../service-catalog/types';

interface LocationState {
  catalog_item_id?: number;
  prefill_title?: string;
  prefill_description?: string;
}

function NewServiceRequestPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // Token removed from destructuring as it's no longer directly used
  const { authenticatedFetch, loading: authLoading, isAuthenticated } = useAuth();

  // Allow catalog_item_id as an extra property for prefill
  const [initialFormData, setInitialFormData] = useState<Partial<ServiceRequest> & { catalog_item_id?: number } | undefined>(undefined);
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
        } catch {
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
    if (locationState?.catalog_item_id && !id) {
      // No need to setLoading(true) here, main loading handles authLoading
      const fetchCatalogItem = async () => {
        if (authLoading) return; // Wait for auth to resolve

        // Simplified guard: authenticatedFetch will handle token presence internally
        if (!isAuthenticated) {
          console.error('Cannot fetch catalog item details: User not authenticated.');
          setError('Authentication required to fetch catalog item details.');
          setPrefillData({
            catalog_item_id: locationState.catalog_item_id,
            title: locationState.prefill_title,
            description: locationState.prefill_description,
          });
          setLoading(false); // Ensure loading stops
          return;
        }
        try {
          setLoading(true); // Set loading true only when actually fetching
          const item = await getCatalogItemById(authenticatedFetch, locationState.catalog_item_id!);
          setCatalogItemDetails(item);
          setPrefillData({
            catalog_item_id: item.id,
            title: locationState.prefill_title || item.name,
            description: locationState.prefill_description || item.short_description,
          });
        } catch (catErr) {
          console.error('Error fetching catalog item details:', catErr);
          setError(parseError(catErr));
          setPrefillData({
            catalog_item_id: locationState.catalog_item_id,
            title: locationState.prefill_title,
            description: locationState.prefill_description,
          });
        }
      };
      fetchCatalogItem();
    } else {
      // If not fetching catalog item via location state, ensure loading is false
      // This case might occur if navigating directly to new request page without catalog interaction
      if (!id) setLoading(false);
    }
  }, [location.state, id, parseError, isAuthenticated, authLoading, authenticatedFetch]); // Deps updated

  useEffect(() => {
    const fetchInitialOrSetPrefill = async () => {
      if (id) { // Editing an existing request
        if (authLoading) return; // Wait for auth to resolve for existing requests too

        // Simplified guard
        if (!isAuthenticated) {
          console.error('Cannot fetch service request or catalog item details: User not authenticated.');
          setError('Authentication is required.');
          setLoading(false);
          return;
        }
        setLoading(true);
        setError(null);
        try {
          const requestData = await getServiceRequestById(authenticatedFetch, id);
          setInitialFormData(requestData);
          const reqWithCatalogId = requestData as ServiceRequest & { catalog_item_id?: number };
          if (reqWithCatalogId.catalog_item_id) {
            // Fetch linked catalog item
            const item = await getCatalogItemById(authenticatedFetch, reqWithCatalogId.catalog_item_id);
            setCatalogItemDetails(item);
          }
        } catch (err) {
          console.error('Error fetching service request data for edit:', err);
          setError(parseError(err));
        } finally {
          setLoading(false);
        }
      } else if (prefillData.catalog_item_id) { // Creating new request with prefill from (potentially failed) catalog item fetch
        setInitialFormData({
          title: prefillData.title || '',
          description: prefillData.description || '',
          catalog_item_id: prefillData.catalog_item_id,
        });
        // setLoading(false) should have been handled by the first useEffect if catalog item was fetched
        // or if it failed due to auth. If here, it means first effect didn't run or completed.
        if (!(location.state as LocationState)?.catalog_item_id) setLoading(false);
      } else { // Creating a brand new request without any prefill
        setLoading(false);
        setInitialFormData(undefined);
      }
    };

    // Condition to run this effect:
    // 1. If `id` is present (editing).
    // 2. Or, if `prefillData` has been populated (by the first effect).
    // 3. Or, if there was no `catalog_item_id` in location.state to trigger the first effect (direct navigation to new).
    if (id || Object.keys(prefillData).length > 0 || !(location.state as LocationState)?.catalog_item_id) {
        if (!authLoading) { // Only proceed if auth state is resolved
            fetchInitialOrSetPrefill();
        } else if (!id && !(location.state as LocationState)?.catalog_item_id) {
            // If creating a new blank request and auth is still loading, set loading to true
            // to prevent form rendering prematurely.
            setLoading(true);
        }
    }
  }, [id, authenticatedFetch, parseError, prefillData, location.state, isAuthenticated, authLoading]); // Deps updated

  const pageTitle = id
    ? `Edit Service Request: ${id}`
    : 'Create New Service Request';

  // Consider authLoading in the main loading check
  if (loading || authLoading && id) { // For existing requests, authLoading implies main loading
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
      <ServiceRequestForm
        initialData={initialFormData}
        catalogItemName={catalogItemDetails?.name}
      />
    </Box>
  );
}

export default NewServiceRequestPage;
