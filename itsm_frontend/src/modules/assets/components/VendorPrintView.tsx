import React, { useEffect, useState, useRef } from 'react';
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
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import type { Vendor } from '../types';
import { type ButtonProps } from '@mui/material/Button';

interface LocationState {
  selectedVendors?: Vendor[];
  vendorData?: Vendor;
  autoPrint?: boolean;
}

const SIDEBAR_WIDTH = 240;

const VendorPrintView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  const state = location.state as LocationState | null;
  const autoPrint = state?.autoPrint || false;

  const [vendorsToPrint, setVendorsToPrint] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const componentRef = useRef<HTMLDivElement>(null);

  // FIX: Use correct prop name 'contentRef' instead of 'content'
  const handleVendorPrint = useReactToPrint({
    contentRef: componentRef,
  });

  useEffect(() => {
    let dataToSet: Vendor[] = [];
    if (state?.selectedVendors && state.selectedVendors.length > 0) {
      dataToSet = state.selectedVendors;
    } else if (state?.vendorData) {
      dataToSet = [state.vendorData];
    }

    if (dataToSet.length > 0) {
      setVendorsToPrint(dataToSet);
    } else {
      setError('No Vendor data provided for printing.');
    }
    setLoading(false);
  }, [state]);

  useEffect(() => {
    if (
      !loading &&
      !error &&
      vendorsToPrint.length > 0 &&
      autoPrint &&
      componentRef.current
    ) {
      handleVendorPrint();
      navigate(location.pathname, {
        replace: true,
        state: { ...state, autoPrint: false },
      });
    }
  }, [
    autoPrint,
    loading,
    error,
    vendorsToPrint,
    handleVendorPrint,
    navigate,
    location.pathname,
    state,
  ]);

  const BackButton: React.FC<ButtonProps> = (props) => (
    <Button
      variant="contained"
      color="primary"
      onClick={() => navigate('/assets', { state: { initialTab: 3 } })}
      startIcon={<ArrowBackIcon />}
      {...props}
    >
      Back to Asset Management
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

  if (vendorsToPrint.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Vendor data not available for printing.</Alert>
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
            onClick={handleVendorPrint}
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
        {vendorsToPrint.map((vendor) => (
          <Paper
            key={vendor.id}
            sx={{ p: { xs: 2, md: 3 }, pageBreakAfter: 'always' }}
            elevation={0}
            id={`vendor-print-${vendor.id}`}
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
                Asset Vendor: {vendor.name}
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ fontWeight: 'bold' }}
                >
                  Details
                </Typography>
                <Typography>
                  <strong>ID:</strong> {vendor.id}
                </Typography>
                <Typography>
                  <strong>Name:</strong> {vendor.name}
                </Typography>
                {vendor.contact_person && (
                  <Typography>
                    <strong>Contact Person:</strong> {vendor.contact_person}
                  </Typography>
                )}
                {vendor.email && (
                  <Typography>
                    <strong>Email:</strong> {vendor.email}
                  </Typography>
                )}
                {vendor.phone_number && (
                  <Typography>
                    <strong>Phone:</strong> {vendor.phone_number}
                  </Typography>
                )}
                {vendor.address && (
                  <>
                    <Typography mt={1}>
                      <strong>Address:</strong>
                    </Typography>
                    <Typography sx={{ whiteSpace: 'pre-line' }}>
                      {vendor.address}
                    </Typography>
                  </>
                )}
              </Grid>
            </Grid>
          </Paper>
        ))}
      </Box>
    </>
  );

  return printContent;
};

export default VendorPrintView;
