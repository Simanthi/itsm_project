import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, CircularProgress, Alert, Button, Divider, Chip
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useAuth } from '../../../context/auth/useAuth';
import { getCheckRequestById } from '../../../api/procurementApi';
import type { CheckRequest, CheckRequestStatus, PaymentMethod } from '../../types';

// Helper to format date strings
const formatDateString = (isoString: string | null | undefined): string => {
  if (!isoString) return 'N/A';
  // Check if it's already just a date (YYYY-MM-DD)
  if (isoString.length === 10 && isoString.includes('-')) {
    return new Date(isoString + 'T00:00:00').toLocaleDateString(); // Ensure it's treated as local date
  }
  return new Date(isoString).toLocaleString(); // For DateTime fields
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


const CheckRequestDetailView: React.FC = () => {
  const { checkRequestId } = useParams<{ checkRequestId?: string }>();
  const navigate = useNavigate();
  const { authenticatedFetch } = useAuth();

  const [checkRequest, setCheckRequest] = useState<CheckRequest | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCheckRequestDetails = useCallback(async () => {
    if (!checkRequestId || !authenticatedFetch) {
      setError("Check Request ID is missing or authentication is not available.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const id = parseInt(checkRequestId, 10);
      if (isNaN(id)) {
        throw new Error("Invalid Check Request ID format.");
      }
      const data = await getCheckRequestById(authenticatedFetch, id);
      setCheckRequest(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to fetch check request details: ${message}`);
      console.error("Error fetching Check Request details:", err);
    } finally {
      setIsLoading(false);
    }
  }, [checkRequestId, authenticatedFetch]);

  useEffect(() => {
    fetchCheckRequestDetails();
  }, [fetchCheckRequestDetails]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading Check Request Details...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/procurement/check-requests')} sx={{ mt: 2 }}>
          Back to List
        </Button>
      </Box>
    );
  }

  if (!checkRequest) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Check Request not found.</Alert>
         <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/procurement/check-requests')} sx={{ mt: 2 }}>
          Back to List
        </Button>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 4 }, m: { xs: 1, md: 2 } }} elevation={3} id="check-request-detail-print-area">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }} className="no-print">
        <Typography variant="h4" component="h1">
          Check Request Details
        </Typography>
        <Box>
            <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/procurement/check-requests')}
                sx={{ mr: 2 }}
            >
                Back to List
            </Button>
            <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>
                Print
            </Button>
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Request Information</Typography>
          <Typography><strong>CR ID:</strong> CR-{checkRequest.id}</Typography>
          <Typography><strong>Status:</strong> <Chip label={checkRequest.status.replace(/_/g, ' ')} color={getStatusChipColor(checkRequest.status)} size="small" /></Typography>
          <Typography><strong>Requested By:</strong> {checkRequest.requested_by_username}</Typography>
          <Typography><strong>Request Date:</strong> {formatDateString(checkRequest.request_date)}</Typography>
          <Typography><strong>Reason for Payment:</strong></Typography>
          <Typography sx={{whiteSpace: 'pre-wrap', pl:1}}>{checkRequest.reason_for_payment}</Typography>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Payment Details</Typography>
          <Typography><strong>Payee Name:</strong> {checkRequest.payee_name}</Typography>
          <Typography><strong>Amount:</strong> {formatCurrency(checkRequest.amount)}</Typography>
          {checkRequest.purchase_order_number && <Typography><strong>PO Number:</strong> {checkRequest.purchase_order_number}</Typography>}
          {checkRequest.invoice_number && <Typography><strong>Invoice Number:</strong> {checkRequest.invoice_number}</Typography>}
          {checkRequest.invoice_date && <Typography><strong>Invoice Date:</strong> {formatDateString(checkRequest.invoice_date)}</Typography>}
          {checkRequest.payee_address && <> <Typography><strong>Payee Address:</strong></Typography> <Typography sx={{whiteSpace: 'pre-wrap', pl:1}}>{checkRequest.payee_address}</Typography></>}
        </Grid>

        {(checkRequest.status !== 'pending_submission' && checkRequest.status !== 'cancelled') && (
          <>
            <Grid item xs={12}><Divider sx={{ my: 2 }} /></Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Approval & Processing</Typography>
              <Grid container spacing={1}>
                <Grid item xs={12} md={6}>
                  <Typography><strong>Approved By (Accounts):</strong> {checkRequest.approved_by_accounts_username || 'N/A'}</Typography>
                  <Typography><strong>Accounts Approval Date:</strong> {formatDateString(checkRequest.accounts_approval_date)}</Typography>
                  {checkRequest.accounts_comments && <> <Typography><strong>Accounts Comments:</strong></Typography><Typography sx={{whiteSpace: 'pre-wrap', pl:1}}>{checkRequest.accounts_comments}</Typography></>}
                </Grid>
                {(checkRequest.status === 'paid' || checkRequest.status === 'payment_processing') && (
                <Grid item xs={12} md={6}>
                  <Typography><strong>Payment Method:</strong> {formatPaymentMethod(checkRequest.payment_method)}</Typography>
                  <Typography><strong>Payment Date:</strong> {formatDateString(checkRequest.payment_date)}</Typography>
                  <Typography><strong>Transaction ID/Check #:</strong> {checkRequest.transaction_id || 'N/A'}</Typography>
                  {checkRequest.payment_notes && <><Typography><strong>Payment Notes:</strong></Typography><Typography sx={{whiteSpace: 'pre-wrap', pl:1}}>{checkRequest.payment_notes}</Typography></>}
                </Grid>
                )}
              </Grid>
            </Grid>
          </>
        )}
      </Grid>
       <style type="text/css">
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #check-request-detail-print-area, #check-request-detail-print-area * {
              visibility: visible;
            }
            #check-request-detail-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>
    </Paper>
  );
};

export default CheckRequestDetailView;
