import React, { useEffect, useState, useRef } from 'react'; // Added useRef
// import ReactDOM from 'react-dom'; // Removed ReactDOM
import { useLocation, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print'; // Added useReactToPrint
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
import { useTheme } from '@mui/material/styles'; // Reverted to original
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
// No API calls needed if data is passed via state
// import { useAuth } from '../../../context/auth/useAuth';
import type { AssetCategory } from '../types';
import { type ButtonProps } from '@mui/material/Button';

interface LocationState {
  selectedCategories?: AssetCategory[]; // Expecting an array of full AssetCategory objects
  categoryData?: AssetCategory; // Single AssetCategory object
  autoPrint?: boolean;
}

const SIDEBAR_WIDTH = 240;

const CategoryPrintView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // const { authenticatedFetch } = useAuth(); // Not needed if data passed via state
  const theme = useTheme();

  const state = location.state as LocationState | null;
  const autoPrint = state?.autoPrint || false;

  const [categoriesToPrint, setCategoriesToPrint] = useState<AssetCategory[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(false); // Initially false as no fetching
  const [error, setError] = useState<string | null>(null);
  // const [printRootElement, setPrintRootElement] = useState<HTMLElement | null>(null); // Removed state
  const componentRef = useRef<HTMLDivElement>(null); // Added componentRef

  const handleCategoryPrint = useReactToPrint({ // Renamed for clarity
    contentRef: componentRef,
  });

  // useEffect(() => { // Removed useEffect for print-root
  //   const element = document.getElementById('print-root');
  //   if (element) setPrintRootElement(element);
  //   else {
  //     console.error('Print root element #print-root not found.');
  //     setError('Print functionality not initialized.');
  //   }
  // }, []);

  useEffect(() => {
    // Directly use data from location.state
    let categoriesData: AssetCategory[] = [];
    if (state?.selectedCategories && state.selectedCategories.length > 0) {
      categoriesData = state.selectedCategories;
    } else if (state?.categoryData) {
      categoriesData = [state.categoryData];
    }

    if (categoriesData.length > 0) {
      setCategoriesToPrint(categoriesData);
    } else {
      setError('No Category data provided for printing.');
    }
    setLoading(false); // Data is processed, stop loading
  }, [state]);

  useEffect(() => {
    if (
      !loading &&
      !error &&
      categoriesToPrint.length > 0 &&
      autoPrint &&
      componentRef.current // Check if componentRef is populated
    ) {
      handleCategoryPrint(); // Call the new print handler
      // Reset autoPrint state in navigation
      navigate(location.pathname, {
        replace: true,
        state: { ...state, autoPrint: false },
      });
    }
  }, [
    autoPrint,
    loading,
    error,
    categoriesToPrint,
    handleCategoryPrint, // Added new handler
    navigate,
    location.pathname,
    state,
  ]);

  const BackButton: React.FC<ButtonProps> = (props) => (
    <Button
      variant="contained"
      color="primary"
      onClick={() => navigate('/assets', { state: { initialTab: 1 } })} // Navigate to AssetsPage, assume Categories is tab 1
      startIcon={<ArrowBackIcon />}
      {...props}
    >
      Back to Asset Management
    </Button>
  );

  if (loading) {
    // Should be brief if no fetching
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

  if (categoriesToPrint.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Category data not available for printing.</Alert>
        {!autoPrint && <BackButton sx={{ mt: 2 }} />}
      </Box>
    );
  }

  const printContent = (
    <>
      {!autoPrint && (
        <Box
          className="no-print" // Added no-print class
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
            onClick={handleCategoryPrint} // Use new print handler
            startIcon={<PrintIcon />}
          >
            Print
          </Button>
        </Box>
      )}
      <Box
        ref={componentRef} // Added ref
        className="print-container printable-content" // Added printable-content class
        sx={{
          maxWidth: '80%',
          marginTop: '64px', // autoPrint ? '0' : '64px', // Default margin for preview
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
        {categoriesToPrint.map((category) => (
          <Paper
            key={category.id}
            sx={{ p: { xs: 2, md: 3 }, pageBreakAfter: 'always' }}
            elevation={0}
            id={`category-print-${category.id}`}
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
                Asset Category: {category.name}
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
                  <strong>ID:</strong> {category.id}
                </Typography>
                <Typography>
                  <strong>Name:</strong> {category.name}
                </Typography>
                {category.description && (
                  <>
                    <Typography mt={1}>
                      <strong>Description:</strong>
                    </Typography>
                    <Typography sx={{ whiteSpace: 'pre-line' }}>
                      {category.description}
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

  // return autoPrint && printRootElement // Removed portal logic
  //   ? ReactDOM.createPortal(printContent, printRootElement)
  //   : printContent;
  return printContent; // Return content directly
};

export default CategoryPrintView;
