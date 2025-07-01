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
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText, // For file input
  Switch, // For is_urgent
  FormControlLabel, // For Switch label
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadFileIcon from '@mui/icons-material/UploadFile'; // For file input
import { useAuth } from '../../../../context/auth/useAuth';
import { useUI } from '../../../../context/UIContext/useUI';
import {
  getCheckRequestById,
  createCheckRequest,
  updateCheckRequest,
  getPurchaseOrders,
} from '../../../../api/procurementApi';
import type {
  CheckRequest,
  CheckRequestData,
  // CheckRequestUpdateData, // Not directly used for form state type, covered by Partial<CheckRequestData>
  CheckRequestStatus,
  PurchaseOrder,
} from '../../types';
import { formatDate, formatCurrency } from '../../../../utils/formatters'; // Corrected import
import type { SelectChangeEvent } from '@mui/material/Select'; // Import SelectChangeEvent


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

// Define a more specific type for the form's state, ensuring all fields from CheckRequestData are included as optional
// and add any UI-specific helper fields.
type CheckRequestFormState = Partial<CheckRequestData> & {
    id?: number; // For edit mode
    purchase_order_obj?: PurchaseOrder | null; // For Autocomplete object
    // Ensure all fields from CheckRequestData are potentially part of this state
    // (they are already optional due to Partial<CheckRequestData>)
};


const initialFormData: CheckRequestFormState = {
  // Fields from CheckRequestData (all optional here due to Partial)
  purchase_order: undefined,
  invoice_number: '',
  invoice_date: '',
  amount: '0.00',
  payee_name: '',
  payee_address: '',
  reason_for_payment: '',
  expense_category: null,
  is_urgent: false,
  recurring_payment: null,
  attachments: null,
  currency: 'INR', // Changed Default currency to INR
  // UI-specific helper fields
  purchase_order_obj: null,
};

// Mock data for dropdowns - replace with API calls
const mockExpenseCategories = [
    { id: 1, name: 'Office Supplies' },
    { id: 2, name: 'Software Licenses' },
    { id: 3, name: 'Travel & Expenses' },
    { id: 4, name: 'Utilities' },
];
const mockRecurringPayments = [ // Example recurring payments
    { id: 1, name: 'Monthly Software Subscription A' },
    { id: 2, name: 'Annual Domain Renewal B' },
];
const mockCurrencies = [ // Same as PO form
    { value: 'INR', label: 'INR - Indian Rupee' },
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'KES', label: 'KES - Kenyan Shilling' },
    { value: 'GBP', label: 'GBP - British Pound' },
];
// End mock data

// Helper types for more specific API error handling
interface ApiErrorValue {
  [key: string]: string | string[]; // For nested errors, though primary use is direct field errors
}

interface ApiErrorResponse {
  detail?: string; // Global error message
  // For field errors, keys are field names, values are arrays of error strings or a single string.
  // This allows for other potential string-keyed errors as well.
  [key: string]: string | string[] | ApiErrorValue | undefined;
}


