// itsm_frontend/src/modules/assets/components/AssetDetailView.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Button,
  Divider,
  Chip,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Edit as EditIcon } from '@mui/icons-material';

import { useAuth } from '../../../context/auth/useAuth';
import { getAssetById } from '../../../api/assetApi';
import type { Asset } from '../types/assetTypes';
import { formatDate } from '../../../utils/formatters'; // Assuming formatDate utility

// Helper function to get status chip color (can be customized)
const getStatusChipColor = (status?: string) => {
  if (!status) return 'default';
  status = status.toLowerCase();
  if (status.includes('in use') || status.includes('deployed')) return 'success';
  if (status.includes('in stock') || status.includes('available')) return 'info';
  if (status.includes('retired') || status.includes('disposed')) return 'error';
  if (status.includes('maintenance') || status.includes('repair')) return 'warning';
  return 'default';
};

const AssetDetailView: React.FC = () => {
  const { assetId } = useParams<{ assetId?: string }>();
  const navigate = useNavigate();
  const { authenticatedFetch } = useAuth();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssetDetails = useCallback(async () => {
    if (!assetId) {
      setError('Asset ID is missing.');
      setLoading(false);
      return;
    }
    if (!authenticatedFetch) {
      setError('Authentication context is not available.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const numericAssetId = parseInt(assetId, 10);
      if (isNaN(numericAssetId)) {
        throw new Error('Invalid Asset ID format. Asset ID must be a number.');
      }
      const data = await getAssetById(authenticatedFetch, numericAssetId);
      setAsset(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to fetch asset details:', message, err);
      setError(`Failed to load asset details: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [assetId, authenticatedFetch]);

  useEffect(() => {
    fetchAssetDetails();
  }, [fetchAssetDetails]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading asset details...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  if (!asset) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Asset not found.</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '1000px', margin: 'auto' }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h1">
            Asset: {asset.name} ({asset.asset_tag})
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/assets')} // Assuming '/assets' is the list page
              sx={{ mr: 1 }}
            >
              Back to List
            </Button>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/assets/edit/${asset.id}`)} // Assuming edit path
            >
              Edit
            </Button>
          </Box>
        </Box>
        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={3}>
          {/* Column 1: Core Details & Assignment */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Asset Information</Typography>
            <Typography variant="body1"><strong>Asset Tag:</strong> {asset.asset_tag}</Typography>
            <Typography variant="body1"><strong>Name:</strong> {asset.name}</Typography>
            <Typography variant="body1"><strong>Serial Number:</strong> {asset.serial_number || 'N/A'}</Typography>
            <Box sx={{ my: 1 }}>
              <strong>Status:</strong>{' '}
              <Chip
                label={asset.status || 'N/A'}
                color={getStatusChipColor(asset.status)}
                size="small"
              />
            </Box>
            <Typography variant="body1"><strong>Category:</strong> {asset.category?.name || 'N/A'}</Typography>
            <Typography variant="body1"><strong>Location:</strong> {asset.location?.name || 'N/A'}</Typography>
            <Typography variant="body1"><strong>Assigned To:</strong> {asset.assigned_to?.username || 'Unassigned'}</Typography>
          </Grid>

          {/* Column 2: Purchase & Maintenance */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Purchase & Warranty</Typography>
            <Typography variant="body1"><strong>Vendor:</strong> {asset.vendor?.name || 'N/A'}</Typography>
            <Typography variant="body1"><strong>Purchase Date:</strong> {asset.purchase_date ? formatDate(asset.purchase_date) : 'N/A'}</Typography>
            <Typography variant="body1"><strong>Warranty End Date:</strong> {asset.warranty_end_date ? formatDate(asset.warranty_end_date) : 'N/A'}</Typography>
          </Grid>

          {/* Full-width section for Description */}
          {asset.description && (
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>Description / Notes</Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {asset.description}
              </Typography>
            </Grid>
          )}

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" display="block" color="textSecondary">
              Created: {formatDate(asset.created_at)} | Last Updated: {formatDate(asset.updated_at)}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default AssetDetailView;
