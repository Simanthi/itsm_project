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
  const { authenticatedFetch } = useAuth();

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
      setLoading(true);
      const fetchCatalogItem = async () => {
        try {
          const item = await getCatalogItemById(locationState.catalog_item_id!);
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
    }
  }, [location.state, id, parseError]);

  useEffect(() => {
    const fetchInitialOrSetPrefill = async () => {
      if (id) {
        setLoading(true);
        setError(null);
        try {
          const requestData = await getServiceRequestById(authenticatedFetch, id);
          setInitialFormData(requestData);
          // If editing, also fetch its catalog item if linked, for display consistency
          // Use catalog_item_id instead of catalog_item
          const reqWithCatalogId = requestData as ServiceRequest & { catalog_item_id?: number };
          if (reqWithCatalogId.catalog_item_id) {
            const item = await getCatalogItemById(reqWithCatalogId.catalog_item_id);
            setCatalogItemDetails(item);
          }
        } catch (err) {
          console.error('Error fetching service request data for edit:', err);
          setError(parseError(err));
        } finally {
          setLoading(false);
        }
      } else if (prefillData.catalog_item_id) {
        setInitialFormData({
          title: prefillData.title || '',
          description: prefillData.description || '',
          catalog_item_id: prefillData.catalog_item_id, // Use catalog_item_id for prefill
        });
        setLoading(false);
      } else {
        setLoading(false);
        setInitialFormData(undefined);
      }
    };

    if (id || Object.keys(prefillData).length > 0 || !(location.state as LocationState)?.catalog_item_id) {
      fetchInitialOrSetPrefill();
    }
  }, [id, authenticatedFetch, parseError, prefillData, location.state]);

  const pageTitle = id
    ? `Edit Service Request: ${id}`
    : 'Create New Service Request';

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
      <ServiceRequestForm
        initialData={initialFormData}
        catalogItemName={catalogItemDetails?.name}
      />
    </Box>
  );
}

export default NewServiceRequestPage;
