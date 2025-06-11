// itsm_frontend/src/modules/service-requests/components/ServiceRequestForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { TextField, Button, Box, Typography, MenuItem, CircularProgress, Alert } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  type ServiceRequest,
  type NewServiceRequestData
  // REMOVED: ServiceRequestStatus, ServiceRequestCategory, ServiceRequestPriority imports as they are implicitly used via ServiceRequest or constants
  // type ServiceRequestStatus,
  // type ServiceRequestCategory,
  // type ServiceRequestPriority
} from '../types/ServiceRequestTypes';
import { getUserList } from '../../../api/authApi';
import { useAuth } from '../../../context/auth/useAuth';
import { useServiceRequests } from '../hooks/useServiceRequests';

interface User {
  id: number;
  username: string;
}

const CATEGORY_OPTIONS = ['software', 'hardware', 'network', 'information', 'other'] as const;
const STATUS_OPTIONS = ['new', 'in_progress', 'pending_approval', 'resolved', 'closed', 'cancelled'] as const;
const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const;

interface ServiceRequestFormState {
  title: string;
  description: string;
  category: typeof CATEGORY_OPTIONS[number];
  status: typeof STATUS_OPTIONS[number];
  priority: typeof PRIORITY_OPTIONS[number];
  requested_by_id: number;
  assigned_to_id: number | null;
  request_id_display?: string;
}

interface ServiceRequestFormProps {
  initialData?: ServiceRequest;
}

