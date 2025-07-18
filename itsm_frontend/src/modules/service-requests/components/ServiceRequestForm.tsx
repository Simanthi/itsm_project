/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import {
  TextField,
  Button,
  Box,
  Typography,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  type ServiceRequest,
  type NewServiceRequestData,
  type ServiceRequestCategory,
  type ServiceRequestPriority,
  type ServiceRequestStatus,
} from '../types/ServiceRequestTypes';
import { getUserList } from '../../../api/authApi';
import { updateServiceRequest } from '../../../api/serviceRequestApi';
import { useAuth } from '../../../context/auth/useAuth';
import { useUI } from '../../../context/UIContext/useUI';
import { useServiceRequests } from '../hooks/useServiceRequests';

interface User {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
}

const CATEGORY_OPTIONS = [
  'software',
  'hardware',
  'account',
  'network',
  'printer',
  'system',
  'information',
  'other',
] as const;
const STATUS_OPTIONS = [
  'new',
  'in_progress',
  'pending_approval',
  'resolved',
  'closed',
  'cancelled',
] as const;
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
  catalog_item_id?: number | null; // Added catalog_item_id
}

interface ServiceRequestFormProps {
  initialData?: Partial<ServiceRequest> & { catalog_item_id?: number }; // Allow partial for prefill from catalog
  catalogItemName?: string; // For display
}

