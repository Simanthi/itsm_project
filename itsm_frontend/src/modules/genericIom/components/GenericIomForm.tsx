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
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { useAuth } from '../../../context/auth/useAuth';
import { useUI } from '../../../context/UIContext/useUI';
import { getIomTemplateById } from '../../../api/genericIomApi';
import { getGenericIomById, createGenericIom, updateGenericIom } from '../../../api/genericIomApi';
import { getContentTypeId as fetchContentTypeIdFromApi } from '../../../api/coreApi';
import type { IOMTemplate } from '../../iomTemplateAdmin/types/iomTemplateAdminTypes';
import type { GenericIOMCreateData, GenericIOMUpdateData, IomDataPayload } from '../types/genericIomTypes';
import DynamicIomFormFieldRenderer, { type FormFieldValue } from './DynamicIomFormFieldRenderer';
import IomPreviewRenderer from './IomPreviewRenderer';

interface ParentRecordContextType {
  objectId: number;
  contentTypeAppLabel: string;
  contentTypeModel: string;
  recordName?: string;
  recordIdentifier?: string;
}

interface GenericIomFormProps {
  parentRecordContext?: ParentRecordContextType | null;
}

const GenericIomForm: React.FC<GenericIomFormProps> = ({ parentRecordContext = null }) => {
  const { templateId: templateIdParam, iomId: iomIdParam } = useParams<{ templateId?: string; iomId?: string }>();
  const navigate = useNavigate();
  const { authenticatedFetch, user } = useAuth();
  const { showSnackbar } = useUI();

  const [iomTemplate, setIomTemplate] = useState<IOMTemplate | null>(null);
  const [subject, setSubject] = useState<string>('');
  const [toUsersStr, setToUsersStr] = useState<string>('');
  const [toGroupsStr, setToGroupsStr] = useState<string>('');
  const [parentContentTypeId, setParentContentTypeId] = useState<number | null>(null);
  const [parentObjectId, setParentObjectId] = useState<number | null>(null);
  const [parentDisplay, setParentDisplay] = useState<string>('');
  const [dynamicFormData, setDynamicFormData] = useState<IomDataPayload>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);

  const currentIomId = iomIdParam ? parseInt(iomIdParam, 10) : null;
  const currentTemplateIdForCreate = templateIdParam ? parseInt(templateIdParam, 10) : null;

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
      if (currentIomId) {
        setIsEditMode(true);
        const fetchedIom = await getGenericIomById(authenticatedFetch, currentIomId);
        if (!fetchedIom.iom_template_details) {
            throw new Error("IOM data is missing template details for editing.");
        }
        const templateForEdit = fetchedIom.iom_template_details as unknown as IOMTemplate;
        setIomTemplate(templateForEdit);
        setSubject(fetchedIom.subject);
        setDynamicFormData(fetchedIom.data_payload || {});
        setToUsersStr(fetchedIom.to_users?.join(',') || '');
        setToGroupsStr(fetchedIom.to_groups?.join(',') || '');
        setParentContentTypeId(fetchedIom.parent_content_type || null);
        setParentObjectId(fetchedIom.parent_object_id || null);
        if (fetchedIom.parent_record_display) setParentDisplay(fetchedIom.parent_record_display);
      } else if (currentTemplateIdForCreate) {
        setIsEditMode(false);
        const fetchedTemplate = await getIomTemplateById(authenticatedFetch, currentTemplateIdForCreate);
        setIomTemplate(fetchedTemplate);
        const initialPayload: IomDataPayload = {};
        fetchedTemplate.fields_definition.forEach(field => {
          if (field.defaultValue !== undefined) {
            initialPayload[field.name] = field.defaultValue;
          }
        });
        if (parentRecordContext) {
          setParentObjectId(parentRecordContext.objectId);
          const ctId = await fetchContentTypeId(parentRecordContext.contentTypeAppLabel, parentRecordContext.contentTypeModel);
          setParentContentTypeId(ctId);
          const modelNameDisplay = parentRecordContext.contentTypeModel.replace(/_/g, ' ');
          const capitalizedModelName = modelNameDisplay.charAt(0).toUpperCase() + modelNameDisplay.slice(1);
          setParentDisplay(
            `${capitalizedModelName}: ${parentRecordContext.recordName || parentRecordContext.recordIdentifier || `ID ${parentRecordContext.objectId}`}`
          );
          const recordNameField = fetchedTemplate.fields_definition.find(f =>
            f.name === 'related_record_name' || f.name === `${parentRecordContext.contentTypeModel}_name`
          );
          if (recordNameField && parentRecordContext.recordName) {
            initialPayload[recordNameField.name] = parentRecordContext.recordName;
          }
          const recordIdentifierField = fetchedTemplate.fields_definition.find(f =>
            f.name === 'related_record_identifier' || f.name === `${parentRecordContext.contentTypeModel}_identifier`
          );
          if (recordIdentifierField && parentRecordContext.recordIdentifier) {
            initialPayload[recordIdentifierField.name] = parentRecordContext.recordIdentifier;
          }
        }
        if (user?.department_name) {
            const fromDepartmentField = fetchedTemplate.fields_definition.find(
                f => f.name === 'from_department' || f.name === 'sender_department'
            );
            if (fromDepartmentField && initialPayload[fromDepartmentField.name] === undefined) {
                initialPayload[fromDepartmentField.name] = user.department_name;
            }
        }
        if (user?.name) {
            const fromUserField = fetchedTemplate.fields_definition.find(
                f => f.name === 'from_user' || f.name === 'sender_user_name' || f.name === 'created_by_name_field'
            );
            if (fromUserField && initialPayload[fromUserField.name] === undefined) {
                 initialPayload[fromUserField.name] = user.name;
            }
        }
        setDynamicFormData(initialPayload);
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
  }, [authenticatedFetch, currentTemplateIdForCreate, currentIomId, showSnackbar, parentRecordContext, fetchContentTypeId, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDynamicFieldChange = (fieldName: string, value: FormFieldValue) => {
    setDynamicFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    if(event) event.preventDefault();
    if (!authenticatedFetch || !iomTemplate) {
      setError("Form not ready or authentication error.");
      return;
    }
    if (!subject.trim()) {
        showSnackbar("Subject is required.", "warning");
        setError("Subject is required.");
        return;
    }
    setIsSubmitting(true);
    setError(null);
    const commonPayload = {
        subject,
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

  if (error && !isSubmitting) {
    // Error handled by snackbar primarily, this could be a fallback or for initial load errors not preventing form render
  }

  if (!iomTemplate) {
    return <Alert severity="warning" sx={{m:2}}>Template information could not be loaded. {error}</Alert>;
  }

  if (isPreviewing) {
    return (
      <Box sx={{p:2}}>
        <IomPreviewRenderer
            iomTemplate={iomTemplate}
            dataPayload={dynamicFormData}
            subject={subject}
            toUsersStr={toUsersStr}
            toGroupsStr={toGroupsStr}
            parentRecordDisplay={parentDisplay}
        />
        <Box sx={{mt: 2, display: 'flex', gap: 1}}>
            <Button
                variant="outlined"
                onClick={() => setIsPreviewing(false)}
            >
                Back to Form
            </Button>
            <Button
                type="submit" // Ensures this button can submit the form if it's part of one, or acts as a general button
                onClick={() => handleSubmit()} // Call handleSubmit without event arg
                variant="contained"
                color="primary"
                disabled={isSubmitting || isLoading}
                >
                {isSubmitting ? <CircularProgress size={24} /> : (isEditMode ? 'Update IOM' : 'Create IOM')}
            </Button>
        </Box>
      </Box>
    );
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
                        />
                    </Grid>
                    ))}
                </Grid>
            </Paper>
          </Grid>

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
          {!parentRecordContext && !isEditMode && (
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
                  disabled={isSubmitting || !parentContentTypeId}
                  helperText="ID of the related object."
                />
              </Grid>
            </>
          )}

          <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setIsPreviewing(true)}
              disabled={isSubmitting || isLoading}
            >
              Preview IOM
            </Button>
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
