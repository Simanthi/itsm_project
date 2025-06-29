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
import { getIomTemplateById } from '../../../api/genericIomApi';
import { getGenericIomById, createGenericIom, updateGenericIom } from '../../../api/genericIomApi';
import { getContentTypeId as fetchContentTypeIdFromApi } from '../../../api/coreApi'; // Import the real API call
import type { IOMTemplate } from '../../iomTemplateAdmin/types/iomTemplateAdminTypes'; // FieldDefinition kept as IOMTemplate uses it
import type { GenericIOMCreateData, GenericIOMUpdateData, IomDataPayload } from '../types/genericIomTypes'; // GenericIOM removed
import DynamicIomFormFieldRenderer, { type FormFieldValue } from './DynamicIomFormFieldRenderer'; // FormFieldValue to type-only import

// Define the type for assetContext prop
interface AssetContextType {
  objectId: number;
  contentTypeAppLabel: string;
  contentTypeModel: string;
  assetName?: string;
  assetTag?: string;
}

interface GenericIomFormProps {
  assetContext?: AssetContextType | null; // Make it optional
}

const GenericIomForm: React.FC<GenericIomFormProps> = ({ assetContext = null }) => {
  const { templateId: templateIdParam, iomId: iomIdParam } = useParams<{ templateId?: string; iomId?: string }>();
  const navigate = useNavigate();
  const { authenticatedFetch } = useAuth();
  const { showSnackbar } = useUI();

  const [iomTemplate, setIomTemplate] = useState<IOMTemplate | null>(null);
  // const [initialDataPayload, setInitialDataPayload] = useState<IomDataPayload>({}); // Removed unused state

  // Form state for standard fields
  const [subject, setSubject] = useState<string>('');
  const [toUsersStr, setToUsersStr] = useState<string>('');
  const [toGroupsStr, setToGroupsStr] = useState<string>('');
  const [parentContentTypeId, setParentContentTypeId] = useState<number | null>(null);
  const [parentObjectId, setParentObjectId] = useState<number | null>(null);
  const [parentDisplay, setParentDisplay] = useState<string>(''); // For showing e.g. "Asset: Laptop X"

  // Form state for dynamic data_payload fields
  const [dynamicFormData, setDynamicFormData] = useState<IomDataPayload>({});

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false); // This will be set by iomIdParam
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // Added isSubmitting state

  // Determine mode and IDs from URL params
  const currentIomId = iomIdParam ? parseInt(iomIdParam, 10) : null;
  const currentTemplateIdForCreate = templateIdParam ? parseInt(templateIdParam, 10) : null;

  // Use the real API call for ContentType ID
  const fetchContentTypeId = useCallback(async (appLabel: string, model: string): Promise<number | null> => {
    if (!authenticatedFetch) return null;
    try {
      const contentTypeInfo = await fetchContentTypeIdFromApi(authenticatedFetch, appLabel, model);
      return contentTypeInfo ? contentTypeInfo.id : null;
    } catch (error) {
      console.error(`Failed to fetch ContentType ID for ${appLabel}.${model}:`, error);
      showSnackbar(`Could not resolve type for ${appLabel}.${model}. GFK link may fail.`, 'error');
      return null;
    }
  }, [authenticatedFetch, showSnackbar]);


  const loadData = useCallback(async () => {
    if (!authenticatedFetch) return;
    setIsLoading(true);
    setError(null);
    try {
      if (currentIomId) { // Edit mode
        setIsEditMode(true);
        const fetchedIom = await getGenericIomById(authenticatedFetch, currentIomId);
        if (!fetchedIom.iom_template_details) {
            throw new Error("IOM data is missing template details for editing.");
        }
        const templateForEdit = fetchedIom.iom_template_details as unknown as IOMTemplate;
        setIomTemplate(templateForEdit);
        setSubject(fetchedIom.subject);
        setDynamicFormData(fetchedIom.data_payload || {});
        // setInitialDataPayload(fetchedIom.data_payload || {}); // Removed
        setToUsersStr(fetchedIom.to_users?.join(',') || '');
        setToGroupsStr(fetchedIom.to_groups?.join(',') || '');
        setParentContentTypeId(fetchedIom.parent_content_type || null);
        setParentObjectId(fetchedIom.parent_object_id || null);
        if (fetchedIom.parent_record_display) setParentDisplay(fetchedIom.parent_record_display);

      } else if (currentTemplateIdForCreate) { // Create mode
        setIsEditMode(false);
        const fetchedTemplate = await getIomTemplateById(authenticatedFetch, currentTemplateIdForCreate);
        setIomTemplate(fetchedTemplate);
        const initialPayload: IomDataPayload = {}; // Changed let to const
        fetchedTemplate.fields_definition.forEach(field => {
          if (field.defaultValue !== undefined) {
            initialPayload[field.name] = field.defaultValue;
          }
        });

        // Pre-fill from assetContext if available
        if (assetContext) {
          setParentObjectId(assetContext.objectId);
          const ctId = await fetchContentTypeId(assetContext.contentTypeAppLabel, assetContext.contentTypeModel);
          setParentContentTypeId(ctId);
          setParentDisplay(`Asset: ${assetContext.assetName || assetContext.assetTag || `ID ${assetContext.objectId}`}`);

          // Example pre-filling a data_payload field if template is designed for it
          const assetNameField = fetchedTemplate.fields_definition.find(f => f.name === 'related_asset_name' || f.name === 'asset_name');
          if (assetNameField && assetContext.assetName) {
            initialPayload[assetNameField.name] = assetContext.assetName;
          }
          const assetTagField = fetchedTemplate.fields_definition.find(f => f.name === 'related_asset_tag' || f.name === 'asset_tag');
          if (assetTagField && assetContext.assetTag) {
            initialPayload[assetTagField.name] = assetContext.assetTag;
          }
        }
        setDynamicFormData(initialPayload);
         // setInitialDataPayload(initialPayload); // Removed
      } else {
        throw new Error("No Template ID for new IOM or IOM ID for editing.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      setError(`Failed to load form data: ${message}`);
      showSnackbar(`Error: ${message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, currentTemplateIdForCreate, currentIomId, showSnackbar, assetContext, fetchContentTypeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDynamicFieldChange = (fieldName: string, value: FormFieldValue) => { // Changed value type to FormFieldValue
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
        subject, // Removed duplicate subject
        data_payload: dynamicFormData,
        to_users: toUsersStr.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id) && id > 0),
        to_groups: toGroupsStr.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id) && id > 0),
        parent_content_type_id: parentContentTypeId,
        parent_object_id: parentObjectId,
    };

    try {
      if (isEditMode && currentIomId) {
        const updateData: GenericIOMUpdateData = commonPayload;
        const updatedIom = await updateGenericIom(authenticatedFetch, currentIomId, updateData);
        showSnackbar(`IOM "${updatedIom.subject}" updated successfully!`, 'success');
        navigate(`/ioms/view/${updatedIom.id}`);
      } else if (currentTemplateIdForCreate) {
        const createData: GenericIOMCreateData = {
          ...commonPayload,
          iom_template: currentTemplateIdForCreate,
        };
        const newIom = await createGenericIom(authenticatedFetch, createData);
        showSnackbar(`IOM "${newIom.subject}" created successfully!`, 'success');
        navigate(`/ioms/view/${newIom.id}`);
      }
    } catch (err: unknown) {
      const errorData = (err as { data?: unknown })?.data || err;
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
            {parentDisplay && <Typography variant="subtitle1" color="primary.main" sx={{mt:1}}>Relating to: {parentDisplay}</Typography>}
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
          {/* Parent Record GFK input fields - simplified for PoC, hidden if pre-filled by context */}
          {!assetContext && !isEditMode && ( // Only show if not pre-filled and not editing (where it's part of fetched data)
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="parentContentTypeId"
                  label="Parent Type ID (Optional)"
                  type="number"
                  value={parentContentTypeId || ''}
                  onChange={(e) => setParentContentTypeId(e.target.value ? parseInt(e.target.value) : null)}
                  fullWidth
                  disabled={isSubmitting}
                  helperText="ID of the ContentType (e.g., for 'assets.asset'). Needs API to lookup."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="parentObjectId"
                  label="Parent Object ID (Optional)"
                  type="number"
                  value={parentObjectId || ''}
                  onChange={(e) => setParentObjectId(e.target.value ? parseInt(e.target.value) : null)}
                  fullWidth
                  disabled={isSubmitting || !parentContentTypeId} // Disable if no content type selected
                  helperText="ID of the related object."
                />
              </Grid>
            </>
          )}

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
