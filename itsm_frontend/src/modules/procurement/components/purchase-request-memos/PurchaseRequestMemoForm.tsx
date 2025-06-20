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
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select'; // Import SelectChangeEvent
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import { useAuth } from '../../../../context/auth/useAuth';
import { useUI } from '../../../../context/UIContext/useUI';
import {
  getPurchaseRequestMemoById,
  createPurchaseRequestMemo,
  updatePurchaseRequestMemo,
  getDepartmentsForDropdown, // Import new API functions
  getProjectsForDropdown,
  // getVendorsForDropdown, // Assuming getVendors from assetApi is used
} from '../../../../api/procurementApi';
import { getVendors } from '../../../../api/assetApi'; // For suggested vendor
import type {
  PurchaseRequestMemo,
  PurchaseRequestMemoData,
  // PurchaseRequestMemoUpdateData, // formData type will handle partial updates
  Department, // Import types for dropdown data
  Project,
  Vendor, // Using Vendor from assetApi for consistency
} from '../../types';

const initialFormData: PurchaseRequestMemoData = {
  item_description: '',
  quantity: 1,
  reason: '',
  estimated_cost: null,
  // New fields for initial form data (from PurchaseRequestMemoData)
  department: null,
  project: null,
  priority: 'medium',
  required_delivery_date: null,
  suggested_vendor: null,
  attachments: null, // This is File | null for *Data types
};

// Mock data for dropdowns - replace with API calls in a real app
// These would ideally be fetched from a central store or context if used across multiple forms
const mockDepartments = [
  { id: 1, name: 'Finance' },
  { id: 2, name: 'Human Resources' },
  { id: 3, name: 'IT Department' },
  { id: 4, name: 'Operations' },
];

const mockProjects = [
  { id: 1, name: 'Project Alpha' },
  { id: 2, name: 'Project Beta' },
  { id: 3, name: 'Project Gamma' },
];

const mockVendors = [
  { id: 1, name: 'Vendor A Supplies' },
  { id: 2, name: 'Vendor B Services' },
  { id: 3, name: 'Vendor C Tech' },
];
// End mock data

