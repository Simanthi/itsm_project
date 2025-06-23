import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Box,
  Typography,
  MenuItem,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  FormHelperText, // For file input
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile'; // For file input
import type { SelectChangeEvent } from '@mui/material/Select'; // Keep this import

import { useAuth } from '../../../../context/auth/useAuth';
import { useUI } from '../../../../context/UIContext/useUI';
import {
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  getPurchaseRequestMemos, // To fetch approved IOMs
  // getVendors,
} from '../../../../api/procurementApi';
import { getVendors } from '../../../../api/assetApi'; // Using Vendor list from assetApi
import type { Vendor } from '../../../../api/assetApi'; // Import full Vendor type from assetApi
import type {
  PurchaseOrder,
  PurchaseOrderData,
  OrderItemData,
  OrderItem, // Import OrderItem for mapping fetched PO items
  PurchaseRequestMemo,
  PurchaseOrderStatus,
} from '../../types';

// PO Status choices for the dropdown
const PO_STATUS_CHOICES: { value: PurchaseOrderStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved / Sent to Vendor' },
  { value: 'partially_received', label: 'Partially Received' },
  { value: 'fully_received', label: 'Fully Received' },
  { value: 'invoiced', label: 'Invoiced' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

const initialFormData: Partial<PurchaseOrderData> = {
  po_number: '', // Often auto-generated or manually entered
  vendor: undefined, // Use undefined for Autocomplete if nothing selected
  internal_office_memo: undefined,
  order_date: new Date().toISOString().split('T')[0], // Default to today
  expected_delivery_date: null,
  status: 'draft',
  shipping_address: '',
  notes: '',
  order_items: [],
  // New fields for initial form data
  payment_terms: '',
  shipping_method: '',
  billing_address: null,
  po_type: null,
  related_contract: null,
  attachments: null,
  currency: 'INR', // Changed Default currency to INR
  // revision_number is usually backend managed on update
};

// Mock data for dropdowns - replace with API calls
const mockPoTypes = [
    { value: 'goods', label: 'Goods' },
    { value: 'services', label: 'Services' },
    { value: 'subscription', label: 'Subscription' },
    { value: 'framework_agreement', label: 'Framework Agreement' },
];
const mockContracts = [ // Example contracts
    { id: 1, title: "Master Service Agreement - Vendor A" },
    { id: 2, title: "Software License - Tech Corp" },
];
const mockCurrencies = [
    { value: 'INR', label: 'INR - Indian Rupee' },
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'KES', label: 'KES - Kenyan Shilling' },
    { value: 'GBP', label: 'GBP - British Pound' },
];
const mockGLAccounts = [ // Example GL Accounts
    { id: 101, code: '6001 - Office Supplies' },
    { id: 102, code: '6002 - Software Licenses' },
    { id: 103, code: '7005 - IT Equipment' },
];
// End mock data

// InitialOrderItemData should fully conform to OrderItemData type
const initialOrderItemData: OrderItemData = {
  item_description: '',
  quantity: 1,
  unit_price: 0,
  product_code: '',
  gl_account: null,
  received_quantity: 0,
  line_item_status: 'pending',
  tax_rate: null,
  discount_type: 'fixed',
  discount_value: null,
  // id is optional for new items
};

const PurchaseOrderForm: React.FC = () => {
  const { poId } = useParams<{ poId?: string }>();
  const navigate = useNavigate();
  const { authenticatedFetch } = useAuth(); // Removed currentUser
  const { showSnackbar } = useUI();

  const [formData, setFormData] =
    useState<Partial<PurchaseOrderData>>(initialFormData);
  const [orderItems, setOrderItems] = useState<OrderItemData[]>([
    initialOrderItemData,
  ]);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [approvedMemos, setApprovedMemos] = useState<PurchaseRequestMemo[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [viewOnlyMode, setViewOnlyMode] = useState<boolean>(false);
  const [displayHeaderData, setDisplayHeaderData] = useState<
    Partial<PurchaseOrder>
  >({});

  const fetchVendorsList = useCallback(async () => {
    if (!authenticatedFetch) return;
    try {
      const response = await getVendors(authenticatedFetch, {
        page: 1,
        pageSize: 200,
      }); // from assetApi
      setVendors(response.results);
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    }
  }, [authenticatedFetch]);

  const fetchApprovedMemos = useCallback(async () => {
    if (!authenticatedFetch) return;
    try {
      const response = await getPurchaseRequestMemos(authenticatedFetch, {
        status: 'approved',
        pageSize: 200,
      });
      setApprovedMemos(response.results);
    } catch (err) {
      console.error('Failed to fetch approved memos:', err);
    }
  }, [authenticatedFetch]);

  useEffect(() => {
    fetchVendorsList();
    fetchApprovedMemos();
  }, [fetchVendorsList, fetchApprovedMemos]);

  const fetchPurchaseOrderForEdit = useCallback(async () => {
    if (!poId || !authenticatedFetch) return;
    setIsLoading(true);
    setError(null);
    try {
      const po = await getPurchaseOrderById(
        authenticatedFetch,
        parseInt(poId, 10),
      );
      setFormData({
        po_number: po.po_number,
        vendor: po.vendor, // Expects vendor ID
        internal_office_memo: po.internal_office_memo || undefined,
        order_date: po.order_date?.split('T')[0],
        expected_delivery_date:
          po.expected_delivery_date?.split('T')[0] || null,
        status: po.status,
        shipping_address: po.shipping_address || '',
        notes: po.notes || '',
        // New fields for edit mode
        payment_terms: po.payment_terms || '',
        shipping_method: po.shipping_method || '',
        billing_address: po.billing_address || null,
        po_type: po.po_type || null,
        related_contract: po.related_contract || null,
        currency: po.currency || 'USD',
        // attachments: po.attachments, // Existing attachment URL
        // revision_number: po.revision_number, // Display only
      });
      setOrderItems(
        po.order_items.map((item: OrderItem) => ({ // Use OrderItem type here for full data
          id: item.id,
          item_description: item.item_description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          // New order item fields
          product_code: item.product_code || '',
          gl_account: item.gl_account || null,
          received_quantity: item.received_quantity || 0,
          line_item_status: item.line_item_status || 'pending',
          tax_rate: item.tax_rate || null,
          discount_type: item.discount_type || 'fixed',
          discount_value: item.discount_value || null,
        })),
      );
      setDisplayHeaderData({
        created_by_username: po.created_by_username,
        created_at: po.created_at,
        po_number: po.po_number, // For display
        revision_number: po.revision_number, // For display
        attachments: po.attachments, // Existing attachment URL for display
      });
      setIsEditMode(true);
      // Determine if form should be view-only based on status (example)
      if (po.status !== 'draft' && po.status !== 'pending_approval') {
        setViewOnlyMode(true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to load PO: ${message}`);
      showSnackbar(`Error: ${message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [poId, authenticatedFetch, showSnackbar]);

  useEffect(() => {
    if (poId) {
      fetchPurchaseOrderForEdit();
    } else {
      setFormData((prev) => ({
        ...prev,
        po_number: `PO-${Date.now().toString().slice(-6)}`,
      })); // Simple unique PO draft
    }
  }, [poId, fetchPurchaseOrderForEdit]); // Removed currentUser from dependency array (it was implicitly removed when currentUser was removed)

  const handleHeaderChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }
    >,
  ) => {
    const { name, value } = event.target;
    if (name === 'attachments') {
      const files = (event.target as HTMLInputElement).files;
      setFormData((prev) => ({
        ...prev,
        attachments: files && files.length > 0 ? files[0] : null,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name as string]: value || null }));
    }
  };

  const handleStatusChange = (
    event: SelectChangeEvent<PurchaseOrderStatus>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      status: event.target.value as PurchaseOrderStatus,
    }));
  };

  const handleSelectChange = (event: SelectChangeEvent<string | number>, fieldName: keyof PurchaseOrderData) => {
    setFormData((prev) => ({ ...prev, [fieldName as string]: event.target.value || null }));
  };


  const handleAutocompleteChange = (
    fieldName: keyof PurchaseOrderData,
    newValue: { id: number } | null,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: newValue ? newValue.id : null,
    }));
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value || null }));
  };

  const handleItemChange = (
    index: number,
    // Updated event type to include SelectChangeEvent
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string | number | ''>,
  ) => {
    // For Select, event.target.name might not be directly available in the same way,
    // so we might need to pass the field name explicitly if 'name' attribute isn't working as expected with Select's event.
    // However, MUI's Select usually does pass event.target.name if the 'name' prop is set on the Select component.
    const name = (event.target as HTMLInputElement | HTMLSelectElement).name; // Type assertion to access name
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;

    const items = [...orderItems];
    const currentItem = { ...items[index] };

    // Helper to safely convert to number or null
    const toNumberOrNull = (val: string | number): number | null => {
        const num = Number(val);
        return isNaN(num) ? null : num;
    };
    const toNumberOrDefault = (val: string | number, defaultValue: number): number => {
        const num = Number(val);
        return isNaN(num) ? defaultValue : num;
    };


    switch (name) {
      case 'item_description':
      case 'product_code':
        currentItem[name] = value as string;
        break;
      case 'quantity':
        currentItem.quantity = toNumberOrDefault(value, 1);
        if (currentItem.quantity <=0) currentItem.quantity = 1; // Ensure positive
        break;
      case 'unit_price':
      case 'tax_rate':
      case 'discount_value':
        currentItem[name as 'unit_price' | 'tax_rate' | 'discount_value'] = toNumberOrNull(value);
        break;
      case 'discount_type':
        currentItem.discount_type = value as OrderItemData['discount_type'];
        break;
      case 'received_quantity':
         currentItem.received_quantity = toNumberOrDefault(value,0);
         break;
      case 'gl_account': // Assuming value is account ID
        currentItem.gl_account = value ? Number(value) : null;
        break;
      case 'line_item_status':
        currentItem.line_item_status = value as OrderItemData['line_item_status'];
        break;
      default:
        break;
    }
    items[index] = currentItem;
    setOrderItems(items);
  };


  const addItem = () => {
    setOrderItems([...orderItems, { ...initialOrderItemData, quantity: 1, unit_price:0 }]); // Ensure new items have defaults
  };

  const removeItem = (index: number) => {
    const items = [...orderItems];
    items.splice(index, 1);
    setOrderItems(items);
  };

  const handleIOMSelect = (
    _event: React.SyntheticEvent,
    selectedIOM: PurchaseRequestMemo | null,
  ) => {
    // Changed event to _event and typed
    if (selectedIOM) {
      setFormData((prev) => ({
        ...prev,
        internal_office_memo: selectedIOM.id,
        // Potentially prefill other fields like notes from IOM's reason
        notes:
          prev.notes ||
          `Based on IOM for: ${selectedIOM.item_description.substring(0, 50)}... \nReason: ${selectedIOM.reason}`,
      }));
      // Prefill order items
      setOrderItems([
        {
          item_description: selectedIOM.item_description,
          quantity: selectedIOM.quantity,
          unit_price: selectedIOM.estimated_cost
            ? selectedIOM.estimated_cost / selectedIOM.quantity
            : 0,
        },
      ]);
    } else {
      setFormData((prev) => ({ ...prev, internal_office_memo: undefined }));
    }
  };

  const calculateOverallTotal = useCallback(() => {
    return orderItems.reduce((total, item: OrderItemData) => {
      const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
      return total + itemTotal;
    }, 0);
  }, [orderItems]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authenticatedFetch || !formData.vendor || !formData.order_date) {
      setError('Vendor and Order Date are required.');
      showSnackbar('Vendor and Order Date are required.', 'warning');
      return;
    }
    if (
      orderItems.some(
        (item) =>
          !item.item_description ||
          item.quantity <= 0 ||
          item.unit_price == null ||
          item.unit_price < 0,
      )
    ) {
      setError(
        'All order items must have a description, valid quantity, and valid unit price.',
      );
      showSnackbar('Invalid order item data.', 'warning');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const submissionPayload = new FormData();

    // Append header fields to FormData
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'order_items') return; // Handled separately
      if (value instanceof File) {
        submissionPayload.append(key, value, value.name);
      } else if (value !== null && value !== undefined) {
        submissionPayload.append(key, String(value));
      }
    });
     // Ensure vendor ID is a number string if present
    if (formData.vendor != null) {
        submissionPayload.set('vendor', String(Number(formData.vendor)));
    }
    // Ensure IOM ID is a number string if present
    if (formData.internal_office_memo != null) {
        submissionPayload.set('internal_office_memo', String(Number(formData.internal_office_memo)));
    }
     // Ensure related_contract ID is a number string if present
    if (formData.related_contract != null) {
        submissionPayload.set('related_contract', String(Number(formData.related_contract)));
    }


    // Append order_items as JSON string - backend needs to parse this
    // Alternatively, send items as form array data: order_items[0][field_name], order_items[1][field_name]
    // JSON string is often simpler if backend supports it.
    const itemsForPayload = orderItems.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unit_price: item.unit_price != null ? Number(item.unit_price) : null,
        gl_account: item.gl_account != null ? Number(item.gl_account) : null,
        tax_rate: item.tax_rate != null ? Number(item.tax_rate) : null,
        discount_type: item.discount_type || 'fixed',
        discount_value: item.discount_value != null ? Number(item.discount_value) : null,
        received_quantity: Number(item.received_quantity)
    }));
    submissionPayload.append('order_items_json', JSON.stringify(itemsForPayload));


    try {
      if (isEditMode && poId) {
        await updatePurchaseOrder(
          authenticatedFetch,
          parseInt(poId, 10),
          submissionPayload, // No longer need 'as FormData'
        );
        showSnackbar('Purchase Order updated successfully!', 'success');
      } else {
        await createPurchaseOrder(authenticatedFetch, submissionPayload); // No longer need 'as FormData'
        showSnackbar('Purchase Order created successfully!', 'success');
      }
      navigate('/procurement/purchase-orders'); // Adjust navigation path
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Add more detailed error parsing if backend sends structured errors
       try {
        const errorResponse = JSON.parse(message); // Assuming error is JSON string
        let detailedError = 'Failed to save PO: ';
        for (const key in errorResponse) {
          detailedError += `${key}: ${errorResponse[key].join ? errorResponse[key].join(', ') : errorResponse[key]}; `;
        }
        setError(detailedError);
      } catch /* istanbul ignore next */ { // Removed unused parseError variable
         setError(`Failed to save PO: ${message}`);
      }
      showSnackbar(`Error: ${message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !isEditMode) {
    // Show loading only for supporting data on new form if not edit mode
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (isLoading && isEditMode) {
    // Show loading for fetching PO data
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading Purchase Order...</Typography>
      </Box>
    );
  }
  if (error && !isSubmitting) {
    // Initial load error
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate('/procurement/memos')} sx={{ mt: 2 }}>
          Back to List
        </Button>
      </Box>
    );
  }

  // const currentTotalAmount = calculateOverallTotal(); // Variable was confirmed unused and removed. Direct call in JSX.
  const effectiveViewOnly =
    viewOnlyMode ||
    (isEditMode &&
      formData.status !== 'draft' &&
      formData.status !== 'pending_approval');

  return (
    <Paper sx={{ p: { xs: 2, md: 4 }, m: { xs: 1, md: 2 } }} elevation={3}>
      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
        {isEditMode
          ? effectiveViewOnly
            ? 'View Purchase Order'
            : 'Edit Purchase Order'
          : 'Create Purchase Order'}
        {isEditMode && formData.po_number && ` : ${formData.po_number}`}
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && isSubmitting && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={3}>
          {/* Header Fields */}
          <Grid item xs={12} md={4}>
            <TextField
              name="po_number"
              label="PO Number"
              value={formData.po_number || ''}
              onChange={handleHeaderChange}
              fullWidth
              InputProps={{ readOnly: isEditMode }}
              disabled={isEditMode}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={vendors}
              getOptionLabel={(option) => option.name || ''}
              value={vendors.find((v) => v.id === formData.vendor) || null}
              onChange={(_event, newValue) =>
                handleAutocompleteChange('vendor', newValue)
              }
              renderInput={(params) => (
                <TextField {...params} label="Vendor" required />
              )}
              disabled={effectiveViewOnly}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              name="order_date"
              label="Order Date"
              type="date"
              value={formData.order_date || ''}
              onChange={handleDateChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
              disabled={effectiveViewOnly}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={approvedMemos}
              getOptionLabel={(option) =>
                `${option.id}: ${option.item_description.substring(0, 50)}... (Qty: ${option.quantity})`
              }
              value={
                approvedMemos.find(
                  (m) => m.id === formData.internal_office_memo,
                ) || null
              }
              onChange={(_event, newValue) => {
                handleIOMSelect(_event, newValue); // Keep existing prefill logic
                handleAutocompleteChange('internal_office_memo', newValue);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Link Internal Office Memo (Optional)"
                />
              )}
              disabled={effectiveViewOnly || isEditMode} // Cannot change IOM after PO creation
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              name="payment_terms"
              label="Payment Terms"
              value={formData.payment_terms || ''}
              onChange={handleHeaderChange}
              fullWidth
              InputProps={{ readOnly: effectiveViewOnly }}
              disabled={effectiveViewOnly}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              name="shipping_method"
              label="Shipping Method"
              value={formData.shipping_method || ''}
              onChange={handleHeaderChange}
              fullWidth
              InputProps={{ readOnly: effectiveViewOnly }}
              disabled={effectiveViewOnly}
            />
          </Grid>
           <Grid item xs={12} md={4}>
            <TextField
              name="expected_delivery_date"
              label="Expected Delivery Date"
              type="date"
              value={formData.expected_delivery_date || ''}
              onChange={handleDateChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
              disabled={effectiveViewOnly}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl
              fullWidth
              required
              disabled={effectiveViewOnly && formData.status !== 'draft'}
            >
              <InputLabel id="po-status-select-label">Status</InputLabel>
              <Select
                labelId="po-status-select-label"
                id="po-status-select"
                name="status"
                value={formData.status || 'draft'}
                label="Status"
                onChange={handleStatusChange}
              >
                {PO_STATUS_CHOICES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
           <Grid item xs={12} md={4}>
            <FormControl fullWidth disabled={effectiveViewOnly}>
              <InputLabel id="po-type-label">PO Type</InputLabel>
              <Select
                labelId="po-type-label"
                name="po_type"
                value={formData.po_type || ''}
                label="PO Type"
                onChange={(e) => handleSelectChange(e, 'po_type')}
              >
                <MenuItem value=""><em>None</em></MenuItem>
                {mockPoTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
             <FormControl fullWidth disabled={effectiveViewOnly}>
                <InputLabel id="currency-select-label">Currency</InputLabel>
                <Select
                    labelId="currency-select-label"
                    name="currency"
                    value={formData.currency || 'USD'}
                    label="Currency"
                    onChange={(e) => handleSelectChange(e, 'currency')}
                >
                    {mockCurrencies.map((currency) => (
                    <MenuItem key={currency.value} value={currency.value}>
                        {currency.label}
                    </MenuItem>
                    ))}
                </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={mockContracts}
              getOptionLabel={(option) => option.title || ''}
              value={mockContracts.find(c => c.id === formData.related_contract) || null}
              onChange={(_event, newValue) => handleAutocompleteChange('related_contract', newValue)}
              renderInput={(params) => <TextField {...params} label="Related Contract (Optional)" />}
              disabled={effectiveViewOnly}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="shipping_address"
              label="Shipping Address"
              value={formData.shipping_address || ''}
              onChange={handleHeaderChange}
              fullWidth
              multiline
              rows={2}
              disabled={effectiveViewOnly}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              name="billing_address"
              label="Billing Address (Optional)"
              value={formData.billing_address || ''}
              onChange={handleHeaderChange}
              fullWidth
              multiline
              rows={2}
              disabled={effectiveViewOnly}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="notes"
              label="Notes/Terms"
              value={formData.notes || ''}
              onChange={handleHeaderChange}
              fullWidth
              multiline
              rows={3}
              disabled={effectiveViewOnly}
            />
          </Grid>
           {/* Attachments Input */}
           <Grid item xs={12}>
            <Button
                variant="outlined"
                component="label"
                startIcon={<UploadFileIcon />}
                disabled={effectiveViewOnly}
                fullWidth
            >
                Upload PO Attachment
                <input type="file" hidden name="attachments" onChange={handleHeaderChange} />
            </Button>
            {formData.attachments && (
                <FormHelperText>Selected: {(formData.attachments as File).name}</FormHelperText>
            )}
            {isEditMode && displayHeaderData.attachments && typeof displayHeaderData.attachments === 'string' && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                    Current attachment: <a href={displayHeaderData.attachments as string} target="_blank" rel="noopener noreferrer">View Attachment</a>
                    {' '}(Uploading a new file will replace it)
                </Typography>
            )}
          </Grid>

          {isEditMode && displayHeaderData && (
            <>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Created By: {displayHeaderData.created_by_username || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Created At:{' '}
                  {displayHeaderData.created_at
                    ? new Date(displayHeaderData.created_at).toLocaleString()
                    : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Revision: {displayHeaderData.revision_number || 0}
                </Typography>
              </Grid>
            </>
          )}

          {/* Order Items Section */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
              Order Items
            </Typography>
          </Grid>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, width:'100%' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 200 }}>Item Description</TableCell>
                  <TableCell sx={{minWidth: 120}}>Product Code</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell sx={{minWidth: 150}}>GL Account</TableCell>
                  <TableCell align="right">Rcvd Qty</TableCell>
                  <TableCell sx={{minWidth: 150}}>Line Status</TableCell>
                  <TableCell align="right">Tax (%)</TableCell>
                   <TableCell sx={{minWidth: 100}}>Disc. Type</TableCell>
                   <TableCell align="right">Disc. Value</TableCell>
                  <TableCell align="right">Total</TableCell>
                  {!effectiveViewOnly && (
                    <TableCell align="center">Actions</TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {orderItems.map((item: OrderItemData, index: number) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField name="item_description" value={item.item_description} onChange={(e) => handleItemChange(index, e)} fullWidth required size="small" InputProps={{ readOnly: effectiveViewOnly }} disabled={effectiveViewOnly}/>
                    </TableCell>
                     <TableCell>
                      <TextField name="product_code" value={item.product_code || ''} onChange={(e) => handleItemChange(index, e)} fullWidth size="small" InputProps={{ readOnly: effectiveViewOnly }} disabled={effectiveViewOnly}/>
                    </TableCell>
                    <TableCell>
                      <TextField type="number" name="quantity" value={item.quantity} onChange={(e) => handleItemChange(index, e)} fullWidth required size="small" InputProps={{ readOnly: effectiveViewOnly, inputProps: { min: 1 } }} disabled={effectiveViewOnly}/>
                    </TableCell>
                    <TableCell>
                      <TextField type="number" name="unit_price" value={item.unit_price || ''} onChange={(e) => handleItemChange(index, e)} fullWidth required size="small" InputProps={{ readOnly: effectiveViewOnly, startAdornment: (<InputAdornment position="start">{formData.currency === 'KES' ? 'KES' : formData.currency === 'INR' ? '₹' : '$'}</InputAdornment>), inputProps: { step: '0.01', min: 0 } }} disabled={effectiveViewOnly}/>
                    </TableCell>
                    <TableCell>
                        <FormControl fullWidth size="small" disabled={effectiveViewOnly}>
                            {/* Removed duplicate FormControl wrapper here */}
                            <Select name="gl_account" value={item.gl_account || ''} onChange={(e) => handleItemChange(index, e)} displayEmpty>
                                <MenuItem value=""><em>None</em></MenuItem>
                                {mockGLAccounts.map(acc => <MenuItem key={acc.id} value={acc.id}>{acc.code}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </TableCell>
                    <TableCell>
                      <TextField type="number" name="received_quantity" value={item.received_quantity || 0} onChange={(e) => handleItemChange(index, e)} fullWidth size="small" InputProps={{ readOnly: effectiveViewOnly, inputProps: { min: 0 } }} disabled={effectiveViewOnly}/>
                    </TableCell>
                    <TableCell>
                        <FormControl fullWidth size="small" disabled={effectiveViewOnly}>
                            <Select name="line_item_status" value={item.line_item_status || 'pending'} onChange={(e) => handleItemChange(index, e)} >
                                <MenuItem value="pending">Pending</MenuItem>
                                <MenuItem value="partially_received">Partially Received</MenuItem>
                                <MenuItem value="fully_received">Fully Received</MenuItem>
                                <MenuItem value="cancelled">Cancelled</MenuItem>
                                <MenuItem value="invoiced">Invoiced</MenuItem>
                            </Select>
                        </FormControl>
                    </TableCell>
                    <TableCell>
                      <TextField type="number" name="tax_rate" value={item.tax_rate || ''} onChange={(e) => handleItemChange(index, e)} fullWidth size="small" InputProps={{ readOnly: effectiveViewOnly, inputProps: { step: '0.01', min: 0 } }} disabled={effectiveViewOnly}/>
                    </TableCell>
                    <TableCell>
                        <FormControl fullWidth size="small" disabled={effectiveViewOnly}>
                            <Select name="discount_type" value={item.discount_type || 'fixed'} onChange={(e) => handleItemChange(index, e)}>
                                <MenuItem value="fixed">Fixed</MenuItem>
                                <MenuItem value="percentage">Percentage</MenuItem>
                            </Select>
                        </FormControl>
                     </TableCell>
                     <TableCell>
                       <TextField type="number" name="discount_value" value={item.discount_value || ''} onChange={(e) => handleItemChange(index, e)} fullWidth size="small" InputProps={{ readOnly: effectiveViewOnly, inputProps: { step: '0.01', min: 0 } }} disabled={effectiveViewOnly}/>
                    </TableCell>
                    <TableCell align="right">
                      {formData.currency === 'KES' ? 'KES' : formData.currency === 'INR' ? '₹' : '$'}
                      {/* This total calculation needs to be more robust in OrderItem type using @property if it includes tax/discount */}
                      {((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                    </TableCell>
                    {!effectiveViewOnly && (
                      <TableCell align="center">
                        <IconButton onClick={() => removeItem(index)} color="error" size="small" disabled={orderItems.length <= 1}>
                          <DeleteOutlineIcon />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {!effectiveViewOnly && (
            <Grid
              item
              xs={12}
              sx={{ display: 'flex', justifyContent: 'flex-start' }}
            >
              <Button
                startIcon={<AddCircleOutlineIcon />}
                onClick={addItem}
                variant="outlined"
              >
                Add Item
              </Button>
            </Grid>
          )}
          <Grid
            item
            xs={12}
            sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}
          >
            <Typography variant="h6">
              Overall Total: ${calculateOverallTotal().toFixed(2)}
            </Typography>
          </Grid>

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
            {!effectiveViewOnly && (
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting ? (
                  <CircularProgress size={24} />
                ) : isEditMode ? (
                  'Update Purchase Order'
                ) : (
                  'Create Purchase Order'
                )}
              </Button>
            )}
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default PurchaseOrderForm;
