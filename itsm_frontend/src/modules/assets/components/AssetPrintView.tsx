import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import {
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Paper,
  Divider,
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getAssetById } from '../../../api/assetApi';
import { useAuth } from '../../../context/auth/useAuth';
import type { Asset } from '../types';
import { type ButtonProps } from '@mui/material/Button';

const formatDateString = (isoString: string | null | undefined): string => {
  if (!isoString) return 'N/A';
  if (isoString.length === 10 && isoString.includes('-')) {
    return new Date(isoString + 'T00:00:00').toLocaleDateString();
  }
  return new Date(isoString).toLocaleString();
};

const getAssetStatusChipColor = (status?: string) => {
  if (!status) return 'default';
  const mapping: Record<
    string,
    | 'default'
    | 'primary'
    | 'secondary'
    | 'error'
    | 'info'
    | 'success'
    | 'warning'
  > = {
    in_use: 'success',
    in_stock: 'info',
    maintenance: 'warning',
    retired: 'default',
    disposed: 'error',
  };
  return mapping[status.toLowerCase().replace(/ /g, '_')] || 'default';
};

interface LocationState {
  selectedAssetIds?: number[];
  assetId?: number;
  autoPrint?: boolean;
}

const SIDEBAR_WIDTH = 240;

const AssetPrintView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { authenticatedFetch } = useAuth();
  const theme = useTheme();

  const state = location.state as LocationState | null;
  const autoPrint = state?.autoPrint || false;

  const assetIdsToFetch = useMemo(() => {
    let ids: number[] = [];
    if (state?.selectedAssetIds && state.selectedAssetIds.length > 0) {
      ids = state.selectedAssetIds;
    } else if (state?.assetId) {
      ids = [state.assetId];
    }
    return ids;
  }, [state]);

  const [assetsToPrint, setAssetsToPrint] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const componentRef = useRef<HTMLDivElement>(null);

  // FIX: Only use valid props for useReactToPrint
  const handleAssetPrintTrigger = useReactToPrint({
    contentRef: componentRef,
  });

  const fetchAssetsForPrint = useCallback(async () => {
    if (!authenticatedFetch) {
      setError('Authentication context not available.');
      setLoading(false);
      return;
    }
    if (assetIdsToFetch.length === 0) {
      setError('No Asset ID(s) provided for printing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fetchedAssets: Asset[] = [];
      for (const id of assetIdsToFetch) {
        const asset = await getAssetById(authenticatedFetch, id);
        fetchedAssets.push(asset);
      }
      setAssetsToPrint(fetchedAssets);
      if (fetchedAssets.length === 0) {
        setError('Could not fetch any of the selected assets.');
      }
    } catch (err) {
      console.error(`Failed to fetch assets:`, err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`Could not fetch assets: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [assetIdsToFetch, authenticatedFetch]);

  useEffect(() => {
    if (assetIdsToFetch.length > 0) {
      fetchAssetsForPrint();
    } else {
      setError('No Asset IDs specified.');
      setLoading(false);
    }
  }, [fetchAssetsForPrint, assetIdsToFetch]);

  useEffect(() => {
    if (
      !loading &&
      !error &&
      assetsToPrint.length > 0 &&
      autoPrint &&
      componentRef.current
    ) {
      handleAssetPrintTrigger();
      navigate(location.pathname, {
        replace: true,
        state: { ...state, autoPrint: false },
      });
    }
  }, [
    autoPrint,
    loading,
    error,
    assetsToPrint,
    handleAssetPrintTrigger,
    navigate,
    location.pathname,
    state,
  ]);

  const BackButton: React.FC<ButtonProps> = (props) => (
    <Button
      variant="contained"
      color="primary"
      onClick={() => navigate('/assets')}
      startIcon={<ArrowBackIcon />}
      {...props}
    >
      Back to Assets
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

  if (assetsToPrint.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Asset data not available for printing.</Alert>
        {!autoPrint && <BackButton sx={{ mt: 2 }} />}
      </Box>
    );
  }

  const printContent = (
    <>
      {!autoPrint && (
        <Box
          className="no-print"
          sx={{
            position: 'fixed',
            top: 80,
            left: SIDEBAR_WIDTH,
            width: `calc(100vw - ${SIDEBAR_WIDTH}px)`,
            display: 'flex',
            justifyContent: 'space-between',
            zIndex: theme.zIndex.drawer + 1,
            padding: '0 20px',
            boxSizing: 'border-box',
          }}
        >
          <BackButton />
          <Button
            variant="contained"
            color="primary"
            onClick={handleAssetPrintTrigger}
            startIcon={<PrintIcon />}
          >
            Print
          </Button>
        </Box>
      )}
      <Box
        ref={componentRef}
        className="print-container printable-content"
        sx={{
          maxWidth: '80%',
          marginTop: '64px',
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
        {assetsToPrint.map((asset) => (
          <Paper
            key={asset.id}
            sx={{ p: { xs: 2, md: 3 }, pageBreakAfter: 'always' }}
            elevation={0}
            id={`asset-print-${asset.id}`}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography variant="h5" component="h1">
                Asset Details: {asset.asset_tag}
              </Typography>
              <Chip
                label={asset.status.replace(/_/g, ' ')}
                color={getAssetStatusChipColor(asset.status)}
                size="small"
              />
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ fontWeight: 'bold' }}
                >
                  Asset Information
                </Typography>
                <Typography>
                  <strong>Name:</strong> {asset.name}
                </Typography>
                <Typography>
                  <strong>Serial Number:</strong> {asset.serial_number || 'N/A'}
                </Typography>
                <Typography>
                  <strong>Category:</strong> {asset.category?.name || 'N/A'}
                </Typography>
                <Typography>
                  <strong>Location:</strong> {asset.location?.name || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ fontWeight: 'bold' }}
                >
                  Details
                </Typography>
                <Typography>
                  <strong>Vendor:</strong> {asset.vendor?.name || 'N/A'}
                </Typography>
                <Typography>
                  <strong>Assigned To:</strong>{' '}
                  {asset.assigned_to?.username || 'Unassigned'}
                </Typography>
                <Typography>
                  <strong>Purchase Date:</strong>{' '}
                  {formatDateString(asset.purchase_date)}
                </Typography>
                <Typography>
                  <strong>Warranty End Date:</strong>{' '}
                  {formatDateString(asset.warranty_end_date)}
                </Typography>
              </Grid>

              {asset.description && (
                <Grid item xs={12} sx={{ mt: 1 }}>
                  <Divider sx={{ mb: 1 }} />
                  <Typography
                    variant="subtitle1"
                    gutterBottom
                    sx={{ fontWeight: 'bold' }}
                  >
                    Description
                  </Typography>
                  <Typography sx={{ whiteSpace: 'pre-line' }}>
                    {asset.description}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12} sx={{ mt: 1 }}>
                <Divider sx={{ mb: 1 }} />
                <Typography variant="caption" color="textSecondary">
                  Created At: {formatDateString(asset.created_at)}
                </Typography>
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ ml: 2 }}
                >
                  Last Updated: {formatDateString(asset.updated_at)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        ))}
      </Box>
    </>
  );

  return printContent;
};

export default AssetPrintView;
