import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  Autocomplete,
  Chip,
  Divider,
  InputAdornment, // Added for amount field
  // MenuItem, // Unused TS6133
  // FormControl, // Unused TS6133
  // InputLabel, // Unused TS6133
  // Select, // Unused TS6133
} from '@mui/material';
// import type { SelectChangeEvent } from '@mui/material'; // Unused TS6133
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../../../context/auth/useAuth'; // TS2307
import { useUI } from '../../../context/UIContext/useUI'; // TS2307
import {
  getCheckRequestById,
  createCheckRequest,
  updateCheckRequest,
  getPurchaseOrders,
} from '../../../api/procurementApi';
import type { // TS1484
  CheckRequest,
  CheckRequestData,
  CheckRequestStatus,
  PurchaseOrder,
  // PaymentMethod, // Unused TS6196
  // PurchaseOrderStatus, // Unused TS6196
} from '../../../api/procurementApi';
import { formatDateString, formatCurrency } from '../../../utils/formatters'; // TS2307 (should be fixed now)

// Constants
// const PAYMENT_METHOD_CHOICES: { value: PaymentMethod; label: string }[] = [ // Unused TS6133
//   { value: 'check', label: 'Check' },
//   { value: 'ach', label: 'ACH Transfer' },
//   { value: 'credit_card', label: 'Credit Card' },
//   { value: 'other', label: 'Other' },
// ];

const CHECK_REQUEST_STATUS_DISPLAY: Record<CheckRequestStatus, string> = {
  pending_submission: 'Pending Submission',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  payment_processing: 'Payment Processing',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

// Align with CheckRequestData and remove fields not part of general create/update
const initialFormData: Partial<Omit<CheckRequestData, 'amount'> & { amount: string } & { id?: number; purchase_order_obj?: PurchaseOrder | null }> = { // TS2345 amount type fixed
  purchase_order: undefined, // Changed from purchase_order_id
  invoice_number: '',
  invoice_date: '',
  amount: '0.00', // Changed to string, as CheckRequestData expects string for amount
  payee_name: '',
  payee_address: '',
  reason_for_payment: '',
  // Removed: status, payment_method, payment_date, transaction_id, payment_notes
  // These are typically handled by specific actions or backend logic, not direct form submission for create/update
  purchase_order_obj: null,
};

// Helper function for chip color
const getStatusChipColorForCheckRequest = (
  status: CheckRequestStatus | undefined,
): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  if (!status) return 'default';
  switch (status) {
    case 'pending_submission':
    case 'pending_approval':
      return 'warning';
    case 'approved':
    case 'paid':
      return 'success';
    case 'rejected':
    case 'cancelled':
      return 'error';
    case 'payment_processing':
      return 'info';
    default:
      return 'default';
  }
};


