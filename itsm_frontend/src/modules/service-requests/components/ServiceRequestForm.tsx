// itsm_frontend/src/features/serviceRequests/pages/ServiceRequestForm.tsx
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

import { type NewServiceRequestFormData, type ServiceRequest } from '../types/ServiceRequestTypes';
import { useServiceRequests } from '../hooks/useServiceRequests';


// Helper function to get initial form data, handling both new and edit modes
const getInitialFormData = (data?: ServiceRequest): NewServiceRequestFormData => {
  if (data) {
    return {
      title: data.title,
      description: data.description,
      status: data.status,
      requestedBy: data.requestedBy,
      requestedDate: data.requestedDate,
    };
  }
  return {
    title: '',
    description: '',
    status: 'Open', // Default status for new requests
    requestedBy: '',
    requestedDate: (() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  })(),
  };
};

// Define a type for validation errors
type FormErrors = {
  [key in keyof NewServiceRequestFormData]?: string; // Each field can have an optional string error message
};

interface ServiceRequestFormProps {
  initialData?: ServiceRequest; // New optional prop for initial data in edit mode
}

function ServiceRequestForm({ initialData }: ServiceRequestFormProps) {
  const navigate = useNavigate();
  const { addServiceRequest, updateServiceRequest } = useServiceRequests();
  const [formData, setFormData] = useState<NewServiceRequestFormData>(
    getInitialFormData(initialData)
  );
  // NEW STATE: To hold validation errors
  const [errors, setErrors] = useState<FormErrors>({});

  // Use useEffect to update form data if initialData prop changes
  useEffect(() => {
    setFormData(getInitialFormData(initialData));
    setErrors({}); // Clear errors when initialData changes (e.g., switching from edit to new)
  }, [initialData]);

  // NEW FUNCTION: Validate individual field
  const validateField = (name: keyof NewServiceRequestFormData, value: string): string => {
    let error = '';
    if (!value.trim()) { // .trim() removes whitespace from both ends
      error = `${name.charAt(0).toUpperCase() + name.slice(1)} is required.`;
    }
    // You can add more specific rules here if needed
    // Example: Min/Max length for title
    if (name === 'title' && value.trim().length < 3 && value.trim().length > 0) {
      error = 'Title must be at least 3 characters long.';
    }
    if (name === 'title' && value.trim().length > 100) {
        error = 'Title cannot exceed 100 characters.';
    }
    // Example: Min/Max length for description
    if (name === 'description' && value.trim().length > 500) {
        error = 'Description cannot exceed 500 characters.';
    }
    // Example: Min/Max length for requestedBy
    if (name === 'requestedBy' && value.trim().length < 3 && value.trim().length > 0) {
      error = 'Requested By must be at least 3 characters long.';
    }
    if (name === 'requestedBy' && value.trim().length > 50) {
      error = 'Requested By cannot exceed 50 characters.';
    }
    return error;
  };

  // NEW FUNCTION: Validate the entire form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Check each field
    for (const key in formData) {
      const fieldName = key as keyof NewServiceRequestFormData;
      const errorMessage = validateField(fieldName, formData[fieldName]);
      if (errorMessage) {
        newErrors[fieldName] = errorMessage;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    // NEW: Validate field immediately on change to clear error
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: validateField(name as keyof NewServiceRequestFormData, value),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // NEW: Perform validation before submission
    if (!validateForm()) {
      console.log('Form has validation errors. Preventing submission.');
      return; // Stop the submission if validation fails
    }

    console.log('Form data is valid. Submitting...');

    if (initialData?.id) {
      const updatedRequest: ServiceRequest = {
        ...initialData,
        ...formData,
        status: formData.status as ServiceRequest['status'],
      };
      updateServiceRequest(updatedRequest);
      console.log('Updated Service Request:', updatedRequest);
    } else {
      addServiceRequest(formData);
      console.log('New Service Request Data:', formData);
    }

    navigate('/service-requests');
  };

  const resetForm = () => {
    setFormData(getInitialFormData(initialData)); // Reset based on the initial data if present
    setErrors({}); // NEW: Clear errors on reset
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <form onSubmit={handleSubmit} noValidate> {/* Added noValidate to prevent browser's default HTML5 validation */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              // NEW: Error props
              error={!!errors.title} // !! converts string to boolean (true if string exists)
              helperText={errors.title}
              required // Keep HTML5 required for accessibility/basic browser validation fallback
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
              // NEW: Error props
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
              // NEW: Error props
              error={!!errors.status}
              helperText={errors.status}
              required
              margin="normal"
            >
              <MenuItem value="Open">Open</MenuItem>
              <MenuItem value="In Progress">In Progress</MenuItem>
              <MenuItem value="Resolved">Resolved</MenuItem>
              <MenuItem value="Closed">Closed</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Requested By"
              name="requestedBy"
              value={formData.requestedBy}
              onChange={handleChange}
              // NEW: Error props
              error={!!errors.requestedBy}
              helperText={errors.requestedBy}
              required
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Requested Date"
              name="requestedDate"
              type="date"
              value={formData.requestedDate}
              onChange={handleChange}
              InputLabelProps={{
                shrink: true,
              }}
              // NEW: Error props
              error={!!errors.requestedDate}
              helperText={errors.requestedDate}
              required
              margin="normal"
            />
          </Grid>
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