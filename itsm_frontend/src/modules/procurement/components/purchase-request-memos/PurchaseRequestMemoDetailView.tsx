import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
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
import { getPurchaseRequestMemoById } from '../../../../api/procurementApi';
import type { PurchaseRequestMemo, PurchaseRequestStatus } from '../../types';

// Helper to format date strings
const formatDateString = (isoString: string | null | undefined): string => {
  if (!isoString) return 'N/A';
  return new Date(isoString).toLocaleDateString();
};

// Helper to format currency
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount == null) return '-';
  return `$${Number(amount).toFixed(2)}`;
};

// Status chip color logic
const getStatusChipColor = (status: PurchaseRequestStatus) => {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'approved':
      return 'success';
    case 'rejected':
      return 'error';
    case 'po_created':
      return 'info';
    case 'cancelled':
      return 'default';
    default:
      return 'default';
  }
};

const PurchaseRequestMemoDetailView: React.FC = () => {
  const { memoId } = useParams<{ memoId?: string }>();
  const navigate = useNavigate();
  const { authenticatedFetch } = useAuth();

  const [memo, setMemo] = useState<PurchaseRequestMemo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMemoDetails = useCallback(async () => {
    if (!memoId || !authenticatedFetch) {
      setError('Memo ID is missing or authentication is not available.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const id = parseInt(memoId, 10);
      if (isNaN(id)) {
        throw new Error('Invalid Memo ID format.');
      }
      const data = await getPurchaseRequestMemoById(authenticatedFetch, id);
      setMemo(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to fetch memo details: ${message}`);
      console.error('Error fetching IOM details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [memoId, authenticatedFetch]);

  useEffect(() => {
    fetchMemoDetails();
  }, [fetchMemoDetails]);

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
        <Typography sx={{ ml: 2 }}>Loading Memo Details...</Typography>
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

  if (!memo) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Internal Office Memo not found.</Alert>
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
          Internal Office Memo Details
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
              navigate('/procurement/iom/print-preview', {
                state: { memoId: memo.id, autoPrint: false },
              })
            }
          >
            Print IOM
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Details Section */}
        {/* Main Details Section */}
        <Grid item xs={12} md={8}>
          <Typography variant="h6" gutterBottom>
            Memo Details {memo.iom_id && `(${memo.iom_id})`}
          </Typography>
          <Typography variant="body1">
            <strong>Item Description:</strong>
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
            {memo.item_description}
          </Typography>

          <Typography variant="body1">
            <strong>Quantity:</strong> {memo.quantity}
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>Estimated Cost:</strong>{' '}
            {formatCurrency(memo.estimated_cost)}
          </Typography>

          <Typography variant="body1">
            <strong>Reason for Purchase:</strong>
          </Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
            {memo.reason}
          </Typography>
        </Grid>

        {/* Right Column for Requester, Status, Priority, etc. */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            Overview
          </Typography>
          <Typography variant="body1">
            <strong>Requested By:</strong> {memo.requested_by_username}
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            <strong>Request Date:</strong> {formatDateString(memo.request_date)}
          </Typography>
           <Typography component="div" variant="body1" sx={{ mb: 1 }}> {/* Changed to component="div" */}
            <strong>Priority:</strong> <Chip label={memo.priority?.toUpperCase() || 'N/A'} size="small" />
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            <strong>Status:</strong>&nbsp;
            <Chip
              label={memo.status
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase())}
              color={getStatusChipColor(memo.status)}
              size="small"
            />
          </Typography>

          {memo.department_name && (
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Department:</strong> {memo.department_name}
            </Typography>
          )}
          {memo.project_name && (
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Project:</strong> {memo.project_name}
            </Typography>
          )}
          {memo.required_delivery_date && (
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Required Delivery:</strong> {formatDateString(memo.required_delivery_date)}
            </Typography>
          )}
          {memo.suggested_vendor_name && (
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Suggested Vendor:</strong> {memo.suggested_vendor_name}
            </Typography>
          )}
          {memo.attachments && typeof memo.attachments === 'string' && (
            <Typography variant="body1" sx={{ mt: 1 }}>
              <strong>Attachment:</strong>&nbsp;
              <Link href={memo.attachments} target="_blank" rel="noopener noreferrer" sx={{display: 'inline-flex', alignItems: 'center'}}>
                <AttachmentIcon sx={{fontSize: '1rem', mr: 0.5}} />
                View Attachment
              </Link>
            </Typography>
          )}
        </Grid>

        {/* Approval Section - spans full width if present */}
        {(memo.status !== 'pending' && memo.status !== 'cancelled' && memo.approver_username) && (
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Approval Information
            </Typography>
            <Typography variant="body1">
              <strong>Approver:</strong> {memo.approver_username || 'N/A'}
            </Typography>
            <Typography variant="body1">
              <strong>Decision Date:</strong> {formatDateString(memo.decision_date)}
            </Typography>
            {memo.approver_comments && (
              <>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  <strong>Approver Comments:</strong>
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {memo.approver_comments}
                </Typography>
              </>
            )}
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default PurchaseRequestMemoDetailView;
