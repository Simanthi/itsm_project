import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
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
import type { Location as AssetLocation } from '../types'; // Updated type import
import { type ButtonProps } from '@mui/material/Button';

interface LocationState {
  selectedLocations?: AssetLocation[]; // Expecting an array of full AssetLocation objects
  locationData?: AssetLocation; // Single AssetLocation object
  autoPrint?: boolean;
}

const SIDEBAR_WIDTH = 240;

const LocationPrintView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();

  const state = location.state as LocationState | null;
  const autoPrint = state?.autoPrint || false;

  const [locationsToPrint, setLocationsToPrint] = useState<AssetLocation[]>([]);
  const [loading, setLoading] = useState<boolean>(false); // Initially false as no fetching
  const [error, setError] = useState<string | null>(null);
  const [printRootElement, setPrintRootElement] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    const element = document.getElementById('print-root');
    if (element) setPrintRootElement(element);
    else {
      console.error('Print root element #print-root not found.');
      setError('Print functionality not initialized.');
    }
  }, []);

  useEffect(() => {
    // Directly use data from location.state
    let locationsData: AssetLocation[] = [];
    if (state?.selectedLocations && state.selectedLocations.length > 0) {
      locationsData = state.selectedLocations;
    } else if (state?.locationData) {
      locationsData = [state.locationData];
    }

    if (locationsData.length > 0) {
      setLocationsToPrint(locationsData);
    } else {
      setError('No Location data provided for printing.');
    }
    setLoading(false); // Data is processed, stop loading
  }, [state]);

  useEffect(() => {
    if (
      !loading &&
      !error &&
      locationsToPrint.length > 0 &&
      autoPrint &&
      printRootElement
    ) {
      printRootElement.style.display = 'block';
      const timer = setTimeout(() => {
        window.print();
        printRootElement.style.display = 'none';
        navigate(location.pathname, {
          replace: true,
          state: { ...state, autoPrint: false },
        });
      }, 500);
      return () => {
        clearTimeout(timer);
        if (printRootElement) printRootElement.style.display = 'none';
      };
    }
  }, [
    loading,
    error,
    locationsToPrint,
    autoPrint,
    navigate,
    printRootElement,
    location.pathname,
    state,
  ]);

  const BackButton: React.FC<ButtonProps> = (props) => (
    <Button
      variant="contained"
      color="primary"
      onClick={() => navigate('/assets', { state: { initialTab: 2 } })} // Navigate to AssetsPage, assume Locations is tab 2
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

  if (locationsToPrint.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Location data not available for printing.</Alert>
        {!autoPrint && <BackButton sx={{ mt: 2 }} />}
      </Box>
    );
  }

  const printContent = (
    <>
      {!autoPrint && (
        <Box
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
            onClick={() =>
              navigate(location.pathname, {
                replace: true,
                state: { ...state, autoPrint: true },
              })
            }
            startIcon={<PrintIcon />}
          >
            Print
          </Button>
        </Box>
      )}
      <Box
        className="print-container"
        sx={{
          maxWidth: '80%',
          marginTop: autoPrint ? '0' : '64px',
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
        {locationsToPrint.map(
          (
            loc, // Changed variable name to loc
          ) => (
            <Paper
              key={loc.id}
              sx={{ p: { xs: 2, md: 3 }, pageBreakAfter: 'always' }}
              elevation={0}
              id={`location-print-${loc.id}`}
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
                  Asset Location: {loc.name}
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
                    <strong>ID:</strong> {loc.id}
                  </Typography>
                  <Typography>
                    <strong>Name:</strong> {loc.name}
                  </Typography>
                  {loc.description && (
                    <>
                      <Typography mt={1}>
                        <strong>Description:</strong>
                      </Typography>
                      <Typography sx={{ whiteSpace: 'pre-line' }}>
                        {loc.description}
                      </Typography>
                    </>
                  )}
                </Grid>
              </Grid>
            </Paper>
          ),
        )}
      </Box>
    </>
  );

  return autoPrint && printRootElement
    ? ReactDOM.createPortal(printContent, printRootElement)
    : printContent;
};

export default LocationPrintView;
