import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'; // Add useRef
// import ReactDOM from 'react-dom'; // Remove ReactDOM
import { useLocation, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print'; // Add useReactToPrint
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
import { useTheme } from '@mui/material/styles'; // Reverted to original
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getCheckRequestById } from '../../../../api/procurementApi';
import { useAuth } from '../../../../context/auth/useAuth';
import type {
  CheckRequest,
  CheckRequestStatus,
  PaymentMethod,
} from '../../types';
import { type ButtonProps } from '@mui/material/Button';

const formatDateString = (isoString: string | null | undefined): string => {
  if (!isoString) return 'N/A';
  if (isoString.length === 10 && isoString.includes('-')) {
    return new Date(isoString + 'T00:00:00').toLocaleDateString();
  }
  return new Date(isoString).toLocaleString();
};

const formatCurrency = (amount: string | number | null | undefined): string => {
  if (amount == null || amount === '') return '-';
  return `$${Number(amount).toFixed(2)}`;
};

const getStatusChipColor = (status?: CheckRequestStatus) => {
  if (!status) return 'default';
  const mapping: Record<
    CheckRequestStatus,
    | 'default'
    | 'primary'
    | 'secondary'
    | 'error'
    | 'info'
    | 'success'
    | 'warning'
  > = {
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
  selectedCheckRequestIds?: number[];
  checkRequestId?: number;
  autoPrint?: boolean;
}

const SIDEBAR_WIDTH = 240;

const CheckRequestPrintView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { authenticatedFetch } = useAuth();
  const theme = useTheme();

  const state = location.state as LocationState | null;
  const autoPrint = state?.autoPrint || false;

  // Accept either a single ID or an array of IDs
  const idsToFetch = useMemo(() => {
    let ids: number[] = [];
    if (
      state?.selectedCheckRequestIds &&
      state.selectedCheckRequestIds.length > 0
    ) {
      ids = state.selectedCheckRequestIds;
    } else if (state?.checkRequestId) {
      ids = [state.checkRequestId];
    }
    return ids;
  }, [state]);

  const [requests, setRequests] = useState<CheckRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // const [printRootElement, setPrintRootElement] = useState<HTMLElement | null>(null); // Remove state
  const componentRef = useRef<HTMLDivElement>(null); // Add componentRef

  const handleCheckRequestPrint = useReactToPrint({ // Renamed for clarity
    contentRef: componentRef,
  });

  // useEffect(() => { // Remove useEffect for print-root
  //   const element = document.getElementById('print-root');
  //   if (element) setPrintRootElement(element);
  //   else {
  //     setError(
  //       'Print functionality not initialized. Missing #print-root element.',
  //     );
  //     setLoading(false);
  //   }
  // }, []);

  // Fetch all selected requests (sequentially, like in PurchaseRequestMemoPrintView)
  const fetchRequests = useCallback(async () => {
    if (!authenticatedFetch) {
      setError('Authentication context not available. Please log in.');
      setLoading(false);
      return;
    }
    if (!Array.isArray(idsToFetch) || idsToFetch.length === 0) {
      setError('No Check Request ID(s) provided for printing.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fetchedRequests: CheckRequest[] = [];
      for (const id of idsToFetch) {
        const req = await getCheckRequestById(authenticatedFetch, id);
        fetchedRequests.push(req);
      }
      setRequests(fetchedRequests);
      if (fetchedRequests.length === 0) {
        setError('Could not fetch any of the selected Check Requests.');
      }
    } catch (err) {
      console.error('Failed to fetch Check Requests:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`Could not fetch Check Requests: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [idsToFetch, authenticatedFetch]);

  useEffect(() => {
    if (idsToFetch.length > 0) {
      fetchRequests();
    } else {
      setError('No Check Request IDs specified.');
      setLoading(false);
    }
  }, [fetchRequests, idsToFetch]);

  useEffect(() => {
    if (
      !loading &&
      !error &&
      requests.length > 0 &&
      autoPrint &&
      componentRef.current // Check if componentRef is populated
    ) {
      handleCheckRequestPrint(); // Call the new print handler
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
    requests,
    handleCheckRequestPrint, // Added new handler
    navigate,
    location.pathname,
    state,
  ]);

  const BackButton: React.FC<ButtonProps> = (props) => (
    <Button
      variant="contained"
      color="primary"
      onClick={() => navigate('/procurement/check-requests')}
      startIcon={<ArrowBackIcon />}
      {...props}
    >
      Back to Check Requests
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

  if (requests.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          Check Request data not available for printing.
        </Alert>
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
            onClick={handleCheckRequestPrint} // Use new print handler
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
          gap: '40px',
          borderRadius: theme.shape.borderRadius || 4,
        }}
      >
        {requests.map((currentCheckRequest) => (
          <Paper
            sx={{ p: { xs: 2, md: 3 }, pageBreakAfter: 'always' }}
            elevation={0}
            id={`check-request-detail-print-${currentCheckRequest.id}`}
            key={currentCheckRequest.id}
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
                Check Request: CR-{currentCheckRequest.id}
              </Typography>
              <Chip
                label={currentCheckRequest.status.replace(/_/g, ' ')}
                color={getStatusChipColor(currentCheckRequest.status)}
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
                  Request Information
                </Typography>
                <Typography>
                  <strong>Requested By:</strong>{' '}
                  {currentCheckRequest.requested_by_username}
                </Typography>
                <Typography>
                  <strong>Request Date:</strong>{' '}
                  {formatDateString(currentCheckRequest.request_date)}
                </Typography>
                <Typography mt={1}>
                  <strong>Reason for Payment:</strong>
                </Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap', pl: 0 }}>
                  {currentCheckRequest.reason_for_payment}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ fontWeight: 'bold' }}
                >
                  Payment Details
                </Typography>
                <Typography>
                  <strong>Payee Name:</strong> {currentCheckRequest.payee_name}
                </Typography>
                <Typography>
                  <strong>Amount:</strong>{' '}
                  {formatCurrency(currentCheckRequest.amount)}
                </Typography>
                {currentCheckRequest.purchase_order_number && (
                  <Typography>
                    <strong>PO Number:</strong>{' '}
                    {currentCheckRequest.purchase_order_number}
                  </Typography>
                )}
                {currentCheckRequest.invoice_number && (
                  <Typography>
                    <strong>Invoice Number:</strong>{' '}
                    {currentCheckRequest.invoice_number}
                  </Typography>
                )}
                {currentCheckRequest.invoice_date && (
                  <Typography>
                    <strong>Invoice Date:</strong>{' '}
                    {formatDateString(currentCheckRequest.invoice_date)}
                  </Typography>
                )}
                {currentCheckRequest.payee_address && (
                  <>
                    <Typography mt={1}>
                      <strong>Payee Address:</strong>
                    </Typography>
                    <Typography sx={{ whiteSpace: 'pre-wrap', pl: 0 }}>
                      {currentCheckRequest.payee_address}
                    </Typography>
                  </>
                )}
              </Grid>
              {currentCheckRequest.status !== 'pending_submission' &&
                currentCheckRequest.status !== 'cancelled' && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 2 }} />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography
                        variant="subtitle1"
                        gutterBottom
                        sx={{ fontWeight: 'bold' }}
                      >
                        Approval & Processing
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={12} md={6}>
                          <Typography>
                            <strong>Approved By (Accounts):</strong>{' '}
                            {currentCheckRequest.approved_by_accounts_username ||
                              'N/A'}
                          </Typography>
                          <Typography>
                            <strong>Accounts Approval Date:</strong>{' '}
                            {formatDateString(
                              currentCheckRequest.accounts_approval_date,
                            )}
                          </Typography>
                          {currentCheckRequest.accounts_comments && (
                            <>
                              <Typography mt={1}>
                                <strong>Accounts Comments:</strong>
                              </Typography>
                              <Typography
                                sx={{ whiteSpace: 'pre-wrap', pl: 0 }}
                              >
                                {currentCheckRequest.accounts_comments}
                              </Typography>
                            </>
                          )}
                        </Grid>
                        {(currentCheckRequest.status === 'paid' ||
                          currentCheckRequest.status ===
                            'payment_processing') && (
                          <Grid item xs={12} md={6}>
                            <Typography>
                              <strong>Payment Method:</strong>{' '}
                              {formatPaymentMethod(
                                currentCheckRequest.payment_method,
                              )}
                            </Typography>
                            <Typography>
                              <strong>Payment Date:</strong>{' '}
                              {formatDateString(
                                currentCheckRequest.payment_date,
                              )}
                            </Typography>
                            <Typography>
                              <strong>Transaction ID/Check #:</strong>{' '}
                              {currentCheckRequest.transaction_id || 'N/A'}
                            </Typography>
                            {currentCheckRequest.payment_notes && (
                              <>
                                <Typography mt={1}>
                                  <strong>Payment Notes:</strong>
                                </Typography>
                                <Typography
                                  sx={{ whiteSpace: 'pre-wrap', pl: 0 }}
                                >
                                  {currentCheckRequest.payment_notes}
                                </Typography>
                              </>
                            )}
                          </Grid>
                        )}
                      </Grid>
                    </Grid>
                  </>
                )}
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

export default CheckRequestPrintView;