// Helper function for chip color
const getStatusChipColorForCheckRequest = (
  status: CheckRequestStatus | undefined,
):
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning' => {
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

  const [formData, setFormData] = useState<CheckRequestFormState>(initialFormData);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [viewOnly, setViewOnly] = useState<boolean>(false);
  const [currentCheckRequest, setCurrentCheckRequest] =
    useState<CheckRequest | null>(null);

  const fetchCheckRequest = useCallback(
    async (id: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getCheckRequestById(authenticatedFetch, id);
        const selectedPOForEdit = purchaseOrders.find(
          (po) => po.id === data.purchase_order,
        );

        setFormData({
          // Spread only fields that are part of CheckRequestData or the extended form state
          id: data.id,
          purchase_order: data.purchase_order || undefined,
          invoice_number: data.invoice_number || '',
          invoice_date: data.invoice_date
            ? formatDate(data.invoice_date, 'YYYY-MM-DD') // Corrected usage
            : '',
          amount: data.amount || '0.00', // amount is string in CheckRequest
          payee_name: data.payee_name || '',
          payee_address: data.payee_address || '',
          reason_for_payment: data.reason_for_payment || '',
          purchase_order_obj: selectedPOForEdit || null,
          // New fields for edit mode
          expense_category: data.expense_category || null,
          is_urgent: data.is_urgent || false,
          recurring_payment: data.recurring_payment || null,
          currency: data.currency || 'USD',
          // attachments: data.attachments, // Existing attachment URL
          // cr_id is part of currentCheckRequest, not formData
        });
        setCurrentCheckRequest(data); // This will hold cr_id, attachments URL etc.
        setIsEditMode(true);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to fetch check request details.';
        setError(errorMessage);
        showSnackbar(errorMessage, 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [authenticatedFetch, showSnackbar, purchaseOrders],
  );

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
        const poData = await getPurchaseOrders(authenticatedFetch, {
          status__in: ['approved', 'fully_received'],
        });
        setPurchaseOrders(poData.results || []);
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to fetch purchase orders.';
        showSnackbar(errorMessage, 'error');
        console.error('Failed to fetch POs:', err);
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

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }
    >,
  ) => {
    const { name, value, type } = event.target as HTMLInputElement;
    if (name === 'attachments') {
      const files = (event.target as HTMLInputElement).files;
      setFormData((prev) => ({
        ...prev,
        attachments: files && files.length > 0 ? files[0] : null,
      }));
    } else if (type === 'checkbox' && name === 'is_urgent') {
      setFormData((prev) => ({ ...prev, is_urgent: (event.target as HTMLInputElement).checked }));
    }
    else {
      setFormData((prev) => ({ ...prev, [name as string]: value }));
    }
  };

  const handleDateChange = (
    fieldName: keyof Pick<CheckRequestData, 'invoice_date'>, // This might need to be more generic if other dates are added
    dateStr: string | null,
  ) => {
    setFormData((prev) => ({ ...prev, [fieldName as string]: dateStr }));
  };

  const handleSelectChange = (event: SelectChangeEvent<string | number | ''>, fieldName: keyof CheckRequestData) => {
    setFormData(prev => ({ ...prev, [fieldName as string]: event.target.value as string | number | null }));
  };

