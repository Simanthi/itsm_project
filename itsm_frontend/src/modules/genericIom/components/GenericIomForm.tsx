import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  // For GFK selectors later:
  // FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';


import { useAuth } from '../../../context/auth/useAuth';
import { useUI } from '../../../context/UIContext/useUI';
import { getIomTemplateById } from '../../../api/genericIomApi'; // For fetching template on create
import { getGenericIomById, createGenericIom, updateGenericIom } from '../../../api/genericIomApi'; // For IOM CRUD
import type { IOMTemplate, FieldDefinition } from '../../iomTemplateAdmin/types/iomTemplateAdminTypes';
import type { GenericIOM, GenericIOMCreateData, GenericIOMUpdateData, IomDataPayload } from '../types/genericIomTypes';
import DynamicIomFormFieldRenderer from './DynamicIomFormFieldRenderer'; // The dynamic renderer

interface GenericIomFormProps {
  // Props can be used if this form is embedded, but using useParams for page-level form
}

const GenericIomForm: React.FC<GenericIomFormProps> = () => {
  const { templateId: templateIdParam, iomId: iomIdParam } = useParams<{ templateId?: string; iomId?: string }>();
  const navigate = useNavigate();
  const { authenticatedFetch } = useAuth();
  const { showSnackbar } = useUI();

  const [iomTemplate, setIomTemplate] = useState<IOMTemplate | null>(null);
  const [initialDataPayload, setInitialDataPayload] = useState<IomDataPayload>({});

  // Form state for standard fields
  const [subject, setSubject] = useState<string>('');
  const [toUsersStr, setToUsersStr] = useState<string>(''); // Comma-separated IDs
  const [toGroupsStr, setToGroupsStr] = useState<string>(''); // Comma-separated IDs
  // TODO: Add state for parent_content_type_id and parent_object_id

  // Form state for dynamic data_payload fields
  const [dynamicFormData, setDynamicFormData] = useState<IomDataPayload>({});

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = Boolean(iomIdParam);
  const templateId = isEditMode ? null : (templateIdParam ? parseInt(templateIdParam,10) : null);
  const iomId = isEditMode ? (iomIdParam ? parseInt(iomIdParam,10) : null) : null;


  const loadData = useCallback(async () => {
    if (!authenticatedFetch) return;
    setIsLoading(true);
    setError(null);
    try {
      if (isEditMode && iomId) {
        const fetchedIom = await getGenericIomById(authenticatedFetch, iomId);
        if (!fetchedIom.iom_template_details) { // Ensure template details are fetched with IOM for edit
            showSnackbar("IOM data is missing template details for editing.", "error");
            setError("IOM data is missing template details for editing.");
            setIsLoading(false);
            return;
        }
        // Assuming iom_template_details contains the full template structure including fields_definition
        const templateForEdit = fetchedIom.iom_template_details as unknown as IOMTemplate; // Cast if necessary
        setIomTemplate(templateForEdit);
        setSubject(fetchedIom.subject);
        setDynamicFormData(fetchedIom.data_payload || {});
        setInitialDataPayload(fetchedIom.data_payload || {});
        setToUsersStr(fetchedIom.to_users?.join(',') || '');
        setToGroupsStr(fetchedIom.to_groups?.join(',') || '');
        // TODO: Set parent record fields
      } else if (templateId) { // Create mode
        const fetchedTemplate = await getIomTemplateById(authenticatedFetch, templateId);
        setIomTemplate(fetchedTemplate);
        // Initialize dynamicFormData with defaultValues from template
        const initialPayload: IomDataPayload = {};
        fetchedTemplate.fields_definition.forEach(field => {
          if (field.defaultValue !== undefined) {
            initialPayload[field.name] = field.defaultValue;
          }
        });
        setDynamicFormData(initialPayload);
        setInitialDataPayload(initialPayload);
      } else {
        setError("No Template ID provided for new IOM or IOM ID for editing.");
        showSnackbar("Cannot load form: Missing Template or IOM ID.", "error");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      setError(`Failed to load data: ${message}`);
      showSnackbar(`Error: ${message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, templateId, iomId, isEditMode, showSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDynamicFieldChange = (fieldName: string, value: any) => {
    setDynamicFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authenticatedFetch || !iomTemplate) {
      setError("Form not ready or authentication error.");
      return;
    }

    // Basic validation for subject
    if (!subject.trim()) {
        showSnackbar("Subject is required.", "warning");
        setError("Subject is required.");
        return;
    }
    // TODO: Add validation for required dynamic fields based on iomTemplate.fields_definition

    setIsSubmitting(true);
    setError(null);

    const commonPayload = {
        subject,
        data_payload: dynamicFormData,
        to_users: toUsersStr.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id) && id > 0),
        to_groups: toGroupsStr.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id) && id > 0),
        // TODO: Add parent_content_type_id, parent_object_id
    };

    try {
      if (isEditMode && iomId) {
        const updateData: GenericIOMUpdateData = commonPayload;
        // Note: iom_template cannot be changed on update as per GenericIOMUpdateData definition
        const updatedIom = await updateGenericIom(authenticatedFetch, iomId, updateData);
        showSnackbar(`IOM "${updatedIom.subject}" updated successfully!`, 'success');
        navigate(`/ioms/view/${updatedIom.id}`);
      } else if (templateId) { // Create mode
        const createData: GenericIOMCreateData = {
          ...commonPayload,
          iom_template: templateId, // Add templateId for creation
        };
        const newIom = await createGenericIom(authenticatedFetch, createData);
        showSnackbar(`IOM "${newIom.subject}" created successfully!`, 'success');
        navigate(`/ioms/view/${newIom.id}`); // Navigate to the new IOM's detail view
      }
    } catch (err: any) {
      const errorData = err?.data || err;
      let errorMessage = "Failed to save IOM.";
      if (typeof errorData === 'object' && errorData !== null) {
        const fieldErrors = Object.entries(errorData)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
            .join('; ');
        if (fieldErrors) errorMessage = `Validation Error: ${fieldErrors}`;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      }
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }

  if (error && !isSubmitting) { // Show general error if not during submission attempt (already handled by loadData for initial load)
    // This error state is more for submission errors that are not field-specific.
    // return <Alert severity="error" sx={{m:2}}>{error}</Alert>;
  }

  if (!iomTemplate) {
    return <Alert severity="warning" sx={{m:2}}>Template information could not be loaded. {error}</Alert>;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>Template: {iomTemplate.name}</Typography>
            {iomTemplate.description && <Typography variant="body2" color="textSecondary" gutterBottom>{iomTemplate.description}</Typography>}
          </Grid>

          <Grid item xs={12}>
            <TextField
              name="subject"
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              fullWidth
              required
              disabled={isSubmitting}
            />
          </Grid>

          {/* Dynamic Fields Section */}
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{p:2}}>
                <Typography variant="subtitle1" gutterBottom>Details (based on template)</Typography>
                <Grid container spacing={2}>
                    {iomTemplate.fields_definition.map((fieldDef) => (
                    <Grid item xs={12} md={fieldDef.type === 'text_area' ? 12 : (fieldDef.type === 'boolean' ? 12 : 6)} key={fieldDef.name}>
                        <DynamicIomFormFieldRenderer
                        field={fieldDef}
                        value={dynamicFormData[fieldDef.name]}
                        onChange={handleDynamicFieldChange}
                        disabled={isSubmitting}
                        // TODO: Pass field-specific errors if available from backend validation on data_payload
                        />
                    </Grid>
                    ))}
                </Grid>
            </Paper>
          </Grid>

          {/* Standard Fields: Recipients, Parent Record - Simplified for now */}
          <Grid item xs={12} md={6}>
            <TextField
                name="toUsersStr"
                label="To Users (comma-separated IDs)"
                value={toUsersStr}
                onChange={(e) => setToUsersStr(e.target.value)}
                fullWidth
                disabled={isSubmitting}
                helperText="Future: User selector component."
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
                name="toGroupsStr"
                label="To Groups (comma-separated IDs)"
                value={toGroupsStr}
                onChange={(e) => setToGroupsStr(e.target.value)}
                fullWidth
                disabled={isSubmitting}
                helperText="Future: Group selector component."
            />
          </Grid>
          {/* TODO: Add Parent Record GFK input fields (ContentType dropdown, ObjectID input) */}


          <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? <CircularProgress size={24} /> : (isEditMode ? 'Update IOM' : 'Create IOM')}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default GenericIomForm;
