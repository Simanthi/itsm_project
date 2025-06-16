import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Typography, Box, CircularProgress, Alert, Button,
  Grid, Paper, Divider, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getPurchaseOrderById } from '../../../../api/procurementApi';
import { useAuth } from '../../../../context/auth/useAuth';
import type { PurchaseOrder, PurchaseOrderStatus, OrderItem } from '../../types';
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

// Status chip color logic for Purchase Order
const getPOStatusChipColor = (status?: PurchaseOrderStatus) => {
    if (!status) return 'default';
    const mapping: Record<PurchaseOrderStatus, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
        draft: 'default',
        pending_approval: 'warning',
        approved: 'success',
        partially_received: 'info',
        fully_received: 'primary',
        invoiced: 'secondary',
        paid: 'success', // Consider a different success or primary variant
        cancelled: 'error',
    };
    return mapping[status] || 'default';
};

interface LocationState {
  selectedPoIds?: number[]; // Array of PO IDs
  poId?: number; // Single PO ID (for backward compatibility or direct print)
  autoPrint?: boolean;
}

const SIDEBAR_WIDTH = 240;

const PurchaseOrderPrintView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { authenticatedFetch } = useAuth();
  const theme = useTheme();

  const state = location.state as LocationState | null;
  const autoPrint = state?.autoPrint || false;

  // Determine PO IDs to fetch
  let poIdsToFetch: number[] = [];
  if (state?.selectedPoIds && state.selectedPoIds.length > 0) {
    poIdsToFetch = state.selectedPoIds;
  } else if (state?.poId) {
    poIdsToFetch = [state.poId];
  }

  const [purchaseOrdersToPrint, setPurchaseOrdersToPrint] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [printRootElement, setPrintRootElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const element = document.getElementById('print-root');
    if (element) setPrintRootElement(element);
    else {
      console.error('Print root element #print-root not found.');
      setError('Print functionality not initialized.');
      setLoading(false);
    }
  }, []);

  const fetchPurchaseOrdersForPrint = useCallback(async () => {
    if (!authenticatedFetch) {
      setError('Authentication context not available.');
      setLoading(false);
      return;
    }
    if (poIdsToFetch.length === 0) {
      setError('No Purchase Order ID(s) provided for printing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const fetchedPOs: PurchaseOrder[] = [];
      for (const id of poIdsToFetch) {
        const po = await getPurchaseOrderById(authenticatedFetch, id);
        fetchedPOs.push(po);
      }
      setPurchaseOrdersToPrint(fetchedPOs);
      if (fetchedPOs.length === 0) {
        setError('Could not fetch any of the selected purchase orders.');
      }
    } catch (err) {
      console.error(`Failed to fetch purchase orders:`, err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`Could not fetch purchase orders: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [poIdsToFetch, authenticatedFetch]); // poIdsToFetch will be stable if derived from location.state correctly

  useEffect(() => {
    if (poIdsToFetch.length > 0) {
        fetchPurchaseOrdersForPrint();
    } else {
        setError('No Purchase Order IDs specified.');
        setLoading(false);
    }
  }, [fetchPurchaseOrdersForPrint]); // Only depends on the callback

  useEffect(() => {
    if (!loading && !error && purchaseOrdersToPrint.length > 0 && autoPrint && printRootElement) {
      printRootElement.style.display = 'block';
      const timer = setTimeout(() => {
        window.print();
        printRootElement.style.display = 'none';
        navigate(location.pathname, {
          replace: true,
          state: { ...state, autoPrint: false }, // Preserve other state like selectedPoIds or poId
        });
      }, 500);
      return () => {
        clearTimeout(timer);
        if (printRootElement) printRootElement.style.display = 'none';
      };
    }
  }, [loading, error, purchaseOrdersToPrint, autoPrint, navigate, printRootElement, location.pathname, state]);

  const BackButton: React.FC<ButtonProps> = (props) => (
    <Button
      variant="contained"
      color="primary"
      onClick={() => navigate('/procurement/purchase-orders')}
      startIcon={<ArrowBackIcon />}
      {...props}
    >
      Back to Purchase Orders
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

  if (purchaseOrdersToPrint.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Purchase Order data not available for printing.</Alert>
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
            onClick={() => navigate(location.pathname, { replace: true, state: { ...state, autoPrint: true }})}
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
          minHeight: 'calc(1122px - 60px)', boxSizing: 'border-box', // A4 page height approx
          display: 'flex', flexDirection: 'column', gap: '20px', // Gap between POs if multiple
          borderRadius: theme.shape.borderRadius || 4,
        }}
      >
        {purchaseOrdersToPrint.map((po) => (
          <Paper key={po.id} sx={{ p: { xs: 2, md: 3 }, pageBreakAfter: 'always' }} elevation={0} id={`po-print-${po.id}`}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" component="h1">
                Purchase Order: {po.po_number}
              </Typography>
              <Chip label={po.status.replace(/_/g, ' ')} color={getPOStatusChipColor(po.status)} size="small" />
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>PO Information</Typography>
                <Typography><strong>Order Date:</strong> {formatDateString(po.order_date)}</Typography>
                <Typography><strong>Expected Delivery:</strong> {formatDateString(po.expected_delivery_date)}</Typography>
                {po.internal_office_memo && <Typography><strong>Linked IOM ID:</strong> {po.internal_office_memo}</Typography>}
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Vendor & Creator</Typography>
                <Typography><strong>Vendor:</strong> {po.vendor_details?.name || 'N/A'}</Typography>
                <Typography><strong>Created By:</strong> {po.created_by_username || 'N/A'}</Typography>
                <Typography><strong>Created At:</strong> {formatDateString(po.created_at)}</Typography>
              </Grid>

              {po.shipping_address && (
                <Grid item xs={12} sx={{mt:1}}>
                  <Divider sx={{ mb:1 }}/>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Shipping Address</Typography>
                  <Typography sx={{ whiteSpace: 'pre-line' }}>{po.shipping_address}</Typography>
                </Grid>
              )}

              <Grid item xs={12} sx={{mt:1}}>
                <Divider sx={{ mb:1 }}/>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Order Items</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{fontWeight: 'bold'}}>Item Description</TableCell>
                        <TableCell align="right" sx={{fontWeight: 'bold'}}>Quantity</TableCell>
                        <TableCell align="right" sx={{fontWeight: 'bold'}}>Unit Price</TableCell>
                        <TableCell align="right" sx={{fontWeight: 'bold'}}>Total Price</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {po.order_items.map((item: OrderItem) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.item_description}</TableCell>
                          <TableCell align="right">{item.quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell align="right">{formatCurrency(item.total_price)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid item xs={12} sx={{ textAlign: 'right', mt:1 }}>
                 <Divider sx={{ mb:1 }}/>
                <Typography variant="h6"><strong>Overall Total:</strong> {formatCurrency(po.total_amount)}</Typography>
              </Grid>

              {po.notes && (
                <Grid item xs={12} sx={{mt:1}}>
                  <Divider sx={{ mb:1 }}/>
                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>Notes / Terms</Typography>
                  <Typography sx={{ whiteSpace: 'pre-line' }}>{po.notes}</Typography>
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

export default PurchaseOrderPrintView;
