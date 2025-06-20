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
  Link, // For attachment link
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AttachmentIcon from '@mui/icons-material/Attachment'; // For attachment icon

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
const formatCurrency = (amount: number | null | undefined, currencyCode: string = 'USD'): string => {
  if (amount == null) return '-';
  const symbols: { [key: string]: string } = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    INR: '₹',
    KES: 'KES ', // Adding space for KES as it's often prefixed
  };
  const symbol = symbols[currencyCode] || `${currencyCode} `;
  return `${symbol}${Number(amount).toFixed(2)}`;
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
          <Typography variant="body1">
            <strong>PO Type:</strong> {purchaseOrder.po_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}
          </Typography>
           <Typography variant="body1">
            <strong>Currency:</strong> {purchaseOrder.currency}
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
          <Typography variant="body1">
            <strong>Revision:</strong> {purchaseOrder.revision_number ?? 0}
          </Typography>
          {purchaseOrder.internal_office_memo && (
            <Typography variant="body1">
              <strong>Linked IOM ID:</strong>{' '}
              {purchaseOrder.internal_office_memo} {/* Consider fetching IOM summary if needed */}
            </Typography>
          )}
           {purchaseOrder.related_contract_details && ( // Assuming related_contract_details holds a string like title or ID
            <Typography variant="body1">
              <strong>Related Contract:</strong> {purchaseOrder.related_contract_details}
            </Typography>
          )}
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
        </Grid>

        {/* Addressing & Shipping Section */}
        <Grid item xs={12} md={6}>
           {purchaseOrder.shipping_address && (
            <>
              <Typography variant="h6" gutterBottom>Shipping Address</Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mb:1 }}>{purchaseOrder.shipping_address}</Typography>
            </>
          )}
          {purchaseOrder.shipping_method && (
            <Typography variant="body1"><strong>Shipping Method:</strong> {purchaseOrder.shipping_method}</Typography>
          )}
        </Grid>
         <Grid item xs={12} md={6}>
          {purchaseOrder.billing_address && (
            <>
              <Typography variant="h6" gutterBottom>Billing Address</Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line', mb:1 }}>{purchaseOrder.billing_address}</Typography>
            </>
          )}
        </Grid>

        {purchaseOrder.attachments && typeof purchaseOrder.attachments === 'string' && (
          <Grid item xs={12}>
            <Typography variant="body1" sx={{ mt: 1 }}>
              <strong>Attachment:</strong>&nbsp;
              <Link href={purchaseOrder.attachments} target="_blank" rel="noopener noreferrer" sx={{display: 'inline-flex', alignItems: 'center'}}>
                <AttachmentIcon sx={{fontSize: '1rem', mr: 0.5}} />
                View PO Attachment
              </Link>
            </Typography>
          </Grid>
        )}


        <Grid item xs={12}><Divider sx={{ my: 2 }} /></Grid>

        {/* Items Section */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>Order Items</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Item Description</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Product Code</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Qty</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Unit Price</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>GL Account</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Rcvd Qty</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Line Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Tax (%)</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Disc. Type</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Disc. Val</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Price</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {purchaseOrder.order_items.map((item: OrderItem) => (
                  <TableRow key={item.id || Math.random()}>
                    <TableCell>{item.item_description}</TableCell>
                    <TableCell>{item.product_code || '-'}</TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">{formatCurrency(item.unit_price, purchaseOrder.currency)}</TableCell>
                    <TableCell>{item.gl_account_code || (item.gl_account ? `ID: ${item.gl_account}`: '-')}</TableCell>
                    <TableCell align="right">{item.received_quantity ?? 0}</TableCell>
                    <TableCell>{item.line_item_status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'}</TableCell>
                    <TableCell align="right">{item.tax_rate != null ? `${item.tax_rate}%` : '-'}</TableCell>
                    <TableCell>{item.discount_type || '-'}</TableCell>
                    <TableCell align="right">{item.discount_value != null ? formatCurrency(item.discount_value, purchaseOrder.currency) : '-'}</TableCell>
                    <TableCell align="right">{formatCurrency(item.total_price, purchaseOrder.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid item xs={12}><Divider sx={{ my: 2 }} /></Grid>

        {/* Summary Section */}
        <Grid item xs={12} sx={{ textAlign: 'right' }}>
          <Typography variant="h6">
            <strong>Overall Total:</strong>{' '}
            {formatCurrency(purchaseOrder.total_amount, purchaseOrder.currency)}
          </Typography>
        </Grid>

        {/* Notes & Payment Terms Section */}
        {(purchaseOrder.notes || purchaseOrder.payment_terms) && (
            <Grid item xs={12}><Divider sx={{my:2}}/></Grid>
        )}
        {purchaseOrder.payment_terms && (
             <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Payment Terms</Typography>
                <Typography variant="body1">{purchaseOrder.payment_terms}</Typography>
            </Grid>
        )}
        {purchaseOrder.notes && (
            <Grid item xs={12} md={purchaseOrder.payment_terms ? 6 : 12}>
              <Typography variant="h6" gutterBottom>Notes</Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                {purchaseOrder.notes}
              </Typography>
            </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default PurchaseOrderDetailView;
