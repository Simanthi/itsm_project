/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { useUI } from '../../../context/UIContext/useUI';

interface User {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
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
  requested_by_id: number | null;
  assigned_to_id: number | null;
  request_id_display?: string;
}

interface ServiceRequestFormProps {
  initialData?: ServiceRequest;
}

const ServiceRequestForm: React.FC<ServiceRequestFormProps> = ({ initialData }) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { token, user, loading: authLoading } = useAuth();
  const { showSnackbar } = useUI();

  const [formData, setFormData] = useState<ServiceRequestFormState>({
    title: '',
    description: '',
    category: CATEGORY_OPTIONS[0],
    status: STATUS_OPTIONS[0],
    priority: PRIORITY_OPTIONS[1],
    requested_by_id: null, // Initialize as null, will be set by effect
    assigned_to_id: null,
    request_id_display: undefined,
  });

  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  // State for displaying username, including ID for debugging
  const [requestedByDisplay, setRequestedByDisplay] = useState<string>('');

  // Utility to parse API errors
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
        } catch (_) {
          return err.message;
        }
      }
      return err.message;
    }
    return String(err);
  }, []);

  // Effect to fetch the list of all users for dropdowns
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    if (!token) {
      setUsers([]);
      setError("Authentication token not found. Please log in to fetch users.");
      setLoadingUsers(false);
      return;
    }
    try {
      const usersData = await getUserList(token);
      setUsers(usersData);
      setError(null);
    } catch (err) {
      console.error("ServiceRequestForm: Error fetching users:", err);
      setError(parseError(err));
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [token, parseError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Effect to set initial form data for edit mode OR pre-fill for new requests with logged-in user
  useEffect(() => {
    console.log('ServiceRequestForm: useEffect for formData (id, initialData, user, authLoading) triggered.');
    console.log('  -> Current authLoading:', authLoading, 'User:', user);

    if (id && initialData) {
      // Edit mode: populate with initialData
      console.log('  -> Edit mode: Populating form with initialData:', initialData);
      setFormData({
        title: initialData.title,
        description: initialData.description,
        category: initialData.category,
        status: initialData.status,
        priority: initialData.priority,
        requested_by_id: initialData.requested_by_id || null,
        assigned_to_id: initialData.assigned_to_id || null,
        request_id_display: initialData.request_id,
      });
    } else if (!id) { // New request mode
      console.log('  -> New request mode.');
      if (!authLoading && user && user.id) { // Check user.id explicitly if available and non-zero
        console.log(`  -> Auth loaded and user ID found: ${user.id}. Setting requested_by_id.`);
        setFormData(prev => ({
          ...prev,
          requested_by_id: user.id,
        }));
        setError(null);
      } else if (!authLoading && !user) {
        // Auth is done loading, but no user is logged in
        console.log('  -> Auth loaded, but no user object found. Setting requested_by_id to null.');
        setFormData(prev => ({
          ...prev,
          requested_by_id: null,
        }));
        setError("Logged-in user not found. Please log in to create a request.");
      } else if (authLoading) {
        console.log('  -> Auth is still loading. Not setting requested_by_id yet.');
      }
    }
  }, [id, initialData, user, authLoading]); // Dependencies for this effect

  // Effect to update the display name for 'Requested By' whenever requested_by_id or users list changes
  useEffect(() => {
    console.log('ServiceRequestForm: useEffect for requestedByDisplay (formData.requested_by_id, users, user, authLoading, id) triggered.');
    console.log('  -> Current formData.requested_by_id:', formData.requested_by_id);
    console.log('  -> Users list length:', users.length);
    console.log('  -> User from AuthContext (for fallback):', user);

    if (formData.requested_by_id !== null && formData.requested_by_id !== 0 && users.length > 0) {
      const userFound = users.find(u => u.id === formData.requested_by_id);
      if (userFound) {
        console.log(`  -> Found user in fetched list: ${userFound.username}. Displaying as ID: ${userFound.id} - ${userFound.username}`);
        setRequestedByDisplay(`ID: ${userFound.id} - ${userFound.username}`);
      } else {
        console.log(`  -> User ID ${formData.requested_by_id} not found in fetched list. Displaying as ID: ${formData.requested_by_id} - User Not Found`);
        setRequestedByDisplay(`ID: ${formData.requested_by_id} - User Not Found`);
      }
    } else if (!authLoading && user && user.id && !id) {
        // Fallback for new request if users are not yet loaded but user is authenticated
        console.log(`  -> Fallback: Using AuthContext user for display: ID: ${user.id} - ${user.name}`);
        setRequestedByDisplay(`ID: ${user.id} - ${user.name} (from AuthContext)`);
    }
    else {
      console.log('  -> Clearing requestedByDisplay (no valid ID or users yet).');
      setRequestedByDisplay(''); // Clear display if no ID or no users
    }
  }, [formData.requested_by_id, users, user, authLoading, id]); // Dependencies for this display effect


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
      showSnackbar("Authentication token not found. Please log in.", "error");
      setSubmitting(false);
      return;
    }

    // Validation for 'Requested By' for new requests
    if (!id && (formData.requested_by_id === null || formData.requested_by_id === undefined || formData.requested_by_id === 0)) {
        setError("The 'Requested By' user is not set or invalid. Please ensure you are logged in.");
        showSnackbar("The 'Requested By' user is not set. Please ensure you are logged in and your user ID is valid.", "warning");
        setSubmitting(false);
        return;
    }

    try {
      if (id) {
        if (!formData.request_id_display) {
          setError("Cannot update: Service Request ID (string format) not found.");
          showSnackbar("Error: Service Request ID missing for update.", "error");
          setSubmitting(false);
          return;
        }

        const updatePayload: Partial<NewServiceRequestData> & { status?: ServiceRequestStatus } = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          status: formData.status,
          priority: formData.priority,
          requested_by_id: formData.requested_by_id || undefined,
          assigned_to_id: formData.assigned_to_id,
        };
        await updateServiceRequest(formData.request_id_display, updatePayload, token);
        showSnackbar('Service Request updated successfully!', 'success');
      } else {
        const createPayload: NewServiceRequestData = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          requested_by_id: formData.requested_by_id!,
          assigned_to_id: formData.assigned_to_id,
        };
        await createServiceRequest(createPayload, token);
        showSnackbar('Service Request created successfully!', 'success');
      }
      navigate('/service-requests');
    } catch (err: unknown) {
      console.error("ServiceRequestForm: Submission error:", err);
      const errorMessage = parseError(err);
      setError(errorMessage);
      showSnackbar(`Submission failed: ${errorMessage}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Determine if the submit button should be disabled
  // Disabled if submitting, if Auth is still loading, or if it's a new request and requested_by_id is not set (or is 0)
  const isSubmitDisabled = submitting || authLoading || (id === undefined && (formData.requested_by_id === null || formData.requested_by_id === undefined || formData.requested_by_id === 0));

  // Diagnostic logs for current state before rendering
  console.log('ServiceRequestForm Render State:');
  console.log(' - authLoading:', authLoading);
  console.log(' - user (from useAuth):', user);
  console.log(' - formData.requested_by_id:', formData.requested_by_id);
  console.log(' - requestedByDisplay:', requestedByDisplay);
  console.log(' - isSubmitDisabled:', isSubmitDisabled);
  console.log(' - users (for dropdowns):', users);


  if (loadingUsers || authLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2, mt: 2 }}>
          {authLoading ? 'Authenticating and loading user data...' : 'Loading users for the form...'}
        </Typography>
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
          disabled={!id} // Status can only be changed when editing an existing request
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

        {/* Display for "Requested By" - always read-only for new requests */}
        <TextField
          label="Requested By"
          name="requested_by_id_display" // Changed name to avoid conflict with actual ID field
          value={requestedByDisplay} // Use the dedicated display state
          fullWidth
          margin="normal"
          required
          InputProps={{
            readOnly: true, // Always read-only for this display field
            style: { cursor: 'not-allowed' } // Visually indicate it's not editable
          }}
        />

        {/* Only show the editable "Requested By" dropdown in edit mode (for admin/authorized users) */}
        {id && (
            <TextField
                select
                label="Requested By (Editable)"
                name="requested_by_id" // This matches the formData key
                value={formData.requested_by_id || ''}
                onChange={handleUserChange}
                fullWidth
                margin="normal"
                required
            >
                {/* Ensure "None" or "Loading" option is available if users array is empty */}
                {users.length === 0 ? (
                  <MenuItem value="" disabled>
                    <em>{loadingUsers ? 'Loading Users...' : 'No Users Available'}</em>
                  </MenuItem>
                ) : (
                  users.map((userOption) => (
                    <MenuItem key={userOption.id} value={userOption.id}>
                      {userOption.username}
                    </MenuItem>
                  ))
                )}
            </TextField>
        )}

        <TextField
          select
          label="Assigned To"
          name="assigned_to_id"
          value={formData.assigned_to_id || ''}
          onChange={handleUserChange}
          fullWidth
          margin="normal"
        >
          {/* Ensure "None" or "Loading" option is available if users array is empty */}
          {users.length === 0 ? (
            <MenuItem value="" disabled>
              <em>{loadingUsers ? 'Loading Users...' : 'No Users Available'}</em>
            </MenuItem>
          ) : (
            [
              <MenuItem key="none" value="">
                <em>None</em>
              </MenuItem>,
              ...users.map((userOption) => (
                <MenuItem key={userOption.id} value={userOption.id}>
                  {userOption.username}
                </MenuItem>
              ))
            ]
          )}
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
