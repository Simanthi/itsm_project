// src/modules/service-requests/components/ServiceRequestForm.tsx

import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  MenuItem,
  Grid,
  Paper,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ClearIcon from '@mui/icons-material/Clear';
import { useNavigate } from 'react-router-dom';

// Import the updated types
import {
  type NewServiceRequestFormData,
  type ServiceRequest,
  type ServiceRequestStatus, // Import the types for dropdown options
  type ServiceRequestCategory,
  type ServiceRequestPriority,
} from '../types/ServiceRequestTypes';
import { useServiceRequests } from '../hooks/useServiceRequests';


// Helper function to get initial form data, handling both new and edit modes
const getInitialFormData = (data?: ServiceRequest): NewServiceRequestFormData => {
  if (data) {
    return {
      title: data.title,
      description: data.description,
      status: data.status || 'new',
      category: data.category || 'software',
      priority: data.priority || 'medium',
      // Explicitly ensure assigned_to is a string. If null or undefined, default to ''
      assigned_to: data.assigned_to === null || data.assigned_to === undefined ? '' : data.assigned_to,
      resolution_notes: data.resolution_notes || '',
    };
  }
  return {
    title: '',
    description: '',
    status: 'new', // Default status for new requests
    category: 'software', // Default category
    priority: 'medium', // Default priority
    assigned_to: '', // Default to empty for new requests
    resolution_notes: '', // Default to empty for new requests
  };
};

// Define a type for validation errors
type FormErrors = {
  [key in keyof NewServiceRequestFormData]?: string;
};

interface ServiceRequestFormProps {
  initialData?: ServiceRequest; // Optional prop for initial data in edit mode
}

