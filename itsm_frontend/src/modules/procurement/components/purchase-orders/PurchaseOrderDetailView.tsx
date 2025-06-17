import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Button,
  Divider,
  Chip,
  // IconButton, // Removed as unused
  // Tooltip,    // Removed as unused
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useAuth } from '../../../../context/auth/useAuth';
import { getPurchaseOrderById } from '../../../../api/procurementApi';
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
  OrderItem,
} from '../../types';

// Helper to format date strings
const formatDateString = (isoString: string | null | undefined): string => {
  if (!isoString) return 'N/A';
  return new Date(isoString).toLocaleDateString();
};

// Helper to format currency
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return '-'; // Use '==' to catch both null and undefined
  return `$${Number(amount).toFixed(2)}`;
};

// Status chip color logic (similar to list view)
const getStatusChipColor = (status: PurchaseOrderStatus) => {
  switch (status) {
    case 'draft':
      return 'default';
    case 'pending_approval':
      return 'warning';
    case 'approved':
      return 'success';
    case 'partially_received':
      return 'info';
    case 'fully_received':
      return 'primary';
    case 'invoiced':
      return 'secondary'; // Or some other color
    case 'paid':
      return 'success';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
};

const PurchaseOrderDetailView: React.FC = () => {
  const { poId } = useParams<{ poId?: string }>();
  const navigate = useNavigate();
  const { authenticatedFetch } = useAuth();

  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPurchaseOrderDetails = useCallback(async () => {
    if (!poId || !authenticatedFetch) {
      setError(
        'Purchase Order ID is missing or authentication is not available.',
      );
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const id = parseInt(poId, 10);
      if (isNaN(id)) {
        throw new Error('Invalid Purchase Order ID format.');
      }
      const data = await getPurchaseOrderById(authenticatedFetch, id);
      setPurchaseOrder(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to fetch purchase order details: ${message}`);
      console.error('Error fetching PO details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [poId, authenticatedFetch]);

  useEffect(() => {
    fetchPurchaseOrderDetails();
  }, [fetchPurchaseOrderDetails]);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>
          Loading Purchase Order Details...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Back
        </Button>
      </Box>
    );
  }

  if (!purchaseOrder) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Purchase Order not found.</Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Back
        </Button>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 4 }, m: { xs: 1, md: 2 } }} elevation={3}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h5" component="h1">
          Purchase Order Details
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={() =>
              navigate('/procurement/purchase-orders/print-preview', {
                state: { poId: purchaseOrder.id, autoPrint: false },
              })
            }
          >
            Print PO
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Header Section */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            PO Information
          </Typography>
          <Typography variant="body1">
            <strong>PO Number:</strong> {purchaseOrder.po_number}
          </Typography>
          <Typography
            component="div"
            variant="body1"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            {' '}
            {/* Changed to div and added flex for alignment */}
            <strong>Status:</strong>
            <Chip
              label={purchaseOrder.status
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase())}
              color={getStatusChipColor(purchaseOrder.status)}
              size="small"
              sx={{ ml: 1 }}
            />
          </Typography>
          <Typography variant="body1">
            <strong>Order Date:</strong>{' '}
            {formatDateString(purchaseOrder.order_date)}
          </Typography>
          <Typography variant="body1">
            <strong>Expected Delivery:</strong>{' '}
            {formatDateString(purchaseOrder.expected_delivery_date)}
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Vendor & Creator
          </Typography>
          <Typography variant="body1">
            <strong>Vendor:</strong>{' '}
            {purchaseOrder.vendor_details?.name || 'N/A'}
          </Typography>
          <Typography variant="body1">
            <strong>Created By:</strong>{' '}
            {purchaseOrder.created_by_username || 'N/A'}
          </Typography>
          <Typography variant="body1">
            <strong>Created At:</strong>{' '}
            {formatDateString(purchaseOrder.created_at)}
          </Typography>
          {purchaseOrder.internal_office_memo && (
            <Typography variant="body1">
              <strong>Linked IOM ID:</strong>{' '}
              {purchaseOrder.internal_office_memo}
            </Typography>
          )}
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
        </Grid>

        {/* Addressing Section */}
        {purchaseOrder.shipping_address && (
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Shipping Address
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
              {purchaseOrder.shipping_address}
            </Typography>
          </Grid>
        )}

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
        </Grid>

        {/* Items Section */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Order Items
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>
                    Item Description
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    Quantity
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    Unit Price
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    Total Price
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchaseOrder.order_items.map((item: OrderItem) => (
                  <TableRow key={item.id || Math.random()}>
                    {' '}
                    {/* Use item.id if available, else fallback for new items not yet saved */}
                    <TableCell>{item.item_description}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(item.unit_price)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(item.total_price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
        </Grid>

        {/* Summary Section */}
        <Grid item xs={12} sx={{ textAlign: 'right' }}>
          <Typography variant="h6">
            <strong>Overall Total:</strong>{' '}
            {formatCurrency(purchaseOrder.total_amount)}
          </Typography>
        </Grid>

        {/* Notes Section */}
        {purchaseOrder.notes && (
          <>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Notes / Terms
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                {purchaseOrder.notes}
              </Typography>
            </Grid>
          </>
        )}
      </Grid>
    </Paper>
  );
};

export default PurchaseOrderDetailView;
