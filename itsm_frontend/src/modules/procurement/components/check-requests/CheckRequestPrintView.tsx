import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  Grid, // Added for layout
  Paper, // Added for layout
  Divider, // Added for layout
  Chip, // Added for layout
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getCheckRequestById } from '../../../../api/procurementApi';
import { useAuth } from '../../../../context/auth/useAuth';
import type { CheckRequest, CheckRequestStatus, PaymentMethod } from '../../types'; // Adjusted type import
import { type ButtonProps } from '@mui/material/Button';

// Helper to format date strings
const formatDateString = (isoString: string | null | undefined): string => {
  if (!isoString) return 'N/A';
  if (isoString.length === 10 && isoString.includes('-')) {
    return new Date(isoString + 'T00:00:00').toLocaleDateString();
  }
  return new Date(isoString).toLocaleString();
};

// Helper to format currency
const formatCurrency = (amount: string | number | null | undefined): string => {
  if (amount == null || amount === '') return '-';
  return `$${Number(amount).toFixed(2)}`;
};

// Status chip color logic
const getStatusChipColor = (status?: CheckRequestStatus) => {
    if (!status) return 'default';
    const mapping: Record<CheckRequestStatus, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
        pending_submission: 'default',
        pending_approval: 'warning',
        approved: 'success',
        rejected: 'error',
        payment_processing: 'info',
        paid: 'primary',
        cancelled: 'default',
    };
    return mapping[status] || 'default';
};

const formatPaymentMethod = (method?: PaymentMethod | null): string => {
    if (!method) return 'N/A';
    const mapping: Record<PaymentMethod, string> = {
        check: 'Check',
        ach: 'ACH Transfer',
        wire: 'Wire Transfer',
        cash: 'Cash',
        credit_card: 'Credit Card',
        other: 'Other',
    };
    return mapping[method] || 'N/A';
};


interface LocationState {
  checkRequestId: number; // Expecting a single ID
  autoPrint?: boolean;
}

const SIDEBAR_WIDTH = 240;

