import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Box,
  // Typography, // Unused import
  CircularProgress,
  Alert,
  Grid,
  // Paper, // Unused import
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormHelperText,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';

import { useAuth } from '../../../context/auth/useAuth';
import { useUI } from '../../../context/UIContext/useUI';
import {
  getIomTemplateById,
  createIomTemplate,
  updateIomTemplate,
  getIomCategories,
} from '../../../api/genericIomApi';
import type {
  IOMTemplate,
  IOMTemplateCreateData,
  // IOMTemplate, // Unused type import
  IOMTemplateCreateData,
  IOMTemplateUpdateData,
  IOMCategory,
  FieldDefinition,
} from '../types/iomTemplateAdminTypes';
// Assuming User/Group selector components might be needed later or are generic.
// For now, simple TextField for user/group IDs for 'simple_approval'.
// import UserSelector from '../../../components/shared/UserSelector'; // Example
// import GroupSelector from '../../../components/shared/GroupSelector'; // Example

const initialFormData: IOMTemplateCreateData = {
  name: '',
  description: '',
  category: undefined, // Use undefined for initial empty select
  fields_definition: [],
  approval_type: 'none',
  simple_approval_user: undefined,
  simple_approval_group: undefined,
  is_active: true,
};

// Basic example for fields_definition to guide the admin
const fieldsDefinitionExample = `[
  {
    "name": "title",
    "label": "Title",
    "type": "text_short",
    "required": true,
    "placeholder": "Enter the title"
  },
  {
    "name": "details",
    "label": "Details",
    "type": "text_area",
    "required": true
  },
  {
    "name": "due_date",
    "label": "Due Date",
    "type": "date"
  }
]`;


