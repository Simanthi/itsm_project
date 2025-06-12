// itsm_frontend/src/modules/service-requests/components/ServiceRequestForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { TextField, Button, Box, Typography, MenuItem, CircularProgress, Alert } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
// ServiceRequest type is used here for the initialData prop
import { type ServiceRequest, type NewServiceRequestData, type ServiceRequestCategory, type ServiceRequestPriority, type ServiceRequestStatus } from '../types/ServiceRequestTypes';
import { getUserList } from '../../../api/authApi';
import { createServiceRequest, getServiceRequestById, updateServiceRequest } from '../../../api/serviceRequestApi';
import { useAuth } from '../../../../src/context/auth/useAuth';

interface User {
  id: number;
  username: string;
}

// FIX: Aligned CATEGORY_OPTIONS with ServiceRequestCategory from ServiceRequestTypes.ts
const CATEGORY_OPTIONS = ['software', 'hardware', 'account', 'network', 'printer', 'system', 'information', 'other'] as const;
// FIX: Aligned STATUS_OPTIONS with ServiceRequestStatus from ServiceRequestTypes.ts
const STATUS_OPTIONS = ['new', 'in_progress', 'pending_approval', 'resolved', 'closed', 'cancelled'] as const;
const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const;

// Define a unified form state interface
interface ServiceRequestFormState {
  title: string;
  description: string;
  category: ServiceRequestCategory;
  status: ServiceRequestStatus;
  priority: ServiceRequestPriority;
  requested_by_id: number; // For internal form state, represents the user making the request
  assigned_to_id: number | null; // For internal form state
  request_id_display?: string; // For displaying existing request ID
}

// FIX: Define props interface for ServiceRequestForm to explicitly accept initialData
interface ServiceRequestFormProps {
  initialData?: ServiceRequest; // Optional prop for editing existing requests
}

// FIX: Pass ServiceRequestFormProps to React.FC
const ServiceRequestForm: React.FC<ServiceRequestFormProps> = ({ initialData }) => {
  const { id } = useParams<{ id?: string }>(); // 'id' will be the request_id string (e.g., 'SR-AA-0013')
  const navigate = useNavigate();
  const { token, user } = useAuth(); // Also get 'user' to set default requested_by_id for new requests
  const [formData, setFormData] = useState<ServiceRequestFormState>(() => {
    // Initialize form data based on initialData prop or defaults for new requests
    if (initialData) {
      return {
        title: initialData.title,
        description: initialData.description,
        category: initialData.category,
        status: initialData.status,
        priority: initialData.priority,
        requested_by_id: initialData.requested_by_id || user?.id || 0, // Use initialData's ID or current user's ID
        assigned_to_id: initialData.assigned_to_id || null,
        request_id_display: initialData.request_id,
      };
    } else {
      return {
        title: '',
        description: '',
        category: CATEGORY_OPTIONS[0],
        status: STATUS_OPTIONS[0],
        priority: PRIORITY_OPTIONS[1],
        requested_by_id: user?.id || 0, // Default for new requests: logged-in user's ID
        assigned_to_id: null,
      };
    }
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  // FIX: Added parseError function
  const parseError = useCallback((err: unknown): string => {
    if (err instanceof Error) {
      // Check for specific API error structure from authFetch
      if (err.message.includes("API error: ") && err.message.includes("{")) {
        try {
          const errorPart = err.message.substring(err.message.indexOf("{"));
          const errorDetails = JSON.parse(errorPart);
          // Return first key's error or generic JSON string
          const firstKey = Object.keys(errorDetails)[0];
          if (firstKey && Array.isArray(errorDetails[firstKey]) && typeof errorDetails[firstKey][0] === 'string') {
            return `${firstKey.replace(/_/g, ' ')}: ${errorDetails[firstKey][0]}`;
          }
          return `Details: ${JSON.stringify(errorDetails)}`;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
          // Fallback if parsing fails
          return err.message;
        }
      }
      return err.message;
    }
    return String(err); // Convert non-Error objects/values to string
  }, []);


  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const usersData = await getUserList(token);
      setUsers(usersData);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(parseError(err)); // FIX: Use parseError here
    }
  }, [token, parseError]); // FIX: Add parseError to dependencies

  const fetchServiceRequest = useCallback(async () => {
    if (id && token) {
      try {
        const request = await getServiceRequestById(id, token);
        setFormData({
          title: request.title,
          description: request.description,
          category: request.category,
          status: request.status,
          priority: request.priority,
          requested_by_id: request.requested_by_id,
          assigned_to_id: request.assigned_to_id || null,
          request_id_display: request.request_id,
        });
      } catch (err) {
        console.error("Error fetching service request:", err);
        setError(parseError(err)); // FIX: Use parseError here
      }
    }
  }, [id, token, parseError]); // FIX: Add parseError to dependencies


  useEffect(() => {
    if (!token) {
      setError("Authentication token not found. Please log in.");
      setLoading(false);
      return;
    }

    Promise.all([fetchUsers(), fetchServiceRequest()]).finally(() => {
      setLoading(false);
    });
  }, [token, fetchUsers, fetchServiceRequest]); // Dependencies now include fetchUsers and fetchServiceRequest

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

    // Validation for new requests: ensure requested_by_id is set
    if (!id && (formData.requested_by_id === 0 || !formData.requested_by_id)) {
      setError("Please select a valid 'Requested By' user.");
      setSubmitting(false);
      return;
    }

    try {
      if (id) {
        // Update existing service request
        const updatePayload: Partial<NewServiceRequestData> & { status?: ServiceRequestStatus } = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          status: formData.status,
          priority: formData.priority,
          requested_by_id: formData.requested_by_id,
          assigned_to_id: formData.assigned_to_id,
        };

        // Pass `id` (the request_id string) and `updatePayload` to the update API.
        await updateServiceRequest(id, updatePayload, token);
        alert('Service Request updated successfully!');
      } else {
        // Create new service request
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
      navigate('/service-requests'); // Redirect to list page on success
    } catch (err: unknown) {
      console.error("Submission error:", err);
      setError(parseError(err)); // FIX: Use parseError here
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled = submitting || (id === undefined && (formData.requested_by_id === 0 || !formData.requested_by_id));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2, mt: 2 }}>Loading form data and users...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="contained" onClick={() => navigate('/service-requests')} sx={{ mt: 2 }}>
          Back to Service Requests
        </Button>
      </Box>
    );
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
          disabled={!id} // Disable status change for new requests
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
          disabled={!!id} // Disable changing requested_by for existing requests
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
          <Button type="submit" variant="contained" color="primary" disabled={isSubmitDisabled}>
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