const CheckRequestPrintView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { authenticatedFetch } = useAuth();
  const theme = useTheme();

  const { checkRequestId, autoPrint } =
    (location.state as LocationState) || {
      checkRequestId: 0, // Default or handle error if not provided
      autoPrint: false,
    };

  const [currentCheckRequest, setCurrentCheckRequest] = useState<CheckRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [printRootElement, setPrintRootElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const element = document.getElementById('print-root');
    if (element) {
      setPrintRootElement(element);
    } else {
      console.error('Print root element #print-root not found. Print functionality may not work.');
      setError('Print functionality not initialized. Missing #print-root element.');
      setLoading(false);
    }
  }, []);

  const fetchCheckRequestForPrint = useCallback(async () => {
    if (!authenticatedFetch) {
      setError('Authentication context not available. Please log in.');
      setLoading(false);
      return;
    }
    if (!checkRequestId) {
      setError('No Check Request ID provided for printing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const request = await getCheckRequestById(authenticatedFetch, checkRequestId);
      setCurrentCheckRequest(request);
    } catch (err) {
      console.error(`Failed to fetch check request ${checkRequestId}:`, err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`Could not fetch check request: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [checkRequestId, authenticatedFetch]);

  useEffect(() => {
    if (checkRequestId > 0) {
        fetchCheckRequestForPrint();
    } else {
        setError('Invalid Check Request ID.');
        setLoading(false);
    }
  }, [fetchCheckRequestForPrint, checkRequestId]);

  useEffect(() => {
    if (!loading && !error && currentCheckRequest && autoPrint && printRootElement) {
      printRootElement.style.display = 'block';
      const timer = setTimeout(() => {
        window.print();
        printRootElement.style.display = 'none';
        navigate(location.pathname, {
          replace: true,
          state: { checkRequestId: checkRequestId, autoPrint: false },
        });
      }, 500);
      return () => {
        clearTimeout(timer);
        if (printRootElement) printRootElement.style.display = 'none';
      };
    }
  }, [loading, error, currentCheckRequest, autoPrint, navigate, printRootElement, location.pathname, checkRequestId]);

  const BackButton: React.FC<ButtonProps> = (props) => (
    <Button
      variant="contained"
      color="primary"
      onClick={() => navigate('/procurement/check-requests')} // Adjusted back path
      startIcon={<ArrowBackIcon />}
      {...props}
    >
      Back to Check Requests
    </Button>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column' }}>
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

  if (!currentCheckRequest) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Check Request data not available for printing.</Alert>
        {!autoPrint && <BackButton sx={{ mt: 2 }} />}
      </Box>
    );
  }

  const printContent = (
    <>
      {!autoPrint && (
        <Box
          sx={{
            position: 'fixed', top: 80, left: SIDEBAR_WIDTH,
            width: `calc(100vw - ${SIDEBAR_WIDTH}px)`, display: 'flex',
            justifyContent: 'space-between', zIndex: theme.zIndex.drawer + 1,
            padding: '0 20px', boxSizing: 'border-box',
          }}
        >
          <BackButton />
          <Button
            variant="contained" color="primary"
            onClick={() => navigate(location.pathname, { replace: true, state: { checkRequestId: checkRequestId, autoPrint: true }})}
            startIcon={<PrintIcon />}
          >
            Print
          </Button>
        </Box>
      )}
      <Box
        className="print-container"
        sx={{
          maxWidth: '80%', marginTop: autoPrint ? '0' : '64px', marginBottom: '30px',
          marginLeft: 'auto', marginRight: 'auto', padding: '30px',
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`, boxShadow: theme.shadows[1],
          minHeight: 'calc(1122px - 60px)', boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column', gap: '20px',
          borderRadius: theme.shape.borderRadius || 4,
        }}
      >
        <Paper sx={{ p: { xs: 2, md: 3 } }} elevation={0} id={`check-request-detail-print-${currentCheckRequest.id}`}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h1">
              Check Request: CR-{currentCheckRequest.id}
            </Typography>
            <Chip label={currentCheckRequest.status.replace(/_/g, ' ')} color={getStatusChipColor(currentCheckRequest.status)} size="small" />
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Request Information</Typography>
              <Typography><strong>Requested By:</strong> {currentCheckRequest.requested_by_username}</Typography>
              <Typography><strong>Request Date:</strong> {formatDateString(currentCheckRequest.request_date)}</Typography>
              <Typography mt={1}><strong>Reason for Payment:</strong></Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap', pl:0 }}>{currentCheckRequest.reason_for_payment}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Payment Details</Typography>
              <Typography><strong>Payee Name:</strong> {currentCheckRequest.payee_name}</Typography>
              <Typography><strong>Amount:</strong> {formatCurrency(currentCheckRequest.amount)}</Typography>
              {currentCheckRequest.purchase_order_number && <Typography><strong>PO Number:</strong> {currentCheckRequest.purchase_order_number}</Typography>}
              {currentCheckRequest.invoice_number && <Typography><strong>Invoice Number:</strong> {currentCheckRequest.invoice_number}</Typography>}
              {currentCheckRequest.invoice_date && <Typography><strong>Invoice Date:</strong> {formatDateString(currentCheckRequest.invoice_date)}</Typography>}
              {currentCheckRequest.payee_address && <><Typography mt={1}><strong>Payee Address:</strong></Typography><Typography sx={{ whiteSpace: 'pre-wrap', pl:0 }}>{currentCheckRequest.payee_address}</Typography></>}
            </Grid>
            {(currentCheckRequest.status !== 'pending_submission' && currentCheckRequest.status !== 'cancelled') && (
              <>
                <Grid item xs={12}><Divider sx={{ my: 2 }} /></Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Approval & Processing</Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={12} md={6}>
                      <Typography><strong>Approved By (Accounts):</strong> {currentCheckRequest.approved_by_accounts_username || 'N/A'}</Typography>
                      <Typography><strong>Accounts Approval Date:</strong> {formatDateString(currentCheckRequest.accounts_approval_date)}</Typography>
                      {currentCheckRequest.accounts_comments && <><Typography mt={1}><strong>Accounts Comments:</strong></Typography><Typography sx={{ whiteSpace: 'pre-wrap', pl:0 }}>{currentCheckRequest.accounts_comments}</Typography></>}
                    </Grid>
                    {(currentCheckRequest.status === 'paid' || currentCheckRequest.status === 'payment_processing') && (
                    <Grid item xs={12} md={6}>
                      <Typography><strong>Payment Method:</strong> {formatPaymentMethod(currentCheckRequest.payment_method)}</Typography>
                      <Typography><strong>Payment Date:</strong> {formatDateString(currentCheckRequest.payment_date)}</Typography>
                      <Typography><strong>Transaction ID/Check #:</strong> {currentCheckRequest.transaction_id || 'N/A'}</Typography>
                      {currentCheckRequest.payment_notes && <><Typography mt={1}><strong>Payment Notes:</strong></Typography><Typography sx={{ whiteSpace: 'pre-wrap', pl:0 }}>{currentCheckRequest.payment_notes}</Typography></>}
                    </Grid>
                    )}
                  </Grid>
                </Grid>
              </>
            )}
          </Grid>
        </Paper>
      </Box>
    </>
  );

  return autoPrint && printRootElement
    ? ReactDOM.createPortal(printContent, printRootElement)
    : printContent;
};

export default CheckRequestPrintView;