function ServiceRequestForm({ initialData }: ServiceRequestFormProps) {
  const navigate = useNavigate();
  const { addServiceRequest, updateServiceRequest } = useServiceRequests();
  const [formData, setFormData] = useState<NewServiceRequestFormData>(
    getInitialFormData(initialData)
  );
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    // Re-initialize form data when initialData changes (e.g., switching between edit modes)
    // Only update if initialData is actually different to prevent unnecessary re-renders
    // A shallow compare might be enough, or a deep compare if initialData can change internally without ID.
    // For now, let's assume initialData reference changes if content changes for edit mode.
    setFormData(getInitialFormData(initialData));
    setErrors({});
  }, [initialData]); // Depend on initialData changing

  // Validation options matching Django model choices
  const statusOptions: ServiceRequestStatus[] = ['new', 'in_progress', 'pending_approval', 'resolved', 'closed', 'cancelled'];
  const categoryOptions: ServiceRequestCategory[] = ['software', 'hardware', 'account', 'network', 'information', 'other'];
  const priorityOptions: ServiceRequestPriority[] = ['low', 'medium', 'high'];

  // Mock list of assignees (replace with actual user data from API in a real app)
  const mockAssignees = [
    { id: 'user_1', name: 'Agent John' },
    { id: 'user_2', name: 'Agent Jane' },
    { id: 'user_3', name: 'Supervisor Mike' },
    // Add more as needed, or fetch from your backend
  ];


  // Validate individual field
  const validateField = (name: keyof NewServiceRequestFormData, value: string): string => {
    let error = '';
    if ((name === 'title' || name === 'description') && !value.trim()) {
      error = `${name.charAt(0).toUpperCase() + name.slice(1)} is required.`;
    }
    if (name === 'title') {
      if (value.trim().length < 3 && value.trim().length > 0) {
        error = 'Title must be at least 3 characters long.';
      } else if (value.trim().length > 255) {
        error = 'Title cannot exceed 255 characters.';
      }
    }
    if (name === 'description' && value.trim().length > 10000) {
      error = 'Description cannot exceed 10000 characters.';
    }
    if (name === 'status' && !statusOptions.includes(value as ServiceRequestStatus)) {
      error = 'Invalid status selected.';
    }
    if (name === 'category' && !categoryOptions.includes(value as ServiceRequestCategory)) {
      error = 'Invalid category selected.';
    }
    if (name === 'priority' && !priorityOptions.includes(value as ServiceRequestPriority)) {
      error = 'Invalid priority selected.';
    }
    if (name === 'resolution_notes' && (formData.status === 'resolved' || formData.status === 'closed')) {
      if (!value.trim()) {
        error = 'Resolution notes are required when status is resolved or closed.';
      }
    }
    return error;
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    (Object.keys(formData) as Array<keyof NewServiceRequestFormData>).forEach((fieldName) => {
      const isAssignedToVisible = initialData?.id || formData.status !== 'new';
      const isResolutionNotesVisible = formData.status === 'resolved' || formData.status === 'closed' || formData.status === 'cancelled';
      if ((fieldName === 'assigned_to' && !isAssignedToVisible) ||
          (fieldName === 'resolution_notes' && !isResolutionNotesVisible)) {
        return;
      }

      const errorMessage = validateField(fieldName, formData[fieldName] as string);
      if (errorMessage) {
        newErrors[fieldName] = errorMessage;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof NewServiceRequestFormData;

    setFormData((prevData) => ({
      ...prevData,
      [fieldName]: value,
    }));

    setErrors((prevErrors) => ({
      ...prevErrors,
      [fieldName]: validateField(fieldName, value as string),
    }));
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      console.log('Form has validation errors. Preventing submission.');
      return;
    }

    console.log('Form data is valid. Submitting:', formData);

    if (initialData?.id) {
      const updatedRequest: ServiceRequest = {
        ...initialData,
        ...formData,
        status: formData.status as ServiceRequestStatus,
        category: formData.category as ServiceRequestCategory,
        priority: formData.priority as ServiceRequestPriority,
        // Ensure assigned_to and resolution_notes are correctly set to null if empty
        assigned_to: formData.assigned_to || null,
        resolution_notes: formData.resolution_notes || null,
      };
      updateServiceRequest(updatedRequest);
      console.log('Updated Service Request:', updatedRequest);
    } else {
      const newRequestData: NewServiceRequestFormData = {
        ...formData,
        assigned_to: formData.assigned_to || null,
        resolution_notes: formData.resolution_notes || null,
      };
      addServiceRequest(newRequestData);
      console.log('New Service Request Data:', newRequestData);
    }

    navigate('/service-requests');
  };

  const resetForm = () => {
    setFormData(getInitialFormData(initialData));
    setErrors({});
  };

  // Determine if 'Assigned To' should be visible (for edit mode or if status is not 'new')
  // AND ensure formData.assigned_to has been initialized to a string value.
  // We use `typeof formData.assigned_to === 'string'` as an extra check.
  const showAssignedTo = (initialData?.id || formData.status !== 'new') && typeof formData.assigned_to === 'string';

  // Determine if 'Resolution Notes' should be visible (when status is resolved/closed/cancelled)
  const showResolutionNotes = formData.status === 'resolved' || formData.status === 'closed' || formData.status === 'cancelled';


  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <form onSubmit={handleSubmit} noValidate>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              error={!!errors.title}
              helperText={errors.title}
              required
              margin="normal"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={4}
              error={!!errors.description}
              helperText={errors.description}
              required
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              error={!!errors.status}
              helperText={errors.status}
              required
              margin="normal"
            >
              {statusOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              error={!!errors.category}
              helperText={errors.category}
              required
              margin="normal"
            >
              {categoryOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              error={!!errors.priority}
              helperText={errors.priority}
              required
              margin="normal"
            >
              {priorityOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* NEW FIELD: Assigned To (Conditionally rendered) */}
          {showAssignedTo && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Assigned To"
                name="assigned_to"
                value={formData.assigned_to} // formData.assigned_to is guaranteed string by getInitialFormData
                onChange={handleChange}
                error={!!errors.assigned_to}
                helperText={errors.assigned_to}
                margin="normal"
              >
                <MenuItem value="">Unassigned</MenuItem>
                {mockAssignees.map((assignee) => (
                  <MenuItem key={assignee.id} value={assignee.id}> {/* assignee.id is already a string */}
                    {assignee.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}

          {/* NEW FIELD: Resolution Notes (Conditionally rendered) */}
          {showResolutionNotes && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Resolution Notes"
                name="resolution_notes"
                value={formData.resolution_notes}
                onChange={handleChange}
                multiline
                rows={4}
                error={!!errors.resolution_notes}
                helperText={errors.resolution_notes}
                margin="normal"
              />
            </Grid>
          )}

          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<ClearIcon />}
              onClick={resetForm}
            >
              Clear
            </Button>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              startIcon={<SendIcon />}
            >
              {initialData?.id ? 'Save Changes' : 'Submit Request'}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
}

export default ServiceRequestForm;