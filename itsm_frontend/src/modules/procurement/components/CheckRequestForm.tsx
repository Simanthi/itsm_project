import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  TextField, Button, Box, Typography, MenuItem, CircularProgress,
  Alert, Grid, Paper, Autocomplete, InputAdornment, FormControl, InputLabel, Select
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';

import { useAuth } from '../../../context/auth/useAuth';
import { useUI } from '../../../context/UIContext/useUI';
import {
  getCheckRequestById,
  createCheckRequest,
  updateCheckRequest,
  getPurchaseOrders, // To fetch POs for selection
} from '../../../api/procurementApi';
import type {
  CheckRequest,
  CheckRequestData,
  CheckRequestUpdateData, // For PATCH/PUT
  PurchaseOrder, // For PO Autocomplete
  CheckRequestStatus
} from '../../../api/procurementApi';

const initialFormData: CheckRequestData = {
  purchase_order: undefined, // Will store PO ID
  invoice_number: '',
  invoice_date: null,
  amount: '',
  payee_name: '',
  payee_address: '',
  reason_for_payment: '',
};

// Status choices for read-only display or specific scenarios if form handles status
const CR_STATUS_CHOICES_DISPLAY: { value: CheckRequestStatus; label: string }[] = [
    { value: 'pending_submission', label: 'Pending Submission' },
    { value: 'pending_approval', label: 'Pending Accounts Approval' },
    { value: 'approved', label: 'Approved for Payment' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'payment_processing', label: 'Payment Processing' },
    { value: 'paid', label: 'Paid' },
    { value: 'cancelled', label: 'Cancelled' },
];


