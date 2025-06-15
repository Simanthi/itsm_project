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
  FormControl, // Added
  InputLabel,  // Added
  Select,      // Added
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { SelectChangeEvent } from '@mui/material/Select';

import { useAuth } from '../../../context/auth/useAuth';
import { useUI } from '../../../context/UIContext/useUI';
import {
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  getPurchaseRequestMemos, // To fetch approved IOMs
  // getVendors,
} from '../../../api/procurementApi';
import { getVendors } from '../../../api/assetApi'; // Using Vendor list from assetApi
import type { Vendor } from '../../../api/assetApi'; // Import full Vendor type from assetApi
import type {
  PurchaseOrder,
  PurchaseOrderData,
  OrderItemData,
  PurchaseRequestMemo, // For IOM selection
  // Vendor, // Removed from here
  PurchaseOrderStatus,
  // PaginatedResponse, // Removed as it's not directly used for annotations in this file
  VendorSummary, // This is available from procurementApi for vendor_details in PurchaseOrder
} from '../../../api/procurementApi';

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
};

const initialOrderItemData: OrderItemData = {
  item_description: '',
  quantity: 1,
  unit_price: 0,
};

const PurchaseOrderForm: React.FC = () => {
  const { poId } = useParams<{ poId?: string }>();
  const navigate = useNavigate();
  const { authenticatedFetch } = useAuth(); // Removed currentUser
  const { showSnackbar } = useUI();

  const [formData, setFormData] = useState<Partial<PurchaseOrderData>>(initialFormData);
  const [orderItems, setOrderItems] = useState<OrderItemData[]>([initialOrderItemData]);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [approvedMemos, setApprovedMemos] = useState<PurchaseRequestMemo[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [viewOnlyMode, setViewOnlyMode] = useState<boolean>(false);
  const [displayHeaderData, setDisplayHeaderData] = useState<Partial<PurchaseOrder>>({});


  const fetchVendorsList = useCallback(async () => {
    if (!authenticatedFetch) return;
    try {
      const response = await getVendors(authenticatedFetch, { page: 1, pageSize: 200 }); // from assetApi
      setVendors(response.results);
    } catch (err) { console.error("Failed to fetch vendors:", err); }
  }, [authenticatedFetch]);

  const fetchApprovedMemos = useCallback(async () => {
    if (!authenticatedFetch) return;
    try {
      const response = await getPurchaseRequestMemos(authenticatedFetch, { status: 'approved', pageSize: 200 });
      setApprovedMemos(response.results);
    } catch (err) { console.error("Failed to fetch approved memos:", err); }
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
      const po = await getPurchaseOrderById(authenticatedFetch, parseInt(poId, 10));
      setFormData({
        po_number: po.po_number,
        vendor: po.vendor, // Expects vendor ID
        internal_office_memo: po.internal_office_memo || undefined,
        order_date: po.order_date?.split('T')[0],
        expected_delivery_date: po.expected_delivery_date?.split('T')[0] || null,
        status: po.status,
        shipping_address: po.shipping_address || '',
        notes: po.notes || '',
      });
      setOrderItems(po.order_items.map(item => ({
        id: item.id,
        item_description: item.item_description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })));
      setDisplayHeaderData({ created_by_username: po.created_by_username, created_at: po.created_at });
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
        setFormData(prev => ({...prev, po_number: `PO-${Date.now().toString().slice(-6)}`})); // Simple unique PO draft
    }
  }, [poId, fetchPurchaseOrderForEdit]); // Removed currentUser from dependency array (it was implicitly removed when currentUser was removed)

  const handleHeaderChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { // Removed SelectChangeEvent part
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name!]: value || null }));
  };

  const handleStatusChange = (event: SelectChangeEvent<PurchaseOrderStatus>) => { // Specific handler for status
    setFormData((prev) => ({ ...prev, status: event.target.value as PurchaseOrderStatus }));
  };

  const handleAutocompleteChange = (fieldName: keyof PurchaseOrderData, newValue: { id: number } | null) => {
    setFormData((prev) => ({ ...prev, [fieldName]: newValue ? newValue.id : null }));
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value || null }));
  };

  const handleItemChange = (index: number, event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    const items = [...orderItems];
    const itemToUpdate = { ...items[index] };

    if (name === 'item_description') {
      itemToUpdate.item_description = value;
    } else if (name === 'quantity') {
      // Ensure quantity is not set to 0 or negative from empty string, default to 1 or existing
      const numValue = Number(value);
      itemToUpdate.quantity = value === '' ? 1 : (numValue > 0 ? numValue : 1) ;
    } else if (name === 'unit_price') {
      itemToUpdate.unit_price = value === '' ? null : Number(value);
    }
    items[index] = itemToUpdate;
    setOrderItems(items);
  };

  const addItem = () => {
    setOrderItems([...orderItems, { ...initialOrderItemData }]);
  };

  const removeItem = (index: number) => {
    const items = [...orderItems];
    items.splice(index, 1);
    setOrderItems(items);
  };

  const handleIOMSelect = (_event: React.SyntheticEvent, selectedIOM: PurchaseRequestMemo | null) => { // Changed event to _event and typed
    if (selectedIOM) {
        setFormData(prev => ({
            ...prev,
            internal_office_memo: selectedIOM.id,
            // Potentially prefill other fields like notes from IOM's reason
            notes: prev.notes || `Based on IOM for: ${selectedIOM.item_description.substring(0,50)}... \nReason: ${selectedIOM.reason}`,
        }));
        // Prefill order items
        setOrderItems([{
            item_description: selectedIOM.item_description,
            quantity: selectedIOM.quantity,
            unit_price: selectedIOM.estimated_cost ? (selectedIOM.estimated_cost / selectedIOM.quantity) : 0,
        }]);
    } else {
        setFormData(prev => ({...prev, internal_office_memo: undefined }));
    }
  };

  const calculateOverallTotal = useCallback(() => {
    return orderItems.reduce((total, item) => {
      const itemTotal = (item.quantity || 0) * (item.unit_price || 0);
      return total + itemTotal;
    }, 0);
  }, [orderItems]);


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authenticatedFetch || !formData.vendor || !formData.order_date) {
      setError("Vendor and Order Date are required.");
      showSnackbar("Vendor and Order Date are required.", "warning");
      return;
    }
    if (orderItems.some(item => !item.item_description || item.quantity <= 0 || item.unit_price == null || item.unit_price < 0)) {
        setError("All order items must have a description, valid quantity, and valid unit price.");
        showSnackbar("Invalid order item data.", "warning");
        return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: PurchaseOrderData = {
      po_number: formData.po_number,
      vendor: Number(formData.vendor), // Ensure vendor ID is a number
      internal_office_memo: formData.internal_office_memo ? Number(formData.internal_office_memo) : null,
      order_date: formData.order_date,
      expected_delivery_date: formData.expected_delivery_date || null,
      status: formData.status as PurchaseOrderStatus, // Cast as it's from state
      shipping_address: formData.shipping_address || null,
      notes: formData.notes || null,
      order_items: orderItems.map(item => ({ // Ensure items are numbers
          item_description: item.item_description,
          quantity: Number(item.quantity),
          unit_price: item.unit_price != null ? Number(item.unit_price) : null,
          ...(item.id && {id: item.id}) // Include ID for updates if present
      })),
    };

    try {
      if (isEditMode && poId) {
        await updatePurchaseOrder(authenticatedFetch, parseInt(poId, 10), payload);
        showSnackbar('Purchase Order updated successfully!', 'success');
      } else {
        await createPurchaseOrder(authenticatedFetch, payload);
        showSnackbar('Purchase Order created successfully!', 'success');
      }
      navigate('/procurement/purchase-orders'); // Adjust navigation path
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to save PO: ${message}`);
      showSnackbar(`Error: ${message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !isEditMode) { // Show loading only for supporting data on new form if not edit mode
      return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }
  if (isLoading && isEditMode) { // Show loading for fetching PO data
      return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /><Typography sx={{ml:2}}>Loading Purchase Order...</Typography></Box>;
  }
  if (error && !isSubmitting) { // Initial load error
    return <Box sx={{p:3}}><Alert severity="error">{error}</Alert><Button onClick={() => navigate('/procurement/memos')} sx={{mt:2}}>Back to List</Button></Box>;
  }

  const currentTotalAmount = calculateOverallTotal();
  const effectiveViewOnly = viewOnlyMode || (isEditMode && formData.status !== 'draft' && formData.status !== 'pending_approval');


  return (
    <Paper sx={{ p: { xs: 2, md: 4 }, m: { xs: 1, md: 2 } }} elevation={3}>
      <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 3 }}>
        {isEditMode ? (effectiveViewOnly ? 'View Purchase Order' : 'Edit Purchase Order') : 'Create Purchase Order'}
        {isEditMode && formData.po_number && ` : ${formData.po_number}`}
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && isSubmitting && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={3}>
          {/* Header Fields */}
          <Grid item xs={12} md={4}>
            <TextField name="po_number" label="PO Number" value={formData.po_number || ''} onChange={handleHeaderChange} fullWidth InputProps={{readOnly: isEditMode}} disabled={isEditMode}/>
          </Grid>
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={vendors}
              getOptionLabel={(option) => option.name || ''}
              value={vendors.find(v => v.id === formData.vendor) || null}
              onChange={(_event, newValue) => handleAutocompleteChange('vendor', newValue)}
              renderInput={(params) => <TextField {...params} label="Vendor" required />}
              disabled={effectiveViewOnly}
            />
          </Grid>
           <Grid item xs={12} md={4}>
            <TextField name="order_date" label="Order Date" type="date" value={formData.order_date || ''} onChange={handleDateChange} InputLabelProps={{ shrink: true }} fullWidth required disabled={effectiveViewOnly} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Autocomplete
              options={approvedMemos}
              getOptionLabel={(option) => `${option.id}: ${option.item_description.substring(0,50)}... (Qty: ${option.quantity})`}
              value={approvedMemos.find(m => m.id === formData.internal_office_memo) || null}
              onChange={(_event, newValue) => {
                handleIOMSelect(_event, newValue); // Keep existing prefill logic
                handleAutocompleteChange('internal_office_memo', newValue);
              }}
              renderInput={(params) => <TextField {...params} label="Link Internal Office Memo (Optional)" />}
              disabled={effectiveViewOnly || isEditMode} // Cannot change IOM after PO creation
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField name="expected_delivery_date" label="Expected Delivery Date" type="date" value={formData.expected_delivery_date || ''} onChange={handleDateChange} InputLabelProps={{ shrink: true }} fullWidth disabled={effectiveViewOnly}/>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth required disabled={effectiveViewOnly && formData.status !== 'draft'}>
              <InputLabel id="po-status-select-label">Status</InputLabel>
              <Select
                labelId="po-status-select-label"
                id="po-status-select"
                name="status"
                value={formData.status || 'draft'}
                label="Status"
                onChange={handleStatusChange}
              >
                {PO_STATUS_CHOICES.map(option => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField name="shipping_address" label="Shipping Address" value={formData.shipping_address || ''} onChange={handleHeaderChange} fullWidth multiline rows={2} disabled={effectiveViewOnly}/>
          </Grid>
          <Grid item xs={12}>
            <TextField name="notes" label="Notes/Terms" value={formData.notes || ''} onChange={handleHeaderChange} fullWidth multiline rows={3} disabled={effectiveViewOnly}/>
          </Grid>

          {isEditMode && displayHeaderData && (
            <>
            <Grid item xs={12} sm={6}><Typography variant="body2" color="text.secondary">Created By: {displayHeaderData.created_by_username || 'N/A'}</Typography></Grid>
            <Grid item xs={12} sm={6}><Typography variant="body2" color="text.secondary">Created At: {displayHeaderData.created_at ? new Date(displayHeaderData.created_at).toLocaleString() : 'N/A'}</Typography></Grid>
            </>
          )}

          {/* Order Items Section */}
          <Grid item xs={12}><Typography variant="h6" sx={{ mt: 2, mb:1 }}>Order Items</Typography></Grid>
          <TableContainer component={Paper} variant="outlined" sx={{mb:2}}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{width: '50%'}}>Item Description</TableCell>
                  <TableCell align="right" sx={{width: '15%'}}>Quantity</TableCell>
                  <TableCell align="right" sx={{width: '20%'}}>Unit Price</TableCell>
                  <TableCell align="right" sx={{width: '15%'}}>Total</TableCell>
                  {!effectiveViewOnly && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {orderItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField value={item.item_description} name="item_description" onChange={(e) => handleItemChange(index, e)} fullWidth required size="small" InputProps={{readOnly: effectiveViewOnly}} disabled={effectiveViewOnly}/>
                    </TableCell>
                    <TableCell>
                      <TextField type="number" value={item.quantity} name="quantity" onChange={(e) => handleItemChange(index, e)} fullWidth required size="small" InputProps={{readOnly: effectiveViewOnly, inputProps: { min: 1 } }} disabled={effectiveViewOnly}/>
                    </TableCell>
                    <TableCell>
                      <TextField type="number" value={item.unit_price || ''} name="unit_price" onChange={(e) => handleItemChange(index, e)} fullWidth required size="small" InputProps={{readOnly: effectiveViewOnly, startAdornment: <InputAdornment position="start">$</InputAdornment>, inputProps: { step: "0.01", min:0 } }} disabled={effectiveViewOnly}/>
                    </TableCell>
                    <TableCell align="right">
                      ${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                    </TableCell>
                    {!effectiveViewOnly && (
                      <TableCell align="right">
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
            <Grid item xs={12} sx={{display: 'flex', justifyContent: 'flex-start'}}>
              <Button startIcon={<AddCircleOutlineIcon />} onClick={addItem} variant="outlined">
                Add Item
              </Button>
            </Grid>
          )}
          <Grid item xs={12} sx={{display: 'flex', justifyContent: 'flex-end', mt:1}}>
            <Typography variant="h6">Overall Total: ${calculateOverallTotal().toFixed(2)}</Typography>
          </Grid>

          <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" color="secondary" onClick={() => navigate(-1)} disabled={isSubmitting}>
              Cancel
            </Button>
            {!effectiveViewOnly && (
              <Button type="submit" variant="contained" color="primary" disabled={isSubmitting || isLoading}>
                {isSubmitting ? <CircularProgress size={24} /> : (isEditMode ? 'Update Purchase Order' : 'Create Purchase Order')}
              </Button>
            )}
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default PurchaseOrderForm;