const PurchaseRequestMemoForm: React.FC = () => {
  const { memoId } = useParams<{ memoId?: string }>();
  const navigate = useNavigate();
  const { authenticatedFetch, user } = useAuth();
  const { showSnackbar } = useUI();

  // State for form data
  const [formData, setFormData] = useState<PurchaseRequestMemoData>(initialFormData);

  // State for displaying read-only fields from the fetched memo (when editing/viewing)
  const [displayData, setDisplayData] = useState<Partial<PurchaseRequestMemo>>({});

  // States for dropdown options
  const [departments, setDepartments] = useState<Department[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);


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
        item_description: memo.item_description,
        quantity: memo.quantity,
        reason: memo.reason,
        estimated_cost: memo.estimated_cost || null,
        // Set new editable fields
        department: memo.department || null,
        project: memo.project || null,
        priority: memo.priority || 'medium',
        required_delivery_date: memo.required_delivery_date || null,
        suggested_vendor: memo.suggested_vendor || null,
        // attachments: memo.attachments, // File handling is tricky; display existing, allow new upload
      });
      // Store all data for display purposes, including new fields
      setDisplayData({
        requested_by_username: memo.requested_by_username,
        request_date: new Date(memo.request_date).toLocaleDateString(),
        status: memo.status,
        approver_username: memo.approver_username,
        decision_date: memo.decision_date
          ? new Date(memo.decision_date).toLocaleDateString()
          : undefined,
        approver_comments: memo.approver_comments,
        // Display new fields
        iom_id: memo.iom_id,
        department_name: memo.department_name,
        project_name: memo.project_name,
        priority: memo.priority,
        required_delivery_date: memo.required_delivery_date
          ? new Date(memo.required_delivery_date).toLocaleDateString()
          : undefined,
        suggested_vendor_name: memo.suggested_vendor_name,
        attachments: memo.attachments, // Store URL of existing attachment if available
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

  // Fetch dropdown data on component mount
  useEffect(() => {
    const loadDropdownData = async () => {
      if (!authenticatedFetch) return;
      try {
        const [deptRes, projRes, vendRes] = await Promise.all([
          getDepartmentsForDropdown(authenticatedFetch),
          getProjectsForDropdown(authenticatedFetch),
          getVendors(authenticatedFetch, { page: 1, pageSize: 200 }), // From assetApi
        ]);
        setDepartments(deptRes.results);
        setProjects(projRes.results);
        setVendors(vendRes.results);
      } catch (err) {
        console.error('Failed to load dropdown data', err);
        showSnackbar('Could not load necessary data for dropdowns.', 'error');
      }
    };
    loadDropdownData();
  }, [authenticatedFetch, showSnackbar]);


  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, // Standard input/textarea
  ) => {
    const { name, value } = event.target;
    if (name === 'quantity' || name === 'estimated_cost') {
      setFormData((prev) => ({
        ...prev,
        [name]: value === '' ? null : Number(value),
      }));
    } else { // For text fields like item_description, reason
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (event: SelectChangeEvent<string | number | ''>, fieldName: keyof PurchaseRequestMemoData) => {
    setFormData(prev => ({ ...prev, [fieldName as string]: event.target.value === '' ? null : event.target.value as string | number }));
  };

  // The main `handleChange` already handles file inputs if `name="attachments"` is set on the input.
  // The separate `handleFileChange` was indeed redundant.

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

    // Create a FormData object for multipart/form-data for file uploads
    const submissionPayload = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (value instanceof File) {
        submissionPayload.append(key, value, value.name);
      } else if (value !== null && value !== undefined) {
        submissionPayload.append(key, String(value));
      }
    });
    // Ensure quantity is a number string
    if (formData.quantity != null) {
        submissionPayload.set('quantity', String(Number(formData.quantity)));
    }
    // Ensure estimated_cost is a number string or not present if null
    if (formData.estimated_cost != null) {
        submissionPayload.set('estimated_cost', String(Number(formData.estimated_cost)));
    } else {
        submissionPayload.delete('estimated_cost');
    }
    // Ensure FKs are numbers or not present if null
    ['department', 'project', 'suggested_vendor'].forEach(fkKey => {
        const fkValue = formData[fkKey as keyof typeof formData];
        if (fkValue != null) {
            submissionPayload.set(fkKey, String(Number(fkValue)));
        } else {
            submissionPayload.delete(fkKey);
        }
    });


    try {
      if (isEditMode && memoId) {
        // Update might need to handle file differently or use PATCH with JSON for non-file fields
        // For simplicity, if attachments is a File, it's a new upload.
        // If it's a string (URL), we might not want to resend it unless it's cleared.
        // This example assumes updatePurchaseRequestMemo can handle FormData.
        await updatePurchaseRequestMemo(
          authenticatedFetch,
          parseInt(memoId, 10),
          submissionPayload, // No longer need 'as FormData'
        );
        showSnackbar('Purchase request updated successfully!', 'success');
      } else {
        await createPurchaseRequestMemo(
          authenticatedFetch,
          submissionPayload, // No longer need 'as FormData'
        );
        showSnackbar('Purchase request created successfully!', 'success');
      }
      navigate('/procurement/iom');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Attempt to parse backend error if it's a JSON response
      // This is a common pattern but might need adjustment based on your API
      try {
        const errorResponse = JSON.parse(message);
        let detailedError = 'Failed to save: ';
        for (const key in errorResponse) {
          detailedError += `${key}: ${errorResponse[key].join ? errorResponse[key].join(', ') : errorResponse[key]}; `;
        }
        setError(detailedError);
      } catch /* istanbul ignore next */ (parseErrorUntyped) { // Removed unused parseError variable
        setError(`Failed to save purchase request: ${message}`);
      }
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
          <Grid item xs={12} sm={4}>
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
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth disabled={readOnlyMode}>
              <InputLabel id="priority-select-label">Priority</InputLabel>
              <Select
                labelId="priority-select-label"
                id="priority-select"
                name="priority"
                value={formData.priority || 'medium'}
                label="Priority"
                onChange={(e) => handleSelectChange(e, 'priority')}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="required_delivery_date"
              label="Required Delivery Date (Optional)"
              type="date"
              value={formData.required_delivery_date || ''}
              onChange={handleChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              InputProps={{ readOnly: readOnlyMode }}
              disabled={readOnlyMode}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={readOnlyMode}>
              <InputLabel id="suggested-vendor-label">
                Suggested Vendor (Optional)
              </InputLabel>
              <Select
                labelId="suggested-vendor-label"
                name="suggested_vendor"
                value={formData.suggested_vendor || ''}
                label="Suggested Vendor (Optional)"
                onChange={(e) => handleSelectChange(e, 'suggested_vendor')}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {vendors.map((vendor) => ( // Use fetched vendors
                  <MenuItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
          {/* Department and Project Selects */}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={readOnlyMode}>
              <InputLabel id="department-select-label">
                Department (Optional)
              </InputLabel>
              <Select
                labelId="department-select-label"
                name="department"
                value={formData.department || ''}
                label="Department (Optional)"
                onChange={(e) => handleSelectChange(e, 'department')}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {departments.map((dept) => ( // Use fetched departments
                  <MenuItem key={dept.id} value={dept.id}>
                    {dept.department_code ? `${dept.department_code} - ${dept.name}` : dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth disabled={readOnlyMode}>
              <InputLabel id="project-select-label">
                Project (Optional)
              </InputLabel>
              <Select
                labelId="project-select-label"
                name="project"
                value={formData.project || ''}
                label="Project (Optional)"
                onChange={(e) => handleSelectChange(e, 'project')}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {projects.map((proj) => ( // Use fetched projects
                  <MenuItem key={proj.id} value={proj.id}>
                    {proj.project_code ? `${proj.project_code} - ${proj.name}` : proj.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Attachments Input */}
          <Grid item xs={12}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
              disabled={readOnlyMode}
              fullWidth
            >
              Upload Attachment
              <input
                type="file"
                hidden
                name="attachments"
                onChange={handleChange}
              />
            </Button>
            {formData.attachments && (
              <FormHelperText>
                Selected: {(formData.attachments as File).name}
              </FormHelperText>
            )}
            {isEditMode && displayData.attachments && typeof displayData.attachments === 'string' && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Current attachment: <a href={displayData.attachments as string} target="_blank" rel="noopener noreferrer">View Attachment</a>
                {' '}(Uploading a new file will replace it)
              </Typography>
            )}
          </Grid>


          {isEditMode && (
            <>
              {/* Display IOM ID if available */}
              {displayData.iom_id && (
                 <Grid item xs={12} sm={6}>
                    <Typography variant="body2">
                      <strong>IOM ID:</strong> {displayData.iom_id}
                    </Typography>
                  </Grid>
              )}
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
              {/* Display new fields in view/edit mode */}
              {displayData.department_name && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Department:</strong> {displayData.department_name}
                  </Typography>
                </Grid>
              )}
              {displayData.project_name && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Project:</strong> {displayData.project_name}
                  </Typography>
                </Grid>
              )}
               <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Priority:</strong> {displayData.priority || 'N/A'}
                  </Typography>
                </Grid>
              {displayData.required_delivery_date && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Required Delivery:</strong> {displayData.required_delivery_date}
                  </Typography>
                </Grid>
              )}
              {displayData.suggested_vendor_name && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2">
                    <strong>Suggested Vendor:</strong> {displayData.suggested_vendor_name}
                  </Typography>
                </Grid>
              )}
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
