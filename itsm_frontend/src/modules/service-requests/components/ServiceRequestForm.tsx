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
import { getUserList } from '../../../api/authApi'; // Import API for fetching all users
import { createServiceRequest, updateServiceRequest } from '../../../api/serviceRequestApi'; // Import API for service request operations
import { useAuth } from '../../../context/auth/useAuth'; // Custom hook to access authentication context
import { useUI } from '../../../context/UIContext/useUI'; // Custom hook for UI feedback (snackbar)

// Define the shape of a User object, specifically for what's needed in the form.
// This might be a subset of the full User interface from UserTypes.ts.
interface User {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
}

// Constant arrays for dropdown options, ensuring type safety.
const CATEGORY_OPTIONS = ['software', 'hardware', 'account', 'network', 'printer', 'system', 'information', 'other'] as const;
const STATUS_OPTIONS = ['new', 'in_progress', 'pending_approval', 'resolved', 'closed', 'cancelled'] as const;
const PRIORITY_OPTIONS = ['low', 'medium', 'high'] as const;

// Interface for the form's internal state.
interface ServiceRequestFormState {
  title: string;
  description: string;
  category: ServiceRequestCategory;
  status: ServiceRequestStatus;
  priority: ServiceRequestPriority;
  requested_by_id: number | null; // ID of the user who requested the service
  assigned_to_id: number | null; // ID of the user assigned to the service
  request_id_display?: string; // Used for displaying the request ID in edit mode
}

// Props for the ServiceRequestForm component.
interface ServiceRequestFormProps {
  initialData?: ServiceRequest; // Optional initial data for edit mode
}

