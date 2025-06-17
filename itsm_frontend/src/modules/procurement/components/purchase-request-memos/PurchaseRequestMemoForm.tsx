import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  InputAdornment,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { useAuth } from '../../../../context/auth/useAuth';
import { useUI } from '../../../../context/UIContext/useUI';
import {
  getPurchaseRequestMemoById,
  createPurchaseRequestMemo,
  updatePurchaseRequestMemo,
} from '../../../../api/procurementApi';
import type {
  PurchaseRequestMemo,
  PurchaseRequestMemoData,
  PurchaseRequestMemoUpdateData,
} from '../../types';

const initialFormData: PurchaseRequestMemoData = {
  item_description: '',
  quantity: 1,
  reason: '',
  estimated_cost: null,
};

const PurchaseRequestMemoForm: React.FC = () => {
  const { memoId } = useParams<{ memoId?: string }>();
  const navigate = useNavigate();
  const { authenticatedFetch, user } = useAuth();
  const { showSnackbar } = useUI();

  const [formData, setFormData] = useState<
    PurchaseRequestMemoData | PurchaseRequestMemoUpdateData
  >(initialFormData);
  const [displayData, setDisplayData] = useState<Partial<PurchaseRequestMemo>>(
    {},
  ); // For read-only fields in edit/view mode

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [viewOnly, setViewOnly] = useState<boolean>(false);

  const fetchMemoForViewOrEdit = useCallback(async () => {
    if (!memoId || !authenticatedFetch) return;
    setIsLoading(true);
    setError(null);
    try {
      const memo = await getPurchaseRequestMemoById(
        authenticatedFetch,
        parseInt(memoId, 10),
      );
      setFormData({
        // Only set editable fields for the form
        item_description: memo.item_description,
        quantity: memo.quantity,
        reason: memo.reason,
        estimated_cost: memo.estimated_cost || null,
      });
      setDisplayData({
        // Store all data for display purposes
        requested_by_username: memo.requested_by_username,
        request_date: new Date(memo.request_date).toLocaleDateString(),
        status: memo.status,
        approver_username: memo.approver_username,
        decision_date: memo.decision_date
          ? new Date(memo.decision_date).toLocaleDateString()
          : undefined,
        approver_comments: memo.approver_comments,
      });
      setIsEditMode(true);
      if (memo.status !== 'pending' || memo.requested_by !== user?.id) {
        // If not pending, or current user is not the requester, it's view only for these fields
        setViewOnly(true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to load purchase request: ${message}`);
      showSnackbar(`Error: ${message}`, 'error');
      // navigate('/procurement/memos'); // Optionally navigate away
    } finally {
      setIsLoading(false);
    }
  }, [memoId, authenticatedFetch, showSnackbar, user?.id]);

  useEffect(() => {
    if (memoId) {
      fetchMemoForViewOrEdit();
    }
    // For new forms, if user is available, it will be set by backend via perform_create
  }, [memoId, fetchMemoForViewOrEdit]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    if (name === 'quantity' || name === 'estimated_cost') {
      setFormData((prev) => ({
        ...prev,
        [name]: value === '' ? null : Number(value),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authenticatedFetch) {
      setError('Authentication not available. Please log in.');
      showSnackbar('Authentication not available.', 'error');
      return;
    }
    if (
      !formData.item_description ||
      formData.quantity == null ||
      formData.quantity <= 0 ||
      !formData.reason
    ) {
      setError('Item Description, valid Quantity, and Reason are required.');
      showSnackbar(
        'Please fill all required fields with valid values.',
        'warning',
      );
      return;
    }
    if (viewOnly && isEditMode) {
      showSnackbar(
        'This request cannot be edited in its current state.',
        'info',
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = { ...formData };
    // Ensure quantity is a number
    payload.quantity = Number(payload.quantity);
    if (isNaN(payload.quantity) || payload.quantity <= 0) {
      setError('Quantity must be a positive number.');
      showSnackbar('Quantity must be a positive number.', 'warning');
      setIsSubmitting(false);
      return;
    }
    // Ensure estimated_cost is a number or null
    if (
      payload.estimated_cost != null &&
      typeof payload.estimated_cost === 'string'
    ) {
      payload.estimated_cost = parseFloat(payload.estimated_cost);
    }
    if (payload.estimated_cost != null && isNaN(payload.estimated_cost)) {
      payload.estimated_cost = null; // Or show error
    }

    try {
      if (isEditMode && memoId) {
        await updatePurchaseRequestMemo(
          authenticatedFetch,
          parseInt(memoId, 10),
          payload as Partial<PurchaseRequestMemoUpdateData>,
        );
        showSnackbar('Purchase request updated successfully!', 'success');
      } else {
        await createPurchaseRequestMemo(
          authenticatedFetch,
          payload as PurchaseRequestMemoData,
        );
        showSnackbar('Purchase request created successfully!', 'success');
      }
      navigate('/procurement/iom');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to save purchase request: ${message}`);
      showSnackbar(`Error: ${message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const readOnlyMode =
    viewOnly || (isEditMode && displayData.status !== 'pending');

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
        <Typography sx={{ ml: 2 }}>Loading request data...</Typography>
      </Box>
    );
  }

  if (error && !isSubmitting) {
    // Show general page error if not submitting (submission errors shown inline)
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

  return (
    <Paper sx={{ p: { xs: 2, md: 4 }, m: { xs: 1, md: 2 } }} elevation={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
        <Typography variant="h5" component="h1">
          {isEditMode
            ? viewOnly
              ? 'View Purchase Request'
              : 'Edit Purchase Request'
            : 'Create New Purchase Request'}
        </Typography>
      </Box>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && isSubmitting && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              name="item_description"
              label="Item Description"
              value={formData.item_description}
              onChange={handleChange}
              fullWidth
              required
              multiline
              rows={3}
              InputProps={{ readOnly: readOnlyMode }}
              disabled={readOnlyMode}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="quantity"
              label="Quantity"
              type="number"
              value={formData.quantity || ''}
              onChange={handleChange}
              fullWidth
              required
              InputProps={{ readOnly: readOnlyMode, inputProps: { min: 1 } }}
              disabled={readOnlyMode}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="estimated_cost"
              label="Estimated Cost (Optional)"
              type="number"
              value={formData.estimated_cost || ''}
              onChange={handleChange}
              fullWidth
              InputProps={{
                readOnly: readOnlyMode,
                startAdornment: (
                  <InputAdornment position="start">$</InputAdornment>
                ),
                inputProps: { step: '0.01' },
              }}
              disabled={readOnlyMode}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="reason"
              label="Reason for Purchase"
              value={formData.reason}
              onChange={handleChange}
              fullWidth
              required
              multiline
              rows={4}
              InputProps={{ readOnly: readOnlyMode }}
              disabled={readOnlyMode}
            />
          </Grid>

          {isEditMode && (
            <>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Requested By:</strong>{' '}
                  {displayData.requested_by_username || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Request Date:</strong>{' '}
                  {displayData.request_date || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Status:</strong> {displayData.status || 'N/A'}
                </Typography>
              </Grid>
              {displayData.approver_username && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Approver:</strong> {displayData.approver_username}
                  </Typography>
                </Grid>
              )}
              {displayData.decision_date && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Decision Date:</strong> {displayData.decision_date}
                  </Typography>
                </Grid>
              )}
              {displayData.approver_comments && (
                <Grid item xs={12}>
                  <Typography variant="body2">
                    <strong>Approver Comments:</strong>{' '}
                    {displayData.approver_comments}
                  </Typography>
                </Grid>
              )}
            </>
          )}

          <Grid
            item
            xs={12}
            sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}
          >
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => navigate(-1)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            {!viewOnly && (
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting ? (
                  <CircularProgress size={24} />
                ) : isEditMode ? (
                  'Update Request'
                ) : (
                  'Submit Request'
                )}
              </Button>
            )}
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default PurchaseRequestMemoForm;