const ServiceRequestForm: React.FC<ServiceRequestFormProps> = ({ initialData }) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { addServiceRequest, updateServiceRequest: contextUpdateServiceRequest } = useServiceRequests();

  const [formData, setFormData] = useState<ServiceRequestFormState>({
    title: '',
    description: '',
    category: CATEGORY_OPTIONS[0],
    status: STATUS_OPTIONS[0],
    priority: PRIORITY_OPTIONS[1],
    requested_by_id: user?.id || 0,
    assigned_to_id: null,
  });
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [loadingFormData, setLoadingFormData] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const fetchUsersData = useCallback(async () => {
    console.log("ServiceRequestForm - fetchUsersData: Starting user fetch. Token present:", !!token);
    setLoadingUsers(true);
    if (!token) {
      setError("Authentication token not found. Please log in.");
      setLoadingUsers(false);
      setUsers([]);
      console.log("ServiceRequestForm - fetchUsersData: No token, skipping user fetch.");
      return;
    }
    try {
      const usersData = await getUserList(token);
      setUsers(usersData);
      setError(null);
      console.log("ServiceRequestForm - fetchUsersData: Users fetched successfully. Users:", usersData);
    } catch (err) {
      console.error("ServiceRequestForm - fetchUsersData: Error fetching users:", err);
      setError("Failed to load users. " + (err instanceof Error ? err.message : String(err)));
      setUsers([]);
    } finally {
      setLoadingUsers(false);
      console.log("ServiceRequestForm - fetchUsersData: User fetch finished, setLoadingUsers(false).");
    }
  }, [token]);

  useEffect(() => {
    fetchUsersData();
  }, [fetchUsersData]);

  useEffect(() => {
    console.log(
      `ServiceRequestForm - Effect 2 Triggered: ` +
      `loadingUsers: ${loadingUsers}, ` +
      `initialData presence: ${!!initialData}, ` +
      `user ID: ${user?.id || 'none'}, ` +
      `users.length: ${users.length}, ` +
      `token presence: ${!!token}, ` +
      `current error: ${error}`
    );

    if (loadingUsers) {
      console.log("ServiceRequestForm - Effect 2: Waiting for users to load.");
      return;
    }

    setLoadingFormData(true);

    if (!token && !error) {
      setError("Authentication token missing for form initialization.");
      setLoadingFormData(false);
      console.log("ServiceRequestForm - Effect 2: No token, setting error and loadingFormData to false.");
      return;
    }

    if (initialData) {
      console.log("ServiceRequestForm - Effect 2: Initial data provided, populating form for edit mode.");
      const resolvedRequestedById = users.find(u => u.username === initialData.requested_by_username)?.id || 0;
      const resolvedAssignedToId = initialData.assigned_to_username ? (users.find(u => u.username === initialData.assigned_to_username)?.id || null) : null;
      
      console.log("ServiceRequestForm - Effect 2: Resolved requested_by_id:", resolvedRequestedById, "Resolved assigned_to_id:", resolvedAssignedToId);
      
      setFormData({
        title: initialData.title,
        description: initialData.description,
        category: initialData.category as typeof CATEGORY_OPTIONS[number],
        status: (STATUS_OPTIONS.includes(initialData.status as typeof STATUS_OPTIONS[number])
          ? initialData.status
          : STATUS_OPTIONS[0]) as typeof STATUS_OPTIONS[number],
        priority: initialData.priority as typeof PRIORITY_OPTIONS[number],
        requested_by_id: resolvedRequestedById,
        assigned_to_id: resolvedAssignedToId,
        request_id_display: initialData.request_id,
      });
    } else {
      console.log("ServiceRequestForm - Effect 2: No initial data, setting form for create mode.");
      setFormData(prev => ({
        ...prev,
        requested_by_id: user?.id || 0,
        status: STATUS_OPTIONS[0],
      }));
    }

    setLoadingFormData(false);
    console.log("ServiceRequestForm - Effect 2: Form data initialization complete, setLoadingFormData(false).");
  }, [initialData, user, users, loadingUsers, token, error]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log(`ServiceRequestForm - handleChange: ${name} changed to ${value}`);
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log(`ServiceRequestForm - handleUserChange: ${name} changed to ${value} (type: ${typeof value})`);
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : Number(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!id && (formData.requested_by_id === 0 || !formData.requested_by_id)) {
      setError("Please select a valid 'Requested By' user.");
      setSubmitting(false);
      return;
    }

    if (!token) {
      setError("Authentication token not found. Please log in.");
      setSubmitting(false);
      return;
    }

    try {
      if (id) {
        if (!formData.request_id_display) {
          setError("Cannot update: Service Request ID (string format) not found.");
          setSubmitting(false);
          return;
        }

        const updatePayload: ServiceRequest = {
          id: Number(id),
          request_id: formData.request_id_display,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          status: formData.status,
          priority: formData.priority,
          // Ensure these are correctly derived based on the `users` state
          requested_by_username: users.find(u => u.id === formData.requested_by_id)?.username || '',
          assigned_to_username: users.find(u => u.id === formData.assigned_to_id)?.username || null,
          assigned_to_id: formData.assigned_to_id,
          resolution_notes: initialData?.resolution_notes || null,
          created_at: initialData?.created_at || '', // Default to empty string if null
          updated_at: new Date().toISOString(),
          resolved_at: initialData?.resolved_at,
        };
        
        console.log("ServiceRequestForm: Calling contextUpdateServiceRequest with:", updatePayload);
        await contextUpdateServiceRequest(updatePayload);
        alert('Service Request updated successfully!');
      } else {
        const createPayload: NewServiceRequestData = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          requested_by_id: formData.requested_by_id,
          assigned_to_id: formData.assigned_to_id,
        };
        console.log("ServiceRequestForm: Calling addServiceRequest with:", createPayload);
        await addServiceRequest(createPayload);
        alert('Service Request created successfully!');
      }
      navigate('/service-requests');
    } catch (err) {
      console.error("ServiceRequestForm: Submission error:", err);
      if (err instanceof Error && err.message.includes("API error: 400") && err.message.includes("{")) {
        try {
          const errorDetails = JSON.parse(err.message.split("API error: 400")[1]);
          setError(`Submission failed: ${JSON.stringify(errorDetails)}`);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) { // ESLint fix for unused '_'
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : "An unknown error occurred during submission.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled = submitting || (id === undefined && (formData.requested_by_id === 0 || !formData.requested_by_id));

  if (loadingUsers || loadingFormData) {
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