const ServiceRequestForm: React.FC<ServiceRequestFormProps> = ({ initialData }) => {
  const { id } = useParams<{ id?: string }>(); // Get ID from URL params (if in edit mode)
  const navigate = useNavigate(); // Hook for programmatic navigation
  const { token, user, loading: authLoading } = useAuth(); // Get auth token, user object, and auth loading state
  const { showSnackbar } = useUI(); // Get snackbar function for user feedback

  // Form state, initialized based on whether it's a new request or an edit.
  const [formData, setFormData] = useState<ServiceRequestFormState>({
    title: '',
    description: '',
    category: CATEGORY_OPTIONS[0],
    status: STATUS_OPTIONS[0],
    priority: PRIORITY_OPTIONS[1],
    requested_by_id: null, // Initialize as null; will be populated by useEffect
    assigned_to_id: null,
    request_id_display: undefined,
  });

  // Loading and submission states.
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true); // State for loading users for dropdowns
  const [submitting, setSubmitting] = useState<boolean>(false); // State for form submission in progress
  const [error, setError] = useState<string | null>(null); // State for displaying form-specific errors
  const [users, setUsers] = useState<User[]>([]); // List of all users for dropdowns
  // State for displaying the 'Requested By' user's name (and ID for debugging).
  const [requestedByDisplay, setRequestedByDisplay] = useState<string>('');

  // Memoized callback to parse API error responses into a user-friendly string.
  const parseError = useCallback((err: unknown): string => {
    if (err instanceof Error) {
      // Attempt to parse JSON error details from API error messages.
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
          return err.message; // Fallback if JSON parsing fails
        }
      }
      return err.message; // Return raw message if not a detailed API error
    }
    return String(err); // Convert unknown error types to string
  }, []);

  // Effect to fetch the list of all users from the backend for the "Assigned To" dropdown.
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    if (!token) {
      setUsers([]);
      setError("Authentication token not found. Please log in to fetch users.");
      setLoadingUsers(false);
      return;
    }
    try {
      const usersData = await getUserList(token); // Call API to get user list
      setUsers(usersData);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error("ServiceRequestForm: Error fetching users for dropdowns:", err);
      setError(parseError(err)); // Set error for display
      setUsers([]); // Clear users on error
    } finally {
      setLoadingUsers(false); // End loading regardless of success/failure
    }
  }, [token, parseError]); // Dependencies: token (for auth) and parseError (stable func)

  useEffect(() => {
    fetchUsers(); // Fetch users when component mounts or token changes
  }, [fetchUsers]);

  // Effect to manage formData initialization/updates based on mode (new/edit) and auth state.
  useEffect(() => {
    console.log('ServiceRequestForm: useEffect for formData (id, initialData, user, authLoading) triggered.');
    console.log('  -> Current authLoading:', authLoading, 'User:', user);

    if (id && initialData) {
      // EDIT MODE: If an ID and initial data are provided, populate the form for editing.
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
    } else if (!id) {
      // NEW REQUEST MODE:
      console.log('  -> New request mode.');
      // If authentication is complete AND user object is available AND user.id is valid (non-zero).
      if (!authLoading && user && user.id && user.id !== 0) { 
        console.log(`  -> Auth loaded and user ID found: ${user.id}. Setting requested_by_id.`);
        setFormData(prev => ({
          ...prev,
          requested_by_id: user.id, // Automatically set requested_by_id to the logged-in user's ID.
        }));
        setError(null); // Clear any previous "user not found" errors.
      } else if (!authLoading && (!user || user.id === 0)) {
        // If auth is done loading but no valid user object or ID is found.
        console.log('  -> Auth loaded, but no valid user object or zero ID found. Setting requested_by_id to null.');
        setFormData(prev => ({
          ...prev,
          requested_by_id: null,
        }));
        setError("Logged-in user not found or invalid ID. Please log in to create a request.");
      } else if (authLoading) {
        // If authentication is still in progress, do nothing yet.
        console.log('  -> Auth is still loading. Not setting requested_by_id yet.');
      }
    }
  }, [id, initialData, user, authLoading]); // Dependencies: reruns when these values change.

  // Effect to update the display string for the 'Requested By' field.
  // This runs when formData.requested_by_id or the 'users' list changes.
  useEffect(() => {
    console.log('ServiceRequestForm: useEffect for requestedByDisplay triggered.');
    console.log('  -> Current formData.requested_by_id:', formData.requested_by_id);
    console.log('  -> Users list length:', users.length);
    console.log('  -> User from AuthContext (for fallback):', user);

    if (formData.requested_by_id !== null && formData.requested_by_id !== 0 && users.length > 0) {
      // If a valid requested_by_id exists and users list is populated, find the user.
      const userFound = users.find(u => u.id === formData.requested_by_id);
      if (userFound) {
        console.log(`  -> Found user in fetched list: ${userFound.username}. Displaying as ID: ${userFound.id} - ${userFound.username}`);
        setRequestedByDisplay(`ID: ${userFound.id} - ${userFound.username}`);
      } else {
        // If ID is in formData but not found in the fetched users list (e.g., deleted user).
        console.log(`  -> User ID ${formData.requested_by_id} not found in fetched list. Displaying as ID: ${formData.requested_by_id} - User Not Found`);
        setRequestedByDisplay(`ID: ${formData.requested_by_id} - User Not Found`);
      }
    } else if (!authLoading && user && user.id && user.id !== 0 && !id) {
        // Fallback for new requests: if users list isn't loaded yet, use user info from AuthContext.
        console.log(`  -> Fallback: Using AuthContext user for display: ID: ${user.id} - ${user.name}`);
        setRequestedByDisplay(`ID: ${user.id} - ${user.name} (from AuthContext)`);
    } else {
      // If no valid ID, or auth is loading, or no user object.
      console.log('  -> Clearing requestedByDisplay (no valid ID or users yet, or auth loading).');
      setRequestedByDisplay(''); 
    }
  }, [formData.requested_by_id, users, user, authLoading, id]); // Dependencies for this effect.

  // Handler for text input and select changes (for non-user ID fields).
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handler for user ID select changes (e.g., Assigned To dropdown).
  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : Number(value), // Convert empty string to null, otherwise to number.
    }));
  };

  // Handler for form submission.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission behavior.
    setSubmitting(true); // Set submitting state to true.
    setError(null); // Clear previous errors.

    if (!token) {
      setError("Authentication token not found. Please log in.");
      showSnackbar("Authentication token not found. Please log in.", "error");
      setSubmitting(false);
      return;
    }

    // Pre-submission validation for 'Requested By' for new requests.
    if (!id && (formData.requested_by_id === null || formData.requested_by_id === undefined || formData.requested_by_id === 0)) {
        setError("The 'Requested By' user is not set or invalid. Please ensure you are logged in.");
        showSnackbar("The 'Requested By' user is not set. Please ensure you are logged in and your user ID is valid.", "warning");
        setSubmitting(false);
        return;
    }

    try {
      if (id) {
        // UPDATE existing service request.
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
          requested_by_id: formData.requested_by_id || undefined, // Send as undefined if null for partial updates.
          assigned_to_id: formData.assigned_to_id,
        };
        await updateServiceRequest(formData.request_id_display, updatePayload, token); // Call update API.
        showSnackbar('Service Request updated successfully!', 'success');
      } else {
        // CREATE new service request.
        const createPayload: NewServiceRequestData = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          requested_by_id: formData.requested_by_id!, // Assert non-null after validation above.
          assigned_to_id: formData.assigned_to_id,
        };
        await createServiceRequest(createPayload, token); // Call create API.
        showSnackbar('Service Request created successfully!', 'success');
      }
      navigate('/service-requests'); // Redirect to the service requests list on success.
    } catch (err: unknown) {
      console.error("ServiceRequestForm: Submission error:", err);
      const errorMessage = parseError(err);
      setError(errorMessage);
      showSnackbar(`Submission failed: ${errorMessage}`, 'error');
    } finally {
      setSubmitting(false); // Reset submitting state.
    }
  };

  // Determine if the submit button should be disabled.
  // Disabled if: submitting, authentication is loading, or it's a new request AND requested_by_id is invalid.
  const isSubmitDisabled = submitting || authLoading || (id === undefined && (formData.requested_by_id === null || formData.requested_by_id === undefined || formData.requested_by_id === 0));

  // --- Diagnostic logs for current component render state ---
  console.log('ServiceRequestForm Render State:');
  console.log(' - authLoading:', authLoading);
  console.log(' - user (from useAuth):', user); // This will show the actual user object from AuthContext.
  console.log(' - formData.requested_by_id:', formData.requested_by_id); // The ID used internally for form data.
  console.log(' - requestedByDisplay:', requestedByDisplay); // What's actually shown in the "Requested By" text field.
  console.log(' - isSubmitDisabled:', isSubmitDisabled);
  console.log(' - users (for dropdowns):', users); // The array of users fetched for dropdowns.
  // --- End Diagnostic logs ---


  // Show a loading spinner if either authentication or user list is still loading.
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

  // Show an error alert if there's a form-specific error.
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
    <Box sx={{ p: 0, maxWidth: 600, mx: 'auto' }}>
      {/* <Typography variant="h4" gutterBottom>
        {id && initialData?.request_id ? `Edit Service Request: ${initialData.request_id}` : 'Create New Service Request'}
      </Typography> */}
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 0 }}>
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
          {/* Render category options */}
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
          disabled={!id} // Status is only editable for existing requests
        >
          {/* Render status options */}
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
          {/* Render priority options */}
          {Array.isArray(PRIORITY_OPTIONS) && PRIORITY_OPTIONS.map((priority) => (
            <MenuItem key={priority} value={priority}>
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </MenuItem>
          ))}
        </TextField>

        {/* Display for "Requested By" - this field is always read-only for new requests.
            It shows the automatically assigned user. */}
        <TextField
          label="Requested By"
          name="requested_by_id_display" // Distinct name for display field.
          value={requestedByDisplay} // Display the resolved username/ID string.
          fullWidth
          margin="normal"
          required
          InputProps={{
            readOnly: true, // Make it non-editable.
            style: { cursor: 'not-allowed' } // Visual cue for non-editability.
          }}
        />

        {/* This is an *editable* "Requested By" dropdown, visible ONLY in edit mode.
            It allows changing the requestor for an existing request (e.g., by an admin). */}
        {id && (
            <TextField
                select
                label="Requested By (Editable)"
                name="requested_by_id" // This directly maps to formData.requested_by_id.
                value={formData.requested_by_id || ''}
                onChange={handleUserChange}
                fullWidth
                margin="normal"
                required
            >
                {/* Conditionally render menu items: loading, no users, or actual user list. */}
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

        {/* "Assigned To" dropdown, always editable. */}
        <TextField
          select
          label="Assigned To"
          name="assigned_to_id"
          value={formData.assigned_to_id || ''}
          onChange={handleUserChange}
          fullWidth
          margin="normal"
        >
          {/* Conditionally render menu items: loading, 'None', or actual user list. */}
          {users.length === 0 ? (
            <MenuItem value="" disabled>
              <em>{loadingUsers ? 'Loading Users...' : 'No Users Available'}</em>
            </MenuItem>
          ) : (
            [
              <MenuItem key="none" value="">
                <em>None</em> {/* Option for no assignee */}
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