const CheckRequestForm: React.FC = () => {
  const { checkRequestId } = useParams<{ checkRequestId?: string }>();
  const navigate = useNavigate();
  const { authenticatedFetch, user: currentUser } = useAuth();
  const { showSnackbar } = useUI();

  const [formData, setFormData] = useState<Partial<CheckRequestData & { id?: number; purchase_order_obj?: PurchaseOrder | null }>>(initialFormData as Partial<CheckRequestData & { id?: number; purchase_order_obj?: PurchaseOrder | null }>);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [viewOnly, setViewOnly] = useState<boolean>(false);
  const [currentCheckRequest, setCurrentCheckRequest] = useState<CheckRequest | null>(null);

  const fetchCheckRequest = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCheckRequestById(authenticatedFetch, id);
      const selectedPOForEdit = purchaseOrders.find(po => po.id === data.purchase_order);

      setFormData({
        // Spread only fields that are part of CheckRequestData or the extended form state
        id: data.id,
        purchase_order: data.purchase_order || undefined,
        invoice_number: data.invoice_number || '',
        invoice_date: data.invoice_date ? formatDateString(data.invoice_date, 'YYYY-MM-DD') : '',
        amount: data.amount || '0.00', // amount is string in CheckRequest
        payee_name: data.payee_name || '',
        payee_address: data.payee_address || '',
        reason_for_payment: data.reason_for_payment || '',
        purchase_order_obj: selectedPOForEdit || null,
        // Do not set payment_date here from data.payment_date into general formData,
        // as it's not part of CheckRequestData. Display payment details directly from currentCheckRequest.
      });
      setCurrentCheckRequest(data);
      setIsEditMode(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch check request details.';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, showSnackbar]);

  useEffect(() => {
    if (checkRequestId) {
      fetchCheckRequest(Number(checkRequestId));
    }
  }, [checkRequestId, fetchCheckRequest]);

  useEffect(() => {
    const fetchPOs = async () => {
      try {
        // Fetch POs that might need a check request (e.g., approved or fully_received)
        // Adjust statuses as per your application's logic
        // Casting to 'any' for status_in assuming backend supports status__in
        const poData = await getPurchaseOrders(authenticatedFetch, {
          status_in: ['approved', 'fully_received'] as any,
        });
        setPurchaseOrders(poData.results || []);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch purchase orders.';
        showSnackbar(errorMessage, 'error');
        console.error("Failed to fetch POs:", err);
      }
    };
    fetchPOs();
  }, [authenticatedFetch, showSnackbar]);

  useEffect(() => {
    if (currentCheckRequest && currentUser) {
      // Example: View-only if status is not pending, or user is not an admin/finance
      const isNonEditableStatus = ![
        'pending_submission',
        'pending_approval',
      ].includes(currentCheckRequest.status);
      // Add role-based logic if needed:
      // const isUserAllowedToEdit = currentUser.roles?.includes('finance_manager');
      setViewOnly(isNonEditableStatus /* && !isUserAllowedToEdit */);
    } else if (!isEditMode) {
      setViewOnly(false); // New forms are not view-only
    }
  }, [currentCheckRequest, currentUser, isEditMode]);


  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target; // Removed 'type' as it's unused (TS6133)
    // Amount field is type="number" but its value is received as string here or empty string.
    // CheckRequestData expects amount as string.
    // So, directly set the string value.
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (fieldName: keyof Pick<CheckRequestData, 'invoice_date'>, dateStr: string | null) => {
    setFormData(prev => ({ ...prev, [fieldName]: dateStr }));
  };

  // State for payment details UI, separate from main formData for CheckRequestData - REMOVED as unused (TS6133)
  // const [paymentUIDetails, setPaymentUIDetails] = useState<{
  //   payment_method?: PaymentMethod;
  //   payment_date: string | null;
  //   transaction_id: string;
  //   payment_notes: string;
  // }>({
  //   payment_method: undefined,
  //   payment_date: null,
  //   transaction_id: '',
  //   payment_notes: '',
  // });

  const handlePOSelect = (_event: React.SyntheticEvent, value: PurchaseOrder | null) => {
    setFormData(prev => ({
      ...prev,
      purchase_order: value?.id, // Changed from purchase_order_id
      purchase_order_obj: value,
      payee_name: value?.vendor_details?.name || prev.payee_name,
      // amount should be string
      amount: ((): string | undefined => { // Ensure IIFE returns string | undefined
        const prevAmountStr = String(prev.amount || "").trim();
        const isPrevAmountZeroOrEmpty = prevAmountStr === "0.00" || prevAmountStr === "0" || prevAmountStr === "";
        if (isPrevAmountZeroOrEmpty && value?.total_amount !== undefined) {
          return String(value.total_amount); // This is string
        }
        // prev.amount is already string | undefined from formData's type
        return prev.amount as (string | undefined);
      })(),
    }));
  };

  // Unused handler (TS6133)
  // const handlePaymentMethodChange = (event: SelectChangeEvent<PaymentMethod | ''>) => {
  //   // This updates UI state, not the main formData for submission unless it's for a specific payment action
  //   setPaymentUIDetails(prev => ({ ...prev, payment_method: event.target.value as PaymentMethod | undefined }));
  // };

  // Unused handler (TS6133)
  // const handlePaymentDetailsChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  //   const { name, value } = event.target;
  //   setPaymentUIDetails(prev => ({ ...prev, [name]: value }));
  // };
  // Unused handler (TS6133)
  //  const handlePaymentDateChange = (dateStr: string | null) => {
  //   setPaymentUIDetails(prev => ({ ...prev, payment_date: dateStr }));
  // };


  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!formData.purchase_order) { // Changed from purchase_order_id
        showSnackbar('Purchase Order is required.', 'error');
        setIsSubmitting(false);
        return;
    }
    // Amount validation
    if (typeof formData.amount !== 'string' || !formData.amount.trim()) {
        setError('Amount is required and must be a valid number.'); // Use setError
        showSnackbar('Amount is required and must be a valid number.', 'error');
        setIsSubmitting(false);
        return;
    }

    const parsedAmount = parseFloat(formData.amount.trim());

    if (isNaN(parsedAmount)) {
        setError('Amount must be a valid number.'); // Use setError
        showSnackbar('Amount must be a valid number.', 'error');
        setIsSubmitting(false);
        return;
    }

    // At this point, parsedAmount is a valid number (not NaN)
    // Suppression comment no longer needed as TS2367 is resolved here.
    if (parsedAmount <= 0) {
        setError('Amount must be greater than zero.'); // Use setError
        showSnackbar('Amount must be greater than zero.', 'error');
        setIsSubmitting(false);
        return;
    }
    // End amount validation

    if (!formData.invoice_date) {
        showSnackbar('Invoice Date is required.', 'error');
        setIsSubmitting(false);
        return;
    }
     if (!formData.payee_name) {
        showSnackbar('Payee Name is required.', 'error');
        setIsSubmitting(false);
        return;
    }

    // Construct payload based on CheckRequestData for create
    // or CheckRequestUpdateData for update
    const commonPayload = {
      purchase_order: formData.purchase_order || null, // Ensure it's null if undefined
      invoice_number: formData.invoice_number || '',
      invoice_date: formData.invoice_date!, // Already validated
      amount: parsedAmount.toString(), // Use validated and parsed amount, convert to string for API
      payee_name: formData.payee_name!, // Already validated
      payee_address: formData.payee_address || '',
      reason_for_payment: formData.reason_for_payment || '',
    };

    try {
      let response: CheckRequest;
      if (isEditMode && formData.id) {
        // For update, only send fields that are part of CheckRequestUpdateData
        // and are actually editable in this form's context.
        // Example: amount, payee_name, reason_for_payment etc.
        // Do not send 'status' or payment details as part of a general update.
        const updatePayload: Partial<CheckRequestData> = { ...commonPayload };
        response = await updateCheckRequest(authenticatedFetch, formData.id, updatePayload);
        showSnackbar('Check Request updated successfully!', 'success');
      } else {
        const createPayload: CheckRequestData = { ...commonPayload };
        response = await createCheckRequest(authenticatedFetch, createPayload);
        showSnackbar('Check Request created successfully!', 'success');
      }
      navigate(`/procurement/check-requests/${response.id}`);
    } catch (err: unknown) {
      let message = 'Failed to save check request.';
      if (err instanceof Error) {
        message = err.message;
      }
      // Attempt to get more specific error from backend response structure
      // This assumes 'err' might be an object with 'data' and 'detail' properties
      // This is a common pattern but might need adjustment based on actual error structure
      const apiError = err as { data?: { detail?: string } };
      if (apiError.data?.detail) {
        message = apiError.data.detail;
      }
      setError(message);
      showSnackbar(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !isEditMode) { // If error and it's not an edit mode (i.e. creation failed to load something or initial error)
    return <Alert severity="error">{error}</Alert>;
  }

  const selectedPO = purchaseOrders.find(po => po.id === formData.purchase_order) || formData.purchase_order_obj;


  return (
    <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mr: 2 }}>
          Back
        </Button>
        <Typography variant="h5" component="h1">
          {isEditMode
            ? viewOnly
              ? `View Check Request #${currentCheckRequest?.id || formData.id}`
              : `Edit Check Request #${currentCheckRequest?.id || formData.id}`
            : 'Create New Check Request'}
        </Typography>
        {currentCheckRequest?.status && (
          <Chip
            label={CHECK_REQUEST_STATUS_DISPLAY[currentCheckRequest.status] || currentCheckRequest.status}
            color={getStatusChipColorForCheckRequest(currentCheckRequest.status)}
            sx={{ ml: 'auto' }}
          />
        )}
      </Box>

      {error && isEditMode && <Alert severity="warning" sx={{ mb:2 }}>{error} (Displaying last known data)</Alert>}


      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={purchaseOrders}
              getOptionLabel={(option) => `PO #${option.id} - ${option.vendor_details?.name || 'N/A'} (${formatCurrency(option.total_amount)})`}
              value={selectedPO || null}
              onChange={handlePOSelect}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField {...params} label="Select Purchase Order" variant="outlined" required disabled={viewOnly || isEditMode} />
              )}
              disabled={viewOnly || isEditMode} // PO cannot be changed after creation
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="invoice_number"
              label="Invoice Number"
              value={formData.invoice_number || ''}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              disabled={viewOnly}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="invoice_date"
              label="Invoice Date"
              type="date"
              value={formData.invoice_date || ''}
              onChange={(e) => handleDateChange('invoice_date', e.target.value)}
              fullWidth
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              required
              disabled={viewOnly}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="amount"
              label="Amount"
              type="number"
              value={formData.amount || ''}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              required
              InputProps={{
                inputProps: { min: 0.01, step: 0.01 },
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              disabled={viewOnly}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="payee_name"
              label="Payee Name"
              value={formData.payee_name || ''}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              required
              disabled={viewOnly || !!formData.purchase_order_obj}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="payee_address"
              label="Payee Address"
              value={formData.payee_address || ''}
              onChange={handleChange}
              fullWidth
              multiline
              rows={2} // Changed from 3 to 2 as per original subtask structure (minor detail)
              variant="outlined"
              disabled={viewOnly || !!formData.purchase_order_obj}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="reason_for_payment"
              label="Reason for Payment / Description"
              value={formData.reason_for_payment || ''}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              disabled={viewOnly}
            />
          </Grid>

          {isEditMode && currentCheckRequest && (
            <>
              <Grid item xs={12}><Divider sx={{ my: 2 }} /></Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Requested By</Typography>
                <Typography>{currentCheckRequest.requested_by_username || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>Request Date</Typography>
                <Typography>{formatDateString(currentCheckRequest.request_date)}</Typography>
              </Grid>

              {currentCheckRequest.approved_by_accounts_username && (
                <>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>Approved By Accounts</Typography>
                    <Typography>{currentCheckRequest.approved_by_accounts_username}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" gutterBottom>Approval Date</Typography>
                    <Typography>{formatDateString(currentCheckRequest.accounts_approval_date)}</Typography>
                  </Grid>
                </>
              )}
               {currentCheckRequest.accounts_comments && currentCheckRequest.status === 'rejected' && (
                 <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>Rejection Reason</Typography>
                    <Typography color="error">{currentCheckRequest.accounts_comments}</Typography>
                  </Grid>
               )}
            </>
          )}

          {/* Payment Information Section - Primarily for display from currentCheckRequest */}
          {/* Editing these fields should be part of a specific "Confirm Payment" action/dialog if needed */}
          {isEditMode && currentCheckRequest &&
            (currentCheckRequest.payment_method || currentCheckRequest.payment_date || currentCheckRequest.transaction_id) && (
            <>
              <Grid item xs={12}><Divider sx={{ my: 2 }}>Payment Information</Divider></Grid>
              <Grid item xs={12} md={6}>
                 <TextField
                  label="Payment Method"
                  value={currentCheckRequest.payment_method || 'N/A'}
                  fullWidth
                  variant="outlined"
                  InputProps={{ readOnly: true, style: { backgroundColor: '#f0f0f0' } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Payment Date"
                  type="date"
                  value={currentCheckRequest.payment_date ? formatDateString(currentCheckRequest.payment_date, 'YYYY-MM-DD') : 'N/A'}
                  fullWidth
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  InputProps={{ readOnly: true, style: { backgroundColor: '#f0f0f0' } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Transaction ID / Check No."
                  value={currentCheckRequest.transaction_id || 'N/A'}
                  fullWidth
                  variant="outlined"
                  InputProps={{ readOnly: true, style: { backgroundColor: '#f0f0f0' } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Payment Notes"
                  value={currentCheckRequest.payment_notes || 'N/A'}
                  fullWidth
                  multiline
                  rows={3}
                  variant="outlined"
                  InputProps={{ readOnly: true, style: { backgroundColor: '#f0f0f0' } }}
                />
              </Grid>
              {/* paid_by_user is not in CheckRequest type from API, so cannot display */}
            </>
          )}


          {!viewOnly && (
            <Grid item xs={12} sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting || isLoading}
                startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {isEditMode ? 'Save Changes' : 'Create Request'}
              </Button>
            </Grid>
          )}
        </Grid>
      </form>
    </Paper>
  );
};

export default CheckRequestForm;

// Ensure formatters are available or define basic versions here if not imported:
// const formatDateString = (dateStr: string | null | undefined, format?: string): string => {
//   if (!dateStr) return '';
//   const date = new Date(dateStr);
//   if (format === 'YYYY-MM-DD') {
//     return date.toISOString().split('T')[0];
//   }
//   return date.toLocaleDateString();
// };

// const formatCurrency = (amount: number | string | undefined | null): string => {
//   if (amount === null || amount === undefined) return '';
//   const num = typeof amount === 'string' ? parseFloat(amount) : amount;
//   if (isNaN(num)) return '';
//   return num.toLocaleString(undefined, { style: 'currency', currency: 'USD' }); // Adjust currency as needed
// };
