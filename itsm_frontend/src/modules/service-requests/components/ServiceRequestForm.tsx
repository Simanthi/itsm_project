// itsm_frontend/src/modules/service-requests/components/ServiceRequestForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { TextField, Button, Box, Typography, MenuItem, CircularProgress, Alert } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { type ServiceRequest, type NewServiceRequestData } from '../types/ServiceRequestTypes';
import { getUserList } from '../../../api/authApi'; // This path needs to be correct for your project setup
import { createServiceRequest, getServiceRequestById, updateServiceRequest } from '../../../api/serviceRequestApi';
import { useAuth } from '../../../context/auth/useAuth'; // Corrected import path for useAuth

interface User {
  id: number;
  username: string;
}

// Define options with lowercase values to match TypeScript type definitions
const CATEGORY_OPTIONS = ['software', 'hardware', 'network', 'information', 'other'] as const;
const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed', 'cancelled'] as const;
const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const;

// Define a unified form state interface
interface ServiceRequestFormState {
  title: string;
  description: string;
  category: typeof CATEGORY_OPTIONS[number];
  status: typeof STATUS_OPTIONS[number];
  priority: typeof PRIORITY_OPTIONS[number];
  requested_by_id: number; // For internal form state, represents the user making the request
  assigned_to_id: number | null; // For internal form state
  request_id_display?: string; // For displaying existing request ID
}

const ServiceRequestForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [formData, setFormData] = useState<ServiceRequestFormState>({
    title: '',
    description: '',
    category: CATEGORY_OPTIONS[0],
    status: STATUS_OPTIONS[0],
    priority: PRIORITY_OPTIONS[1],
    requested_by_id: 0,
    assigned_to_id: null,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const usersData = await getUserList(token);
      setUsers(usersData);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users.");
    }
  }, [token]);

  const fetchServiceRequest = useCallback(async () => {
    if (id && token) {
      try {
        const request = await getServiceRequestById(Number(id), token);
        setFormData({
          title: request.title,
          description: request.description,
          category: request.category as typeof CATEGORY_OPTIONS[number],
          status: request.status as typeof STATUS_OPTIONS[number],
          priority: request.priority as typeof PRIORITY_OPTIONS[number],
          requested_by_id: request.requested_by,
          assigned_to_id: request.assigned_to || null,
          request_id_display: request.request_id,
        });
      } catch (err) {
        console.error("Error fetching service request:", err);
        setError("Failed to load service request.");
      }
    }
  }, [id, token]);


  useEffect(() => {
    if (!token) {
      setError("Authentication token not found. Please log in.");
      setLoading(false);
      return;
    }

    Promise.all([fetchUsers(), fetchServiceRequest()]).finally(() => {
      setLoading(false);
    });
  }, [token, fetchUsers, fetchServiceRequest]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : Number(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!token) {
      setError("Authentication token not found. Please log in.");
      setSubmitting(false);
      return;
    }

    try {
      if (id) {
        const updatePayload: Partial<ServiceRequest> = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          status: formData.status,
          priority: formData.priority,
          assigned_to: formData.assigned_to_id,
        };

        await updateServiceRequest(Number(id), updatePayload, token);
        alert('Service Request updated successfully!');
      } else {
        const createPayload: NewServiceRequestData & { requested_by?: number; assigned_to?: number | null } = {
            title: formData.title,
            description: formData.description,
            category: formData.category,
            status: formData.status,
            priority: formData.priority,
            requested_by: formData.requested_by_id,
            assigned_to: formData.assigned_to_id,
        };
        await createServiceRequest(createPayload as NewServiceRequestData, token);
        alert('Service Request created successfully!');
      }
      navigate('/service-requests');
    } catch (err) {
      console.error("Submission error:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        {id && formData.request_id_display ? `Edit Service Request: ${formData.request_id_display}` : 'Create New Service Request'}
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
        <TextField
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          fullWidth
          margin="normal"
          multiline
          rows={4}
          required
        />
        <TextField
          select
          label="Category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        >
          {CATEGORY_OPTIONS.map((category) => (
            <MenuItem key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
          disabled={!id}
        >
          {STATUS_OPTIONS.map((status) => (
            <MenuItem key={status} value={status}>
              {status.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Priority"
          name="priority"
          value={formData.priority}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        >
          {PRIORITY_OPTIONS.map((priority) => (
            <MenuItem key={priority} value={priority}>
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Requested By"
          name="requested_by_id"
          value={formData.requested_by_id || ''}
          onChange={handleUserChange}
          fullWidth
          margin="normal"
          required
          disabled={!!id}
        >
          {users.map((user) => (
            <MenuItem key={user.id} value={user.id}>
              {user.username}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Assigned To"
          name="assigned_to_id"
          value={formData.assigned_to_id || ''}
          onChange={handleUserChange}
          fullWidth
          margin="normal"
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {users.map((user) => (
            <MenuItem key={user.id} value={user.id}>
              {user.username}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button type="submit" variant="contained" color="primary" disabled={submitting}>
            {submitting ? <CircularProgress size={24} /> : (id ? 'Update Request' : 'Create Request')}
          </Button>
          <Button variant="outlined" color="secondary" onClick={() => navigate('/service-requests')} disabled={submitting}>
            Cancel
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ServiceRequestForm;
