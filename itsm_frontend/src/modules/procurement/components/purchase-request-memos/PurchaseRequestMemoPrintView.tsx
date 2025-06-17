import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getPurchaseRequestMemoById } from '../../../../api/procurementApi'; // Updated API call
import { useAuth } from '../../../../context/auth/useAuth';
import type { PurchaseRequestMemo, PurchaseRequestStatus } from '../../types'; // Updated type import
import { type ButtonProps } from '@mui/material/Button';

// Helper to format date strings (can be shared or defined locally)
const formatDateString = (isoString: string | null | undefined): string => {
  if (!isoString) return 'N/A';
  if (isoString.length === 10 && isoString.includes('-')) {
    return new Date(isoString + 'T00:00:00').toLocaleDateString();
  }
  return new Date(isoString).toLocaleString();
};

// Helper to format currency (can be shared or defined locally)
const formatCurrency = (amount: string | number | null | undefined): string => {
  if (amount == null || amount === '') return '-';
  return `$${Number(amount).toFixed(2)}`;
};

// Status chip color logic for Purchase Request Memo
const getIOMStatusChipColor = (status?: PurchaseRequestStatus) => {
  if (!status) return 'default';
  const mapping: Record<
    PurchaseRequestStatus,
    | 'default'
    | 'primary'
    | 'secondary'
    | 'error'
    | 'info'
    | 'success'
    | 'warning'
  > = {
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
    po_created: 'info',
    cancelled: 'default',
  };
  return mapping[status] || 'default';
};

interface LocationState {
  selectedMemoIds?: number[]; // Array of Memo IDs
  memoId?: number; // Single Memo ID
  autoPrint?: boolean;
}

const SIDEBAR_WIDTH = 240;

const PurchaseRequestMemoPrintView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { authenticatedFetch } = useAuth();
  const theme = useTheme();

  const state = location.state as LocationState | null;
  const autoPrint = state?.autoPrint || false;

  const memoIdsToFetch = useMemo(() => {
    let ids: number[] = [];
    if (state?.selectedMemoIds && state.selectedMemoIds.length > 0) {
      ids = state.selectedMemoIds;
    } else if (state?.memoId) {
      ids = [state.memoId];
    }
    return ids;
  }, [state]);

  const [memosToPrint, setMemosToPrint] = useState<PurchaseRequestMemo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
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
      setLoading(false);
    }
  }, []);

  const fetchMemosForPrint = useCallback(async () => {
    if (!authenticatedFetch) {
      setError('Authentication context not available.');
      setLoading(false);
      return;
    }
    if (memoIdsToFetch.length === 0) {
      setError('No IOM ID(s) provided for printing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fetchedMemos: PurchaseRequestMemo[] = [];
      for (const id of memoIdsToFetch) {
        const memo = await getPurchaseRequestMemoById(authenticatedFetch, id);
        fetchedMemos.push(memo);
      }
      setMemosToPrint(fetchedMemos);
      if (fetchedMemos.length === 0) {
        setError('Could not fetch any of the selected IOMs.');
      }
    } catch (err) {
      console.error(`Failed to fetch IOMs:`, err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`Could not fetch IOMs: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [memoIdsToFetch, authenticatedFetch]);

  useEffect(() => {
    if (memoIdsToFetch.length > 0) {
      fetchMemosForPrint();
    } else {
      setError('No IOM IDs specified.');
      setLoading(false);
    }
  }, [fetchMemosForPrint, memoIdsToFetch]); // Added memoIdsToFetch

  useEffect(() => {
    if (
      !loading &&
      !error &&
      memosToPrint.length > 0 &&
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
    memosToPrint,
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
      onClick={() => navigate('/procurement/iom')} // Adjusted back path
      startIcon={<ArrowBackIcon />}
      {...props}
    >
      Back to IOMs
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

  if (memosToPrint.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">IOM data not available for printing.</Alert>
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
        {memosToPrint.map((memo) => (
          <Paper
            key={memo.id}
            sx={{ p: { xs: 2, md: 3 }, pageBreakAfter: 'always' }}
            elevation={0}
            id={`iom-print-${memo.id}`}
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
                Internal Office Memo: IOM-{memo.id}
              </Typography>
              <Chip
                label={memo.status.replace(/_/g, ' ')}
                color={getIOMStatusChipColor(memo.status)}
                size="small"
              />
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ fontWeight: 'bold' }}
                >
                  Memo Details
                </Typography>
                <Typography>
                  <strong>Item Description:</strong> {memo.item_description}
                </Typography>
                <Typography>
                  <strong>Quantity:</strong> {memo.quantity}
                </Typography>
                <Typography>
                  <strong>Estimated Cost:</strong>{' '}
                  {formatCurrency(memo.estimated_cost)}
                </Typography>
              </Grid>

              <Grid item xs={12} sx={{ mt: 1 }}>
                <Divider sx={{ mb: 1 }} />
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ fontWeight: 'bold' }}
                >
                  Reason for Purchase
                </Typography>
                <Typography sx={{ whiteSpace: 'pre-line' }}>
                  {memo.reason}
                </Typography>
              </Grid>

              <Grid item xs={12} sx={{ mt: 1 }}>
                <Divider sx={{ mb: 1 }} />
                <Typography
                  variant="subtitle1"
                  gutterBottom
                  sx={{ fontWeight: 'bold' }}
                >
                  Requester Information
                </Typography>
                <Typography>
                  <strong>Requested By:</strong> {memo.requested_by_username}
                </Typography>
                <Typography>
                  <strong>Request Date:</strong>{' '}
                  {formatDateString(memo.request_date)}
                </Typography>
              </Grid>

              {memo.status !== 'pending' &&
                memo.status !== 'cancelled' &&
                memo.approver_username && (
                  <Grid item xs={12} sx={{ mt: 1 }}>
                    <Divider sx={{ mb: 1 }} />
                    <Typography
                      variant="subtitle1"
                      gutterBottom
                      sx={{ fontWeight: 'bold' }}
                    >
                      Approval Information
                    </Typography>
                    <Typography>
                      <strong>Approver:</strong>{' '}
                      {memo.approver_username || 'N/A'}
                    </Typography>
                    <Typography>
                      <strong>Decision Date:</strong>{' '}
                      {formatDateString(memo.decision_date)}
                    </Typography>
                    {memo.approver_comments && (
                      <Typography mt={1}>
                        <strong>Approver Comments:</strong>
                      </Typography>
                    )}
                    {memo.approver_comments && (
                      <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                        {memo.approver_comments}
                      </Typography>
                    )}
                  </Grid>
                )}
            </Grid>
          </Paper>
        ))}
      </Box>
    </>
  );

  return autoPrint && printRootElement
    ? ReactDOM.createPortal(printContent, printRootElement)
    : printContent;
};

export default PurchaseRequestMemoPrintView;
