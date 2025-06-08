import React, { useState, useEffect } from 'react';
import {
  //Box,
  TextField,
  Button,
  MenuItem,
  Grid,
  Paper,
  //Typography // Re-added Typography if you plan to use it for titles within the form later
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ClearIcon from '@mui/icons-material/Clear';
import { useNavigate } from 'react-router-dom';

import { type NewServiceRequestFormData, type ServiceRequest } from '../types/ServiceRequestTypes';
import { useServiceRequests } from '../hooks/useServiceRequests';


// Helper function to get initial form data, handling both new and edit modes
const getInitialFormData = (data?: ServiceRequest): NewServiceRequestFormData => {
  if (data) {
    // If initial data is provided (edit mode), use it
    return {
      title: data.title,
      description: data.description,
      status: data.status,
      requestedBy: data.requestedBy,
      requestedDate: data.requestedDate,
    };
  }
  // Otherwise, return default for a new request
  return {
    title: '',
    description: '',
    status: 'Open', // Default status for new requests
    requestedBy: '',
    requestedDate: new Date().toISOString().slice(0, 10), // Current date
  };
};

interface ServiceRequestFormProps {
  initialData?: ServiceRequest; // New optional prop for initial data in edit mode
}

function ServiceRequestForm({ initialData }: ServiceRequestFormProps) {
  const navigate = useNavigate();
  // Destructure updateServiceRequest from the context
  const { addServiceRequest, updateServiceRequest } = useServiceRequests();
  const [formData, setFormData] = useState<NewServiceRequestFormData>(
    getInitialFormData(initialData)
  );

  // Use useEffect to update form data if initialData prop changes
  // This is crucial if the same form component is rendered for different IDs (e.g., navigating from edit ID1 to edit ID2)
  useEffect(() => {
    setFormData(getInitialFormData(initialData));
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (initialData?.id) {
      // If initialData.id exists, it means we are in edit mode
      const updatedRequest: ServiceRequest = {
        ...initialData, // Keep the original ID and any other fields from initialData
        ...formData,    // Overlay with updated form data
        // Ensure status is correctly typed. formData.status will be one of the valid strings.
        status: formData.status as ServiceRequest['status'],
      };
      updateServiceRequest(updatedRequest);
      console.log('Updated Service Request:', updatedRequest);
    } else {
      // Otherwise, it's a new request operation
      addServiceRequest(formData);
      console.log('New Service Request Data:', formData);
    }

    // Navigate back to the service requests list page after submission
    navigate('/service-requests');
  };

  const resetForm = () => {
    setFormData(getInitialFormData(initialData)); // Reset based on the initial data if present
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
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
              {initialData?.id ? 'Save Changes' : 'Submit Request'} {/* Dynamically change button text */}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
}

export default ServiceRequestForm;