const CheckRequestForm: React.FC = () => {
  const { checkRequestId } = useParams<{ checkRequestId?: string }>();
  const navigate = useNavigate();
  const { authenticatedFetch, user } = useAuth();
  const { showSnackbar } = useUI();

  const [formData, setFormData] = useState<CheckRequestData | CheckRequestUpdateData>(initialFormData);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [viewOnly, setViewOnly] = useState<boolean>(false);

  // For displaying non-editable fields fetched for an existing Check Request
  const [displayData, setDisplayData] = useState<Partial<CheckRequest>>({});


  const fetchPOsForSelect = useCallback(async () => {
    if (!authenticatedFetch) return;
    // Fetch POs that are typically eligible for check requests (e.g., approved, received)
    // This logic might need refinement based on actual PO statuses used.
    try {
      const response = await getPurchaseOrders(authenticatedFetch, {
        // status: 'approved', // Example filter: only link to approved POs
        // status: 'fully_received', // Or fully received
        pageSize: 200
      });
      setPurchaseOrders(response.results);
    } catch (err) { console.error("Failed to fetch purchase orders:", err); }
  }, [authenticatedFetch]);

  useEffect(() => {
    fetchPOsForSelect();
  }, [fetchPOsForSelect]);

  const fetchCheckRequestForEdit = useCallback(async () => {
    if (!checkRequestId || !authenticatedFetch) return;
    setIsLoading(true);
    setError(null);
    try {
      const cr = await getCheckRequestById(authenticatedFetch, parseInt(checkRequestId, 10));
      setFormData({ // Set only editable fields for the form
        purchase_order: cr.purchase_order || undefined,
        invoice_number: cr.invoice_number || '',
        invoice_date: cr.invoice_date ? cr.invoice_date.split('T')[0] : null,
        amount: cr.amount, // Amount is string here
        payee_name: cr.payee_name,
        payee_address: cr.payee_address || '',
        reason_for_payment: cr.reason_for_payment,
      });
      setDisplayData({ // For display of read-only fields
        requested_by_username: cr.requested_by_username,
        request_date: new Date(cr.request_date).toLocaleDateString(),
        status: cr.status,
        approved_by_accounts_username: cr.approved_by_accounts_username,
        accounts_approval_date: cr.accounts_approval_date ? new Date(cr.accounts_approval_date).toLocaleDateString() : undefined,
        accounts_comments: cr.accounts_comments,
        payment_method: cr.payment_method,
        payment_date: cr.payment_date ? new Date(cr.payment_date).toLocaleDateString() : undefined,
        transaction_id: cr.transaction_id,
        payment_notes: cr.payment_notes,
      });
      setIsEditMode(true);
      if (cr.status !== 'pending_submission' || cr.requested_by !== user?.id) {
        setViewOnly(true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to load Check Request: ${message}`);
      showSnackbar(`Error: ${message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [checkRequestId, authenticatedFetch, showSnackbar, user?.id]);

  useEffect(() => {
    if (checkRequestId) {
      fetchCheckRequestForEdit();
    }
  }, [checkRequestId, fetchCheckRequestForEdit]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
     if (name === "amount") {
        setFormData((prev) => ({ ...prev, [name]: value })); // Keep amount as string for controlled input
    } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value || null }));
  };

  const handlePOSelect = (event: any, selectedPO: PurchaseOrder | null) => {
    if (selectedPO) {
      setFormData(prev => ({
        ...prev,
        purchase_order: selectedPO.id,
        payee_name: selectedPO.vendor_details?.name || prev.payee_name,
        // Potentially prefill amount from PO total if applicable, or reason from PO notes
        // amount: selectedPO.total_amount ? String(selectedPO.total_amount) : prev.amount,
        // reason_for_payment: selectedPO.notes || prev.reason_for_payment,
      }));
    } else {
      setFormData(prev => ({ ...prev, purchase_order: undefined }));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authenticatedFetch) { /* ... error handling ... */ return; }
    if (!formData.amount || parseFloat(formData.amount) <= 0 || !formData.payee_name || !formData.reason_for_payment) {
      setError("Payee Name, Amount (positive number), and Reason are required.");
      showSnackbar("Please fill all required fields with valid values.", "warning");
      return;
    }
    if (viewOnly && isEditMode) { /* ... info message ... */ return; }

    setIsSubmitting(true);
    setError(null);

    // Ensure amount is a string for the API if backend DecimalField expects string for precision
    const payload = {
      ...formData,
      amount: String(formData.amount), // Ensure amount is string
      purchase_order: formData.purchase_order ? Number(formData.purchase_order) : null,
    };

    try {
      if (isEditMode && checkRequestId) {
        await updateCheckRequest(authenticatedFetch, parseInt(checkRequestId, 10), payload as Partial<CheckRequestUpdateData>);
        showSnackbar('Check Request updated successfully!', 'success');
      } else {
        await createCheckRequest(authenticatedFetch, payload as CheckRequestData);
        showSnackbar('Check Request created successfully!', 'success');
      }
      navigate('/procurement/check-requests');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to save Check Request: ${message}`);
      showSnackbar(`Error: ${message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormEditable = !viewOnly && (!isEditMode || (isEditMode && displayData.status === 'pending_submission' && displayData.requested_by === user?.id));


  if (isLoading) { /* ... loading UI ... */
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /><Typography sx={{ml:2}}>Loading data...</Typography></Box>;
  }
  if (error && !isSubmitting && !isEditMode) { // Initial page load error for new form (e.g. PO list failed)
     return <Box sx={{p:3}}><Alert severity="error">{error}</Alert><Button onClick={() => navigate('/procurement/check-requests')} sx={{mt:2}}>Back to List</Button></Box>;
  }
   if (error && isEditMode && !formData.payee_name && !isSubmitting) { // Critical error loading existing CR
     return <Box sx={{p:3}}><Alert severity="error">{error}</Alert><Button onClick={() => navigate('/procurement/check-requests')} sx={{mt:2}}>Back to List</Button></Box>;
  }


  return (
    <Paper sx={{ p: { xs: 2, md: 4 }, m: { xs: 1, md: 2 } }} elevation={3}>
      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
        {isEditMode ? (isFormEditable ? 'Edit Check Request' : 'View Check Request') : 'Create Check Request'}
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && isSubmitting && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={purchaseOrders}
              getOptionLabel={(option) => `PO-${option.po_number} (${option.vendor_details?.name}) - $${Number(option.total_amount).toFixed(2)}`}
              value={purchaseOrders.find(po => po.id === formData.purchase_order) || null}
              onChange={handlePOSelect}
              renderInput={(params) => <TextField {...params} label="Link Purchase Order (Optional)" />}
              disabled={!isFormEditable && isEditMode}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField name="invoice_number" label="Invoice Number (Optional)" value={formData.invoice_number || ''} onChange={handleChange} fullWidth InputProps={{readOnly: !isFormEditable}} disabled={!isFormEditable}/>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField name="invoice_date" label="Invoice Date (Optional)" type="date" value={formData.invoice_date || ''} onChange={handleDateChange} InputLabelProps={{ shrink: true }} fullWidth InputProps={{readOnly: !isFormEditable}} disabled={!isFormEditable}/>
          </Grid>
           <Grid item xs={12} md={6}>
            <TextField name="amount" label="Amount" type="number" value={formData.amount || ''} onChange={handleChange} fullWidth required InputProps={{readOnly: !isFormEditable, startAdornment: <InputAdornment position="start">$</InputAdornment>, inputProps: { step: "0.01", min: "0.01" } }} disabled={!isFormEditable}/>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField name="payee_name" label="Payee Name" value={formData.payee_name || ''} onChange={handleChange} fullWidth required InputProps={{readOnly: !isFormEditable}} disabled={!isFormEditable}/>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField name="payee_address" label="Payee Address (Optional)" value={formData.payee_address || ''} onChange={handleChange} fullWidth multiline rows={2} InputProps={{readOnly: !isFormEditable}} disabled={!isFormEditable}/>
          </Grid>
          <Grid item xs={12}>
            <TextField name="reason_for_payment" label="Reason for Payment / Description" value={formData.reason_for_payment || ''} onChange={handleChange} fullWidth required multiline rows={3} InputProps={{readOnly: !isFormEditable}} disabled={!isFormEditable}/>
          </Grid>

          {isEditMode && (
            <>
              <Grid item xs={12}><Divider sx={{my:1}} /><Typography variant="subtitle1" color="text.secondary">Request Details</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Status:</strong> <Chip label={displayData.status?.replace(/_/g, ' ') || "N/A"} size="small"/></Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Requested By:</strong> {displayData.requested_by_username || 'N/A'}</Typography></Grid>
              <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Request Date:</strong> {displayData.request_date || 'N/A'}</Typography></Grid>
              {displayData.status !== 'pending_submission' && displayData.status !== 'pending_approval' && (
                <>
                  <Grid item xs={12}><Divider sx={{my:1}} /><Typography variant="subtitle1" color="text.secondary">Approval & Payment Details</Typography></Grid>
                  <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Approved By (Accounts):</strong> {displayData.approved_by_accounts_username || 'N/A'}</Typography></Grid>
                  <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Accounts Approval Date:</strong> {displayData.accounts_approval_date || 'N/A'}</Typography></Grid>
                  <Grid item xs={12}><Typography variant="body2"><strong>Accounts Comments:</strong> {displayData.accounts_comments || 'N/A'}</Typography></Grid>
                  {displayData.status === 'paid' && (
                    <>
                      <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Payment Method:</strong> {displayData.payment_method || 'N/A'}</Typography></Grid>
                      <Grid item xs={12} sm={6}><Typography variant="body2"><strong>Payment Date:</strong> {displayData.payment_date || 'N/A'}</Typography></Grid>
                      <Grid item xs={12}><Typography variant="body2"><strong>Transaction ID/Check #:</strong> {displayData.transaction_id || 'N/A'}</Typography></Grid>
                      {displayData.payment_notes && <Grid item xs={12}><Typography variant="body2"><strong>Payment Notes:</strong> {displayData.payment_notes}</Typography></Grid>}
                    </>
                  )}
                </>
              )}
            </>
          )}

          <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" color="secondary" onClick={() => navigate('/procurement/check-requests')} disabled={isSubmitting}>
              Cancel
            </Button>
            {isFormEditable && (
              <Button type="submit" variant="contained" color="primary" disabled={isSubmitting || isLoading}>
                {isSubmitting ? <CircularProgress size={24} /> : (isEditMode ? 'Update Check Request' : 'Submit Check Request')}
              </Button>
            )}
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default CheckRequestForm;
