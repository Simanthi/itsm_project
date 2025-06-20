// itsm_frontend/src/modules/service-requests/pages/PrintPreviewPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Container,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Print as PrintIcon } from '@mui/icons-material';
import { useAuth } from '../../../context/auth/AuthContext';
import { getServiceRequestById } from '../../../api/serviceRequestApi';
import { type ServiceRequest } from '../types/ServiceRequestTypes';
import {
  Template1Standard,
  Template2Compact,
  Template3UserSlip,
  Template4Technical,
  Template5Modern
} from '../components/print-templates'; // Import actual templates

interface PrintPreviewLocationState {
  selectedRequestIds: string[];
  autoPrint?: boolean;
}

// Mock company details - these would ideally come from config or context
const mockCompanyDetails = {
  name: 'Your Company Name LLC',
  address: '123 Main Street, Anytown, USA 12345',
  logoUrl: '/images/sblt_fav_icon.png', // Replace with your actual logo path
};

const PrintPreviewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location as { state: PrintPreviewLocationState | null };
  const { authenticatedFetch } = useAuth();

  const [selectedTemplate, setSelectedTemplate] = useState<string>('template1');
  const [requestsData, setRequestsData] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const printContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state || !state.selectedRequestIds || state.selectedRequestIds.length === 0) {
      setError('No service requests selected for preview.');
      setLoading(false);
      return;
    }
    if (!authenticatedFetch) {
      setError('Authentication context not available.');
      setLoading(false);
      return;
    }

    const fetchRequests = async () => {
      setLoading(true);
      try {
        const fetchedRequests = await Promise.all(
          state.selectedRequestIds.map(id => getServiceRequestById(authenticatedFetch, id))
        );
        setRequestsData(fetchedRequests.filter(r => r !== null) as ServiceRequest[]);
        setError(null);
        if (fetchedRequests.some(r => r === null)) {
            console.warn("Some selected requests could not be fetched.");
            // Optionally set an error message part here
        }
      } catch (err) {
        console.error('Failed to fetch service request details for printing:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [state, authenticatedFetch]);

  useEffect(() => {
    if (state?.autoPrint && requestsData.length > 0 && !loading && !error) {
      // Ensure content is rendered before printing
      setTimeout(handlePrint, 500); // Small delay to allow rendering
    }
  }, [state?.autoPrint, requestsData, loading, error]);


  const handlePrint = () => {
    const content = printContentRef.current;
    if (content) {
      const printWindow = window.open('', '_blank');
      printWindow?.document.write('<html><head><title>Print Service Request</title>');
      // TODO: Add print-specific stylesheets here if needed
      // For example: printWindow?.document.write('<link rel="stylesheet" href="/path/to/print.css" type="text/css" media="print">');
      printWindow?.document.write('</head><body>');
      printWindow?.document.write(content.innerHTML);
      printWindow?.document.write('</body></html>');
      printWindow?.document.close();
      printWindow?.focus();
      printWindow?.print();
      // printWindow?.close(); // Some browsers block this
    } else {
      console.error("Print content ref not found");
      // Show a snackbar error ideally
    }
  };

  const renderTemplate = () => {
    if (requestsData.length === 0) return <Typography>No request data to display.</Typography>;

    // For now, previewing the first selected request.
    // When printing, all requestsData will be iterated over in the print handler or template.
    const requestToPreview = requestsData[0];

    // This will be replaced by actual template components in the next step
    switch (selectedTemplate) {
      case 'template1':
        return <Template1Standard request={requestToPreview} companyDetails={mockCompanyDetails} />;
      case 'template2':
        return <Template2Compact request={requestToPreview} companyDetails={mockCompanyDetails} />;
      case 'template3':
        return <Template3UserSlip request={requestToPreview} companyDetails={mockCompanyDetails} />;
      case 'template4':
        return <Template4Technical request={requestToPreview} companyDetails={mockCompanyDetails} />;
      case 'template5':
        return <Template5Modern request={requestToPreview} companyDetails={mockCompanyDetails} />;
      default:
        return <Typography>Select a template to see the preview.</Typography>;
    }
  };

  const renderTemplateForRequest = (request: ServiceRequest) => {
    switch (selectedTemplate) {
      case 'template1':
        return <Template1Standard request={request} companyDetails={mockCompanyDetails} />;
      case 'template2':
        return <Template2Compact request={request} companyDetails={mockCompanyDetails} />;
      case 'template3':
        return <Template3UserSlip request={request} companyDetails={mockCompanyDetails} />;
      case 'template4':
        return <Template4Technical request={request} companyDetails={mockCompanyDetails} />;
      case 'template5':
        return <Template5Modern request={request} companyDetails={mockCompanyDetails} />;
      default:
        return <Typography>Error rendering template for {request.request_id}</Typography>;
    }
  }

  // Styles for print-only content
  const printOnlyStyles = `
    @media print {
      body * {
        visibility: hidden;
      }
      .printable-area, .printable-area * {
        visibility: visible;
      }
      .printable-area {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      /* Add any other print specific styles here, like page breaks */
       .print-page-break {
        page-break-after: always;
      }
    }
  `;


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)' }}>
        <CircularProgress /> <Typography sx={{ml: 2}}>Loading print preview...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{pt: 3}}>
        <Alert severity="error">{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Container>
    );
  }

  if (requestsData.length === 0 && !loading) {
    return (
       <Container sx={{pt: 3}}>
        <Alert severity="warning">No valid service requests found to preview.</Alert>
         <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          Go Back
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <style>{printOnlyStyles}</style>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => navigate(-1)} aria-label="back">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 2 }}>
            Print Preview
          </Typography>
          <FormControl size="small" sx={{ m: 1, minWidth: 200, mr: 2, backgroundColor: 'white' }}>
            <InputLabel id="template-select-label">Select Template</InputLabel>
            <Select
              labelId="template-select-label"
              value={selectedTemplate}
              label="Select Template"
              onChange={(e) => setSelectedTemplate(e.target.value as string)}
            >
              <MenuItem value="template1">Standard Detailed</MenuItem>
              <MenuItem value="template2">Compact Summary</MenuItem>
              <MenuItem value="template3">User-Facing Slip</MenuItem>
              <MenuItem value="template4">Technical Log</MenuItem>
              <MenuItem value="template5">Minimalist Modern</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            disabled={requestsData.length === 0}
          >
            Print
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3, backgroundColor: 'grey.200', display: 'flex', justifyContent: 'center' }}>
        {/* This div is what will actually be printed */}
        <div ref={printContentRef} className="printable-area">
          {requestsData.map((request, index) => (
            <Box key={request.id} className={index < requestsData.length -1 ? "print-page-break" : ""}>
              {/*
                This is a simplified rendering for multiple items.
                Ideally, each template component would handle its own layout.
                For now, we're just rendering the selected template component for each request.
                The `renderTemplate` function needs to be adapted if we want it to render a *specific* request
                when multiple are loaded, or the template components themselves need to accept a request prop.
                The `renderTemplateForRequest` function now handles this.
              */}
              {renderTemplateForRequest(request)}
            </Box>
          ))}
        </div>
         {/* The live preview area (non-printing part of UI) shows only the first request */}
        <Box sx={{ width: '210mm', margin: '0 auto', // Centers the preview in the available space
              '@media print': { display: 'none'} // Hide this specific preview box when printing the whole page
            }}>
           {requestsData.length > 0 && renderTemplateForRequest(requestsData[0])}
        </Box>
      </Box>
    </Box>
  );
};

export default PrintPreviewPage;