const IomTemplateForm: React.FC = () => {
  const { templateId } = useParams<{ templateId?: string }>();
  const navigate = useNavigate();
  const { authenticatedFetch } = useAuth(); // user object for created_by is handled by backend
  const { showSnackbar } = useUI();

  const [formData, setFormData] = useState<IOMTemplateCreateData | IOMTemplateUpdateData>(initialFormData);
  const [fieldsDefinitionString, setFieldsDefinitionString] = useState<string>(JSON.stringify([], null, 2));

  const [categories, setCategories] = useState<IOMCategory[]>([]);
  // TODO: Add state for users and groups if using selector components for simple_approval_user/group

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const isEditMode = Boolean(templateId);

  const fetchTemplateForEdit = useCallback(async () => {
    if (!isEditMode || !templateId || !authenticatedFetch) return;
    setIsLoading(true);
    setError(null);
    try {
      const template = await getIomTemplateById(authenticatedFetch, parseInt(templateId, 10));
      setFormData({
        name: template.name,
        description: template.description || '',
        category: template.category || undefined,
        fields_definition: template.fields_definition, // Keep as object array
        approval_type: template.approval_type,
        simple_approval_user: template.simple_approval_user || undefined,
        simple_approval_group: template.simple_approval_group || undefined,
        is_active: template.is_active,
      });
      setFieldsDefinitionString(JSON.stringify(template.fields_definition, null, 2));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Failed to load template: ${message}`);
      showSnackbar(`Error: ${message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [templateId, authenticatedFetch, showSnackbar, isEditMode]);

  const fetchCategories = useCallback(async () => {
    if (!authenticatedFetch) return;
    try {
      const response = await getIomCategories(authenticatedFetch, { pageSize: 200 }); // Fetch all for dropdown
      setCategories(response.results);
    } catch (err) {
      showSnackbar('Failed to load IOM categories for dropdown.', 'error');
      console.error("Failed to load categories:", err);
    }
  }, [authenticatedFetch, showSnackbar]);

  useEffect(() => {
    fetchCategories();
    if (isEditMode) {
      fetchTemplateForEdit();
    } else {
        // For new templates, provide an example or empty array string
        setFieldsDefinitionString(fieldsDefinitionExample);
    }
  }, [fetchCategories, fetchTemplateForEdit, isEditMode]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = event.target;
    if (type === 'checkbox') {
        const { checked } = event.target as HTMLInputElement;
        setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (event: SelectChangeEvent<string | number | undefined>, fieldName: keyof (IOMTemplateCreateData | IOMTemplateUpdateData) ) => {
    const value = event.target.value;
    setFormData(prev => ({
        ...prev,
        [fieldName as string]: value === '' || value === undefined ? null : value
    }));
    // If approval_type is not 'simple', clear simple_approval fields
    if (fieldName === 'approval_type' && value !== 'simple') {
        setFormData(prev => ({
            ...prev,
            simple_approval_user: undefined,
            simple_approval_group: undefined,
        }));
    }
  };

  const handleFieldsDefinitionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFieldsDefinitionString(event.target.value);
    setJsonError(null); // Clear previous JSON error on change
    try {
      const parsedJson = JSON.parse(event.target.value);
      if (!Array.isArray(parsedJson)) {
        setJsonError("Fields Definition must be a valid JSON array.");
        return;
      }
      setFormData(prev => ({ ...prev, fields_definition: parsedJson as FieldDefinition[] }));
    } catch (parseError) { // Changed 'e' to 'parseError' to avoid conflict if 'e' is used elsewhere
      setJsonError("Invalid JSON format. Please check syntax.");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authenticatedFetch) {
      setError("Authentication error.");
      return;
    }

    if (jsonError) {
        showSnackbar("Please fix the JSON error in Fields Definition.", "error");
        return;
    }

    const finalPayload = { ...formData }; // Changed let to const
    try {
        const parsedFieldsDef = JSON.parse(fieldsDefinitionString);
        finalPayload.fields_definition = parsedFieldsDef;
    } catch (parseError) { // Changed 'e' to 'parseError'
        setJsonError("Invalid JSON format in Fields Definition. Cannot submit.");
        showSnackbar("Invalid JSON in Fields Definition.", "error");
        return;
    }

    if (finalPayload.approval_type !== 'simple') {
        finalPayload.simple_approval_user = undefined;
        finalPayload.simple_approval_group = undefined;
    } else {
        // Ensure numeric IDs or null, not empty strings
        finalPayload.simple_approval_user = finalPayload.simple_approval_user ? Number(finalPayload.simple_approval_user) : null;
        finalPayload.simple_approval_group = finalPayload.simple_approval_group ? Number(finalPayload.simple_approval_group) : null;
    }
    // Ensure category is number or null
    finalPayload.category = finalPayload.category ? Number(finalPayload.category) : null;


    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditMode && templateId) {
        await updateIomTemplate(authenticatedFetch, parseInt(templateId, 10), finalPayload as IOMTemplateUpdateData);
        showSnackbar('IOM Template updated successfully!', 'success');
      } else {
        await createIomTemplate(authenticatedFetch, finalPayload as IOMTemplateCreateData);
        showSnackbar('IOM Template created successfully!', 'success');
      }
      navigate('/admin/iom-templates');
    } catch (err: unknown) { // Changed err: any to err: unknown
      const errorData = (err as any)?.data || err; // Use type assertion carefully or type guard
      let errorMessage = "Failed to save IOM template.";
      if (typeof errorData === 'object' && errorData !== null) {
        const fieldErrors = Object.entries(errorData)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`) // Ensure value is string
            .join('; ');
        if (fieldErrors) errorMessage = `Validation Error: ${fieldErrors}`;
      } else if (err instanceof Error) { // Check if it's an Error instance
        errorMessage = err.message;
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      }
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
      console.error("Submission error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && isEditMode) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }

  if (error && !isSubmitting) { // Show general error if not during submission attempt
    return <Alert severity="error" sx={{m:2}}>{error}</Alert>;
  }

  return (
    // The parent Paper and Back button are in IomTemplateFormPage.tsx
    // This component just renders the form itself.
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {error && isSubmitting && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <TextField
            name="name"
            label="Template Name"
            value={formData.name}
            onChange={handleChange}
            fullWidth
            required
            disabled={isSubmitting}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth>
            <InputLabel id="category-select-label">Category</InputLabel>
            <Select
              labelId="category-select-label"
              name="category"
              value={formData.category || ''}
              label="Category"
              onChange={(e) => handleSelectChange(e as SelectChangeEvent<string | number | undefined>, 'category')}
              disabled={isSubmitting}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <TextField
            name="description"
            label="Description"
            value={formData.description || ''}
            onChange={handleChange}
            fullWidth
            multiline
            rows={3}
            disabled={isSubmitting}
          />
        </Grid>
        <Grid item xs={12} md={4}>
            <FormControlLabel
                control={<Checkbox checked={formData.is_active || false} onChange={handleChange} name="is_active" />}
                label="Is Active"
                disabled={isSubmitting}
            />
        </Grid>
        <Grid item xs={12} md={8}>
            <FormControl fullWidth>
                <InputLabel id="approval-type-label">Approval Type</InputLabel>
                <Select
                    labelId="approval-type-label"
                    name="approval_type"
                    value={formData.approval_type}
                    label="Approval Type"
                    onChange={(e) => handleSelectChange(e as SelectChangeEvent<string>, 'approval_type')}
                    disabled={isSubmitting}
                >
                    <MenuItem value="none">No Approval Required</MenuItem>
                    <MenuItem value="simple">Simple Single Approver</MenuItem>
                    <MenuItem value="advanced">Advanced Workflow (via Rules)</MenuItem>
                </Select>
            </FormControl>
        </Grid>

        {formData.approval_type === 'simple' && (
          <>
            <Grid item xs={12} md={6}>
              <TextField
                name="simple_approval_user"
                label="Simple Approver User ID (Optional)"
                type="number" // Assuming ID input for now. Replace with UserSelector component later.
                value={formData.simple_approval_user || ''}
                onChange={handleChange}
                fullWidth
                disabled={isSubmitting}
                helperText="Enter User ID. A User Selector component would be ideal here."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="simple_approval_group"
                label="Simple Approver Group ID (Optional)"
                type="number" // Assuming ID input for now. Replace with GroupSelector component later.
                value={formData.simple_approval_group || ''}
                onChange={handleChange}
                fullWidth
                disabled={isSubmitting}
                helperText="Enter Group ID. A Group Selector component would be ideal here."
              />
            </Grid>
          </>
        )}

        <Grid item xs={12}>
          <TextField
            name="fields_definition"
            label="Fields Definition (JSON Array)"
            value={fieldsDefinitionString}
            onChange={handleFieldsDefinitionChange}
            fullWidth
            multiline
            rows={15}
            required
            disabled={isSubmitting}
            error={Boolean(jsonError)}
            helperText={jsonError || "Enter a valid JSON array defining form fields. See documentation for structure and examples."}
            InputProps={{
                sx: { fontFamily: 'monospace' }
            }}
          />
           <FormHelperText>
            Example: {fieldsDefinitionExample}
          </FormHelperText>
        </Grid>

        <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting || isLoading || Boolean(jsonError)}
          >
            {isSubmitting ? <CircularProgress size={24} /> : (isEditMode ? 'Update Template' : 'Create Template')}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default IomTemplateForm;