const ServiceRequestForm: React.FC<ServiceRequestFormProps> = ({
  initialData,
  catalogItemName,
}) => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading, authenticatedFetch } = useAuth();
  const { showSnackbar } = useUI();
  const { addServiceRequest } = useServiceRequests();

  const [formData, setFormData] = useState<ServiceRequestFormState>({
    title: '',
    description: '',
    category: CATEGORY_OPTIONS[0],
    status: STATUS_OPTIONS[0],
    priority: PRIORITY_OPTIONS[1],
    requested_by_id: null,
    assigned_to_id: null,
    request_id_display: undefined,
    catalog_item_id: undefined,
  });

  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [requestedByDisplay, setRequestedByDisplay] = useState<string>('');

  const parseError = useCallback((err: unknown): string => {
    if (err instanceof Error) {
      if (err.message.includes('API error: ') && err.message.includes('{')) {
        try {
          const errorPart = err.message.substring(err.message.indexOf('{'));
          const errorDetails = JSON.parse(errorPart);
          const firstKey = Object.keys(errorDetails)[0];
          if (
            firstKey &&
            Array.isArray(errorDetails[firstKey]) &&
            typeof errorDetails[firstKey][0] === 'string'
          ) {
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

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    if (!authenticatedFetch) {
      setUsers([]);
      setError('Authentication context not available. Cannot fetch users.');
      setLoadingUsers(false);
      return;
    }
    try {
      const usersData = await getUserList(authenticatedFetch);
      setUsers(usersData);
      setError(null);
    } catch (err) {
      console.error(
        'ServiceRequestForm: Error fetching users for dropdowns:',
        err,
      );
      setError(parseError(err));
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [authenticatedFetch, parseError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (id && initialData && Object.keys(initialData).length > 0) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        category: initialData.category || CATEGORY_OPTIONS[0],
        status: initialData.status || STATUS_OPTIONS[0],
        priority: initialData.priority || PRIORITY_OPTIONS[1],
        requested_by_id: initialData.requested_by_id || null,
        assigned_to_id: initialData.assigned_to_id || null,
        request_id_display: initialData.request_id,
        catalog_item_id: (initialData.catalog_item_id !== undefined
          ? initialData.catalog_item_id
          : undefined),
      });
    } else if (!id) {
      const prefillTitle = initialData?.title || '';
      const prefillDescription = initialData?.description || '';
      const prefillCatalogItemId = (initialData?.catalog_item_id !== undefined
        ? initialData.catalog_item_id
        : undefined);

      if (!authLoading && user && user.id && user.id !== 0) {
        setFormData((prev) => ({
          ...prev,
          title: prefillTitle || prev.title,
          description: prefillDescription || prev.description,
          catalog_item_id: prefillCatalogItemId || prev.catalog_item_id,
          requested_by_id: user.id,
          category: CATEGORY_OPTIONS[0],
          status: STATUS_OPTIONS[0],
          priority: PRIORITY_OPTIONS[1],
          assigned_to_id: null,
          request_id_display: undefined,
        }));
        setError(null);
      } else if (!authLoading && (!user || user.id === 0)) {
        setFormData((prev) => ({
          ...prev,
          title: prefillTitle || prev.title,
          description: prefillDescription || prev.description,
          catalog_item_id: prefillCatalogItemId || prev.catalog_item_id,
          requested_by_id: null,
        }));
        setError(
          'Logged-in user not found. Please log in to be set as the requester.',
        );
      } else if (authLoading) {
        setFormData((prev) => ({
          ...prev,
          title: prefillTitle || prev.title,
          description: prefillDescription || prev.description,
          catalog_item_id: prefillCatalogItemId || prev.catalog_item_id,
        }));
      }
    }
  }, [id, initialData, user, authLoading]);

  useEffect(() => {
    if (
      formData.requested_by_id !== null &&
      formData.requested_by_id !== 0 &&
      users.length > 0
    ) {
      const userFound = users.find((u) => u.id === formData.requested_by_id);
      if (userFound) {
        setRequestedByDisplay(`ID: ${userFound.id} - ${userFound.username}`);
      } else {
        setRequestedByDisplay(
          `ID: ${formData.requested_by_id} - User Not Found`,
        );
      }
    } else if (!authLoading && user && user.id && user.id !== 0 && !id) {
      setRequestedByDisplay(`ID: ${user.id} - ${user.name} (from AuthContext)`);
    } else {
      setRequestedByDisplay('');
    }
  }, [formData.requested_by_id, users, user, authLoading, id]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUserChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === '' ? null : Number(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!authenticatedFetch && id) {
      setError('Authentication context not available. Please log in.');
      showSnackbar(
        'Authentication context not available. Please log in.',
        'error',
      );
      setSubmitting(false);
      return;
    }

    if (
      !id &&
      (formData.requested_by_id === null ||
        formData.requested_by_id === undefined ||
        formData.requested_by_id === 0)
    ) {
      setError(
        "The 'Requested By' user is not set or invalid. Please ensure you are logged in.",
      );
      showSnackbar(
        "The 'Requested By' user is not set. Please ensure you are logged in and your user ID is valid.",
        'warning',
      );
      setSubmitting(false);
      return;
    }

    try {
      if (id) {
        if (!formData.request_id_display) {
          setError(
            'Cannot update: Service Request ID (string format) not found.',
          );
          showSnackbar(
            'Error: Service Request ID missing for update.',
            'error',
          );
          setSubmitting(false);
          return;
        }
        const updatePayload: Partial<NewServiceRequestData> & {
          status?: ServiceRequestStatus;
        } = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          status: formData.status,
          priority: formData.priority,
          requested_by_id: formData.requested_by_id || undefined,
          assigned_to_id: formData.assigned_to_id,
        };
        await updateServiceRequest(
          authenticatedFetch,
          formData.request_id_display,
          updatePayload,
        );
        showSnackbar('Service Request updated successfully!', 'success');
      } else {
        // Only include catalog_item_id if it is defined
        const createPayload: NewServiceRequestData = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          requested_by_id: formData.requested_by_id!,
          assigned_to_id: formData.assigned_to_id,
          ...(formData.catalog_item_id !== undefined && { catalog_item_id: formData.catalog_item_id }),
        };
        await addServiceRequest(createPayload);
        showSnackbar('Service Request created successfully!', 'success');
      }
      navigate('/service-requests');
    } catch (err: unknown) {
      console.error('ServiceRequestForm: Submission error:', err);
      const errorMessage = parseError(err);
      setError(errorMessage);
      showSnackbar(`Submission failed: ${errorMessage}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled =
    submitting ||
    authLoading ||
    (id === undefined &&
      (formData.requested_by_id === null ||
        formData.requested_by_id === undefined ||
        formData.requested_by_id === 0));

  if (loadingUsers || authLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80vh',
          flexDirection: 'column',
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2, mt: 2 }}>
          {authLoading
            ? 'Authenticating and loading user data...'
            : 'Loading users for the form...'}
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/service-requests')}
          sx={{ mt: 2 }}
        >
          Back to Service Requests
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 0, maxWidth: 600, mx: 'auto' }}>
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 0 }}>
        {catalogItemName && (
          <TextField
            label="Catalog Item"
            value={catalogItemName}
            fullWidth
            margin="normal"
            InputProps={{
              readOnly: true,
            }}
            sx={{ mb: 2 }}
          />
        )}
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
          {Array.isArray(CATEGORY_OPTIONS) &&
            CATEGORY_OPTIONS.map((category) => (
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
          {Array.isArray(STATUS_OPTIONS) &&
            STATUS_OPTIONS.map((status) => (
              <MenuItem key={status} value={status}>
                {status
                  .replace(/_/g, ' ')
                  .split(' ')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')}
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
          {Array.isArray(PRIORITY_OPTIONS) &&
            PRIORITY_OPTIONS.map((priority) => (
              <MenuItem key={priority} value={priority}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </MenuItem>
            ))}
        </TextField>
        <TextField
          label="Requested By"
          name="requested_by_id_display"
          value={requestedByDisplay}
          fullWidth
          margin="normal"
          required
          InputProps={{
            readOnly: true,
            style: { cursor: 'not-allowed' },
          }}
        />
        {id && (
          <TextField
            select
            label="Requested By (Editable)"
            name="requested_by_id"
            value={formData.requested_by_id || ''}
            onChange={handleUserChange}
            fullWidth
            margin="normal"
            required
          >
            {users.length === 0 ? (
              <MenuItem value="" disabled>
                <em>
                  {loadingUsers ? 'Loading Users...' : 'No Users Available'}
                </em>
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
          {users.length === 0 ? (
            <MenuItem value="" disabled>
              <em>
                {loadingUsers ? 'Loading Users...' : 'No Users Available'}
              </em>
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
              )),
            ]
          )}
        </TextField>
        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitDisabled}
          >
            {submitting ? (
              <CircularProgress size={24} />
            ) : id ? (
              'Update Request'
            ) : (
              'Create Request'
            )}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => navigate('/service-requests')}
            disabled={submitting}
          >
            Cancel
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ServiceRequestForm;
