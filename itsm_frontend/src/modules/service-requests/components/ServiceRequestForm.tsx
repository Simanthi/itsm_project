// itsm_frontend/src/modules/service-requests/components/ServiceRequestForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { TextField, Button, Box, Typography, MenuItem, CircularProgress, Alert } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  type ServiceRequest,
  type NewServiceRequestData,
  type ServiceRequestStatus, // FIX: Import ServiceRequestStatus
  type ServiceRequestCategory, // FIX: Import ServiceRequestCategory
  type ServiceRequestPriority // FIX: Import ServiceRequestPriority
} from '../types/ServiceRequestTypes';
import { getUserList } from '../../../api/authApi';
import { createServiceRequest, updateServiceRequest } from '../../../api/serviceRequestApi';
import { useAuth } from '../../../context/auth/useAuth';

interface User {
  id: number;
  username: string;
}

const CATEGORY_OPTIONS = ['software', 'hardware', 'network', 'information', 'other'] as const;
const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed', 'cancelled'] as const;
const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const;

interface ServiceRequestFormState {
  title: string;
  description: string;
  category: typeof CATEGORY_OPTIONS[number];
  status: typeof STATUS_OPTIONS[number];
  priority: typeof PRIORITY_OPTIONS[number];
  requested_by_id: number;
  assigned_to_id: number | null;
  request_id_display?: string; // For display purposes in edit mode
}

interface ServiceRequestFormProps {
  initialData?: ServiceRequest; // Make it optional as it's not always passed (for new requests)
}

// FIX: Define a new interface for the update payload with correct union types
interface UpdateServiceRequestPayload {
  title?: string;
  description?: string;
  category?: ServiceRequestCategory; // Use specific union type
  status?: ServiceRequestStatus;     // Use specific union type
  priority?: ServiceRequestPriority; // Use specific union type
  assigned_to_id?: number | null; // This matches what your API expects for PATCH
  // Add other fields here if your API expects them to be patchable by ID
}

const ServiceRequestForm: React.FC<ServiceRequestFormProps> = ({ initialData }) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [formData, setFormData] = useState<ServiceRequestFormState>({
    title: '',
    description: '',
    category: CATEGORY_OPTIONS[0],
    status: STATUS_OPTIONS[0],
    priority: PRIORITY_OPTIONS[1],
    requested_by_id: user?.id || 0, // Default to logged-in user's ID
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
      // If creating a new request and no default requested_by_id, set to the logged-in user
      if (!id && user && !formData.requested_by_id) {
        setFormData(prev => ({ ...prev, requested_by_id: user.id }));
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users.");
    }
  }, [token, id, user, formData.requested_by_id]);

  useEffect(() => {
    if (!token) {
      setError("Authentication token not found. Please log in.");
      setLoading(false);
      return;
    }

    fetchUsers().then(() => {
      if (initialData) {
        // If initialData is provided (edit mode), populate the form
        setFormData({
          title: initialData.title,
          description: initialData.description,
          category: initialData.category as typeof CATEGORY_OPTIONS[number],
          status: initialData.status as typeof STATUS_OPTIONS[number],
          priority: initialData.priority as typeof PRIORITY_OPTIONS[number],
          // Map usernames back to IDs using the fetched users list
          requested_by_id: users.find(u => u.username === initialData.requested_by_username)?.id || 0,
          assigned_to_id: initialData.assigned_to_username ? users.find(u => u.username === initialData.assigned_to_username)?.id || null : null,
          request_id_display: initialData.request_id,
        });
        setLoading(false); // Form is ready after initialData is set
      } else if (user) {
        // For new requests, set requested_by_id if user is available
        setFormData(prev => ({ ...prev, requested_by_id: user.id }));
        setLoading(false); // Form is ready
      } else {
        setLoading(false); // If no initialData and no user (shouldn't happen if auth works)
      }
    });
  }, [token, fetchUsers, initialData, user, users]);

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
        // Update existing request
        const updatePayload: UpdateServiceRequestPayload = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          status: formData.status,
          priority: formData.priority,
          assigned_to_id: formData.assigned_to_id,
        };
        // The updateServiceRequest API call expects Partial<ServiceRequest>
        // But our UpdateServiceRequestPayload now correctly aligns with what Django's API expects for writeable fields.
        await updateServiceRequest(Number(id), updatePayload, token);
        alert('Service Request updated successfully!');
      } else {
        // Create new request
        const createPayload: NewServiceRequestData = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          requested_by_id: formData.requested_by_id,
          assigned_to_id: formData.assigned_to_id,
        };
        await createServiceRequest(createPayload, token);
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
          disabled={!id} // Status editable only in edit mode
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
          disabled={!!id} // Requested By only editable for new requests
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