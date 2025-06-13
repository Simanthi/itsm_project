// itsm_frontend/src/modules/service-requests/components/ServiceRequestForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { TextField, Button, Box, Typography, MenuItem, CircularProgress, Alert } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  type ServiceRequest,
  type NewServiceRequestData,
  type ServiceRequestCategory,
  type ServiceRequestPriority,
  type ServiceRequestStatus
} from '../types/ServiceRequestTypes';
import { getUserList } from '../../../api/authApi';
import { createServiceRequest, updateServiceRequest } from '../../../api/serviceRequestApi';
import { useAuth } from '../../../context/auth/useAuth';

interface User {
  id: number;
  username: string;
}

const CATEGORY_OPTIONS = ['software', 'hardware', 'account', 'network', 'printer', 'system', 'information', 'other'] as const;
const STATUS_OPTIONS = ['new', 'in_progress', 'pending_approval', 'resolved', 'closed', 'cancelled'] as const;
const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const;

interface ServiceRequestFormState {
  title: string;
  description: string;
  category: ServiceRequestCategory;
  status: ServiceRequestStatus;
  priority: ServiceRequestPriority;
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

  const [formData, setFormData] = useState<ServiceRequestFormState>({
    title: '',
    description: '',
    category: CATEGORY_OPTIONS[0],
    status: STATUS_OPTIONS[0],
    priority: PRIORITY_OPTIONS[1],
    requested_by_id: user?.id || 0,
    assigned_to_id: null,
    request_id_display: undefined,
  });

  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  // Debug log for users state whenever the component renders (moved outside JSX)
  // console.log("ServiceRequestForm: Render cycle. Current 'users' state:", users, "Type:", typeof users, "IsArray:", Array.isArray(users));

  const parseError = useCallback((err: unknown): string => {
    if (err instanceof Error) {
      if (err.message.includes("API error: ") && err.message.includes("{")) {
        try {
          const errorPart = err.message.substring(err.message.indexOf("{"));
          const errorDetails = JSON.parse(errorPart);
          const firstKey = Object.keys(errorDetails)[0];
          if (firstKey && Array.isArray(errorDetails[firstKey]) && typeof errorDetails[firstKey][0] === 'string') {
            return `${firstKey.replace(/_/g, ' ')}: ${errorDetails[firstKey][0]}`;
          }
          return `Details: ${JSON.stringify(errorDetails)}`;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
          return err.message;
        }
      }
      return err.message;
    }
    return String(err);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    if (!token) {
      setUsers([]);
      setError("Authentication token not found. Please log in.");
      setLoadingUsers(false);
      return;
    }
    try {
      const usersData = await getUserList(token);
      setUsers(usersData);
      setError(null);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(parseError(err));
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [token, parseError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (id && initialData) {
      // console.log("ServiceRequestForm: Populating form with initialData:", initialData); // Removed debug log from here
      setFormData({
        title: initialData.title,
        description: initialData.description,
        category: initialData.category,
        status: initialData.status,
        priority: initialData.priority,
        requested_by_id: initialData.requested_by_id || user?.id || 0,
        assigned_to_id: initialData.assigned_to_id || null,
        request_id_display: initialData.request_id,
      });
    } else if (!id) {
      // console.log("ServiceRequestForm: Initializing form for new request."); // Removed debug log from here
      setFormData(prev => ({
        ...prev,
        title: '',
        description: '',
        category: CATEGORY_OPTIONS[0],
        status: STATUS_OPTIONS[0],
        priority: PRIORITY_OPTIONS[1],
        requested_by_id: user?.id || 0,
        assigned_to_id: null,
        request_id_display: undefined,
      }));
    }
  }, [id, initialData, user]);


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

    if (!id && (formData.requested_by_id === 0 || !formData.requested_by_id)) {
      setError("Please select a valid 'Requested By' user.");
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
        const updatePayload: Partial<NewServiceRequestData> & { status?: ServiceRequestStatus } = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          status: formData.status,
          priority: formData.priority,
          requested_by_id: formData.requested_by_id,
          assigned_to_id: formData.assigned_to_id,
        };
        await updateServiceRequest(formData.request_id_display, updatePayload, token);
        console.log('Service Request updated successfully!');
      } else {
        const createPayload: NewServiceRequestData = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          requested_by_id: formData.requested_by_id,
          assigned_to_id: formData.assigned_to_id,
        };
        await createServiceRequest(createPayload, token);
        console.log('Service Request created successfully!');
      }
      navigate('/service-requests');
    } catch (err: unknown) {
      console.error("Submission error:", err);
      if (err instanceof Error && err.message.includes("API error: ") && err.message.includes("{")) {
        try {
          const errorPart = err.message.substring(err.message.indexOf("{"));
          const errorDetails = JSON.parse(errorPart);
          setError(`Submission failed: ${JSON.stringify(errorDetails)}`);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_) {
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

  if (loadingUsers) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2, mt: 2 }}>Loading users for the form...</Typography>
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
        {id && initialData?.request_id ? `Edit Service Request: ${initialData.request_id}` : 'Create New Service Request'}
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
          {Array.isArray(CATEGORY_OPTIONS) && CATEGORY_OPTIONS.map((category) => (
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
          {Array.isArray(STATUS_OPTIONS) && STATUS_OPTIONS.map((status) => (
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
          {Array.isArray(PRIORITY_OPTIONS) && PRIORITY_OPTIONS.map((priority) => (
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
          {/* Removed console.log from here */}
          {Array.isArray(users) && users.map((user) => (
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
          {/* Removed console.log from here */}
          {Array.isArray(users) && users.map((user) => (
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