// Removed unused state and handlers for paymentUIDetails as they were not part of active form submission logic.
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

  const handlePOSelect = (
    _event: React.SyntheticEvent,
    value: PurchaseOrder | null,
  ) => {
    setFormData((prev) => ({
      ...prev,
      purchase_order: value?.id, // Changed from purchase_order_id
      purchase_order_obj: value,
      payee_name: value?.vendor_details?.name || prev.payee_name,
      // amount should be string
      amount: ((): string | undefined => {
        // Ensure IIFE returns string | undefined
        const prevAmountStr = String(prev.amount || '').trim();
        const isPrevAmountZeroOrEmpty =
          prevAmountStr === '0.00' ||
          prevAmountStr === '0' ||
          prevAmountStr === '';
        if (isPrevAmountZeroOrEmpty && value?.total_amount !== undefined) {
          return String(value.total_amount); // This is string
        }
        // prev.amount is already string | undefined from formData's type
        return prev.amount as string | undefined;
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
    console.log('[CheckRequestForm handleSubmit] formData:', JSON.stringify(formData, null, 2)); // Added for debugging tests
    setIsSubmitting(true);
    setError(null);

    // Basic Validations
    console.log('[DEBUG] In handleSubmit, before PO/Reason validation:',
                'PO:', formData.purchase_order,
                'Reason:', formData.reason_for_payment,
                'Condition met?:', (!formData.purchase_order && !formData.reason_for_payment));
    if (!formData.purchase_order && !formData.reason_for_payment) {
      // Allow if reason_for_payment is provided even without PO
      showSnackbar('Either Purchase Order or a detailed Reason for Payment is required.', 'error');
      setIsSubmitting(false); // Ensure isSubmitting is reset
      return;
    }
    if (typeof formData.amount !== 'string' || !formData.amount.trim()) {
      showSnackbar('Amount is required and must be a valid number.', 'error');
      setIsSubmitting(false); // Ensure isSubmitting is reset
      return;
    }
    const parsedAmount = parseFloat(formData.amount.trim());
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showSnackbar('Amount must be a valid positive number.', 'error');
      setIsSubmitting(false); // Ensure isSubmitting is reset
      return;
    }
    if (!formData.payee_name) {
      showSnackbar('Payee Name is required.', 'error');
      setIsSubmitting(false); // Ensure isSubmitting is reset
      return;
    }
    // Invoice date is good practice but might be optional for non-PO requests
    // if (!formData.invoice_date && formData.purchase_order) {
    //   showSnackbar('Invoice Date is required when linking to a Purchase Order.', 'error');
    //   setIsSubmitting(false);
    //   return;
    // }


    const submissionPayload = new FormData();

    // Append fields to FormData
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'purchase_order_obj') return; // Don't send the whole object

      if (value instanceof File) {
        submissionPayload.append(key, value, value.name);
      } else if (key === 'is_urgent') {
        submissionPayload.append(key, String(Boolean(value)));
      }
       else if (value !== null && value !== undefined) {
        submissionPayload.append(key, String(value));
      }
    });
    // Ensure numeric fields are correctly formatted or omitted if null
    if (formData.purchase_order != null) {
        submissionPayload.set('purchase_order', String(Number(formData.purchase_order)));
    } else {
        submissionPayload.delete('purchase_order');
    }
    if (formData.expense_category != null) {
        submissionPayload.set('expense_category', String(Number(formData.expense_category)));
    } else {
        submissionPayload.delete('expense_category');
    }
     if (formData.recurring_payment != null) {
        submissionPayload.set('recurring_payment', String(Number(formData.recurring_payment)));
    } else {
        submissionPayload.delete('recurring_payment');
    }
    submissionPayload.set('amount', parsedAmount.toFixed(2)); // Send validated amount as string


    try {
      if (isEditMode && formData.id) {
        await updateCheckRequest(
          authenticatedFetch,
          formData.id,
          submissionPayload, // No longer need 'as FormData'
        );
        showSnackbar('Check Request updated successfully!', 'success');
      } else {
        await createCheckRequest(authenticatedFetch, submissionPayload); // No longer need 'as FormData'
        showSnackbar('Check Request created successfully!', 'success');
      }
      navigate('/procurement/check-requests');
    } catch (err: unknown) {
      let message = 'Failed to save check request.';
      if (err instanceof Error) {
        message = err.message;
      }
      // Use the more specific ApiErrorResponse type
      const apiError = err as { data?: ApiErrorResponse };
      if (apiError?.data) {
        if (typeof apiError.data.detail === 'string') {
          message = apiError.data.detail;
        } else {
          let structuredError = "";
          for (const fieldKey in apiError.data) {
            // Skip 'detail' if it was not a string and handled above, or other non-field error keys
            if (fieldKey === 'detail' || typeof apiError.data[fieldKey] === 'function') continue;

            const errorValue = apiError.data[fieldKey];
            if (typeof errorValue === 'string') {
              structuredError += `${fieldKey}: ${errorValue}; `;
            } else if (Array.isArray(errorValue)) {
              structuredError += `${fieldKey}: ${errorValue.join(', ')}; `;
            } else if (typeof errorValue === 'object' && errorValue !== null) {
              // Handle nested objects if necessary, though DRF usually gives string/array for field errors
              // This part might need adjustment based on actual complex error structures.
              // For now, stringify if it's an object that's not string/array.
              structuredError += `${fieldKey}: ${JSON.stringify(errorValue)}; `;
            }
          }
          if (structuredError) message = structuredError.trim();
          // If after all this, message is still the generic one and structuredError is empty,
          // but apiError.data exists, it might be an unhandled structure.
          // For now, this covers common DRF error responses (detail string or field errors).
        }
      }
      setError(message); // Ensure message is updated if it was parsed
      showSnackbar(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error && !isEditMode) {
    // If error and it's not an edit mode (i.e. creation failed to load something or initial error)
    return <Alert severity="error">{error}</Alert>;
  }

  const selectedPO =
    purchaseOrders.find((po) => po.id === formData.purchase_order) ||
    formData.purchase_order_obj;

  return (
    <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mr: 2 }}
        >
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
            label={
              CHECK_REQUEST_STATUS_DISPLAY[currentCheckRequest.status] ||
              currentCheckRequest.status
            }
            color={getStatusChipColorForCheckRequest(
              currentCheckRequest.status,
            )}
            sx={{ ml: 'auto' }}
          />
        )}
      </Box>

      {error && isEditMode && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error} (Displaying last known data)
        </Alert>
      )}

      <form onSubmit={handleSubmit} aria-label={isEditMode ? (viewOnly ? "View Check Request Form" : "Edit Check Request Form") : "Create Check Request Form"}>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={purchaseOrders}
              getOptionLabel={(option) =>
                `PO #${option.id} - ${option.vendor_details?.name || 'N/A'} (${formatCurrency(option.total_amount)})`
              }
              value={selectedPO || null}
              onChange={handlePOSelect}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Purchase Order"
                  variant="outlined"
                  required
                  disabled={viewOnly || isEditMode}
                />
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
          <Grid item xs={12} md={3}>
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
                startAdornment: (
                  <InputAdornment position="start">
                    {formData.currency === 'KES' ? 'KES' : formData.currency === 'INR' ? '₹' : '$'}
                  </InputAdornment>
                ),
              }}
              disabled={viewOnly}
            />
          </Grid>
           <Grid item xs={12} md={3}>
            <FormControl fullWidth disabled={viewOnly}>
                <InputLabel id="currency-cr-select-label">Currency</InputLabel>
                <Select
                    labelId="currency-cr-select-label"
                    name="currency"
                    value={formData.currency || 'INR'}
                    label="Currency"
                    onChange={(e) => handleSelectChange(e as SelectChangeEvent<string | number>, 'currency')}
                >
                    {mockCurrencies.map((currency) => (
                    <MenuItem key={currency.value} value={currency.value}>
                        {currency.label}
                    </MenuItem>
                    ))}
                </Select>
            </FormControl>
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

          {/* New CR Fields: Expense Category, Is Urgent, Recurring Payment, Attachments */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth disabled={viewOnly}>
              <InputLabel id="expense-category-label">Expense Category</InputLabel>
              <Select
                labelId="expense-category-label"
                name="expense_category"
                value={formData.expense_category || ''}
                label="Expense Category"
                onChange={(e) => handleSelectChange(e as SelectChangeEvent<string | number>, 'expense_category')}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {mockExpenseCategories.map(cat => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={mockRecurringPayments}
              getOptionLabel={(option) => option.name || ''}
              value={mockRecurringPayments.find(rp => rp.id === formData.recurring_payment) || null}
              onChange={(_event, newValue) => {
                setFormData(prev => ({ ...prev, recurring_payment: newValue ? newValue.id : null }));
              }}
              renderInput={(params) => <TextField {...params} label="Link Recurring Payment (Optional)" />}
              disabled={viewOnly}
            />
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_urgent || false}
                  onChange={handleChange}
                  name="is_urgent"
                  disabled={viewOnly}
                />
              }
              label="Urgent Payment?"
            />
          </Grid>
          <Grid item xs={12}>
            <Button
                variant="outlined"
                component="label"
                startIcon={<UploadFileIcon />}
                disabled={viewOnly}
                fullWidth
            >
                Upload CR Attachment
                <input type="file" hidden name="attachments" onChange={handleChange} />
            </Button>
            {formData.attachments && (
                <FormHelperText>Selected: {(formData.attachments as File).name}</FormHelperText>
            )}
            {isEditMode && currentCheckRequest?.attachments && typeof currentCheckRequest.attachments === 'string' && (
                 <Typography variant="body2" sx={{ mt: 1 }}>
                    Current attachment: <a href={currentCheckRequest.attachments as string} target="_blank" rel="noopener noreferrer">View Attachment</a>
                    {' '}(Uploading a new file will replace it)
                </Typography>
            )}
          </Grid>


          {isEditMode && currentCheckRequest && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                 <Typography variant="h6" gutterBottom sx={{mb:1}}>Details</Typography>
              </Grid>
               {currentCheckRequest.cr_id && (
                 <Grid item xs={12} md={3}>
                    <Typography variant="caption" display="block" color="textSecondary">CR ID</Typography>
                    <Typography>{currentCheckRequest.cr_id}</Typography>
                  </Grid>
              )}
              <Grid item xs={12} md={3}>
                <Typography variant="caption" display="block" color="textSecondary">Requested By</Typography>
                <Typography>
                  {currentCheckRequest.requested_by_username || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="caption" display="block" color="textSecondary">Request Date</Typography>
                <Typography>
                  {formatDate(currentCheckRequest.request_date)}
                </Typography>
              </Grid>
               <Grid item xs={12} md={3}>
                <Typography variant="caption" display="block" color="textSecondary">Expense Category</Typography>
                <Typography>
                  {currentCheckRequest.expense_category_name || mockExpenseCategories.find(ec => ec.id === currentCheckRequest?.expense_category)?.name || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="caption" display="block" color="textSecondary">Recurring Payment</Typography>
                <Typography>
                  {currentCheckRequest.recurring_payment_details || mockRecurringPayments.find(rp => rp.id === currentCheckRequest?.recurring_payment)?.name || 'N/A'}
                </Typography>
              </Grid>
               <Grid item xs={12} md={3}>
                <Typography variant="caption" display="block" color="textSecondary">Urgent</Typography>
                <Typography>
                  {currentCheckRequest.is_urgent ? 'Yes' : 'No'}
                </Typography>
              </Grid>


              {currentCheckRequest.approved_by_accounts_username && (
                <>
                  <Grid item xs={12} md={6}>
                     <Typography variant="caption" display="block" color="textSecondary" sx={{mt:1}}>Approved By Accounts</Typography>
                    <Typography>
                      {currentCheckRequest.approved_by_accounts_username}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" display="block" color="textSecondary" sx={{mt:1}}>Approval Date</Typography>
                    <Typography>
                      {formatDate( // Corrected usage
                        currentCheckRequest.accounts_approval_date,
                      )}
                    </Typography>
                  </Grid>
                </>
              )}
              {currentCheckRequest.accounts_comments &&
                currentCheckRequest.status === 'rejected' && (
                  <Grid item xs={12}>
                    <Typography variant="caption" display="block" color="textSecondary" sx={{mt:1}}>Rejection Reason</Typography>
                    <Typography color="error">
                      {currentCheckRequest.accounts_comments}
                    </Typography>
                  </Grid>
                )}
            </>
          )}

          {/* Payment Information Section - Primarily for display from currentCheckRequest */}
          {isEditMode &&
            currentCheckRequest &&
            (currentCheckRequest.payment_method ||
              currentCheckRequest.payment_date ||
              currentCheckRequest.transaction_id) && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }}><Typography variant="overline">Payment Information</Typography></Divider>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Payment Method"
                    value={currentCheckRequest.payment_method || 'N/A'}
                    fullWidth
                    variant="outlined"
                    InputProps={{
                      readOnly: true,
                      style: { backgroundColor: '#f0f0f0' },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Payment Date"
                    type="date"
                    value={
                      currentCheckRequest.payment_date
                        ? formatDate( // Corrected usage
                            currentCheckRequest.payment_date,
                            'YYYY-MM-DD',
                          )
                        : 'N/A'
                    }
                    fullWidth
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    InputProps={{
                      readOnly: true,
                      style: { backgroundColor: '#f0f0f0' },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Transaction ID / Check No."
                    value={currentCheckRequest.transaction_id || 'N/A'}
                    fullWidth
                    variant="outlined"
                    InputProps={{
                      readOnly: true,
                      style: { backgroundColor: '#f0f0f0' },
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Payment Notes"
                    value={currentCheckRequest.payment_notes || 'N/A'}
                    fullWidth
                    multiline
                    rows={2}
                    variant="outlined"
                    InputProps={{
                      readOnly: true,
                      style: { backgroundColor: '#f0f0f0' },
                    }}
                  />
                </Grid>
              </>
            )}

          {!viewOnly && (
            <Grid
              item
              xs={12}
              sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}
            >
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting || isLoading}
                startIcon={
                  isSubmitting ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : null
                }
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
