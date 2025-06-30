import React from 'react';
import {
  TextField,
  Checkbox,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Box,
  Typography,
  ListItemText, // Added import
  InputAdornment // Added import
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import type { FieldDefinition } from '../../iomTemplateAdmin/types/iomTemplateAdminTypes';
import GenericApiAutocomplete from './GenericApiAutocomplete'; // Import the new component
import { useAuth } from '../../../context/auth/useAuth'; // To pass authenticatedFetch
import { getUserList } from '../../../api/authApi'; // API function for users
import { getAssets } from '../../../api/assetApi'; // API function for assets
import { getAuthGroups } from '../../../api/coreApi'; // API function for groups (placeholder)
import { getDepartmentsForDropdown, getProjectsForDropdown } from '../../../api/procurementApi'; // API functions for departments and projects
import type { User } from '../../../types/UserTypes'; // Type for User options
import type { Asset } from '../../assets/types/assetTypes'; // Type for Asset options
import type { AuthGroup } from '../../../api/coreApi'; // Type for Group options
import type { Department, Project } from '../../procurement/types/procurementTypes'; // Types for Department & Project options
import type { PaginatedResponse } from './GenericApiAutocomplete'; // Import PaginatedResponse if needed by fetch wrapper

export type FormFieldValue = string | number | boolean | (string | number)[] | null | undefined;

interface DynamicFormFieldProps {
  field: FieldDefinition;
  value: FormFieldValue;
  onChange: (fieldName: string, value: FormFieldValue) => void;
  disabled?: boolean;
  error?: string | null;
}

const DynamicIomFormFieldRenderer: React.FC<DynamicFormFieldProps> = ({
  field,
  value,
  onChange,
  disabled = false,
  error = null,
}) => {
  const { authenticatedFetch } = useAuth(); // Get authenticatedFetch from context

  const commonProps = {
    name: field.name,
    label: field.label,
    required: field.required,
    fullWidth: true,
    disabled: disabled || field.readonly,
    helperText: error || field.helpText,
    error: Boolean(error),
    InputLabelProps: { shrink: true },
  };

  const handleDateChange = (date: Date | null) => {
    onChange(field.name, date ? date.toISOString() : null);
  };

  const handleDateTimeChange = (dateTime: Date | null) => {
    onChange(field.name, dateTime ? dateTime.toISOString() : null);
  };

  switch (field.type) {
    case 'text_short':
      return (
        <TextField
          {...commonProps}
          type="text"
          value={(value as string) || (field.defaultValue as string) || ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.name, e.target.value)}
          inputProps={field.attributes}
        />
      );
    case 'text_area': {
      return (
        <TextField
          {...commonProps}
          type="text"
          multiline
          rows={field.attributes && typeof field.attributes.rows === 'number' ? field.attributes.rows : 4}
          value={(value as string) || (field.defaultValue as string) || ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.name, e.target.value)}
          inputProps={field.attributes}
        />
      );
    }
    case 'number':
      return (
        <TextField
          {...commonProps}
          type="number"
          value={value === null || value === undefined ? '' : value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.name, e.target.value === '' ? null : parseFloat(e.target.value))}
          inputProps={field.attributes}
        />
      );
    case 'date': {
      return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label={field.label}
            value={(value && (typeof value === 'string' || typeof value === 'number')) ? new Date(value) : (field.defaultValue && (typeof field.defaultValue === 'string' || typeof field.defaultValue === 'number') ? new Date(field.defaultValue) : null)}
            onChange={handleDateChange}
            disabled={disabled || field.readonly}
            slotProps={{
                textField: {
                    fullWidth: true,
                    required: field.required,
                    helperText: error || field.helpText,
                    error: Boolean(error),
                    InputLabelProps: { shrink: true }
                }
            }}
          />
        </LocalizationProvider>
      );
    }
    case 'datetime': {
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
              label={field.label}
              value={(value && (typeof value === 'string' || typeof value === 'number')) ? new Date(value) : (field.defaultValue && (typeof field.defaultValue === 'string' || typeof field.defaultValue === 'number') ? new Date(field.defaultValue) : null)}
              onChange={handleDateTimeChange}
              disabled={disabled || field.readonly}
              slotProps={{
                  textField: {
                      fullWidth: true,
                      required: field.required,
                      helperText: error || field.helpText,
                      error: Boolean(error),
                      InputLabelProps: { shrink: true }
                  }
              }}
            />
          </LocalizationProvider>
        );
      }
    case 'boolean':
      return (
        <FormControlLabel
          control={
            <Checkbox
              checked={Boolean(value === undefined && field.defaultValue !== undefined ? field.defaultValue : value)}
              onChange={(e) => onChange(field.name, e.target.checked)}
              name={field.name}
              disabled={disabled || field.readonly}
            />
          }
          label={field.label}
        />
      );
    case 'choice_single':
      return (
        <FormControl fullWidth error={Boolean(error)} disabled={disabled || field.readonly}>
          <InputLabel id={`${field.name}-select-label`}>{field.label}{field.required ? ' *' : ''}</InputLabel>
          <Select
            labelId={`${field.name}-select-label`}
            name={field.name}
            value={ (typeof value === 'string' || typeof value === 'number') ? value : (typeof field.defaultValue === 'string' || typeof field.defaultValue === 'number' ? field.defaultValue : '') }
            label={field.label}
            onChange={(e: SelectChangeEvent<string | number>) => onChange(field.name, e.target.value)}
          >
            <MenuItem value=""><em>None</em></MenuItem>
            {field.options?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {(error || field.helpText) && <FormHelperText>{error || field.helpText}</FormHelperText>}
        </FormControl>
      );
    case 'choice_multiple': {
        return (
            <FormControl fullWidth error={Boolean(error)} disabled={disabled || field.readonly}>
              <InputLabel id={`${field.name}-multi-select-label`}>{field.label}{field.required ? ' *' : ''}</InputLabel>
              <Select
                multiple
                labelId={`${field.name}-multi-select-label`}
                name={field.name}
                value={Array.isArray(value) ? value : (field.defaultValue && Array.isArray(field.defaultValue) ? field.defaultValue : [])}
                label={field.label}
                onChange={(e: SelectChangeEvent<(string | number)[]>) => onChange(field.name, e.target.value as (string|number)[])}
                renderValue={(selected) => {
                    if (!Array.isArray(selected) || selected.length === 0) return '';
                    return (selected as (string|number)[]).map(val => field.options?.find(opt => opt.value === val)?.label || val).join(', ');
                }}
              >
                {field.options?.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Checkbox checked={Array.isArray(value) ? (value as (string | number)[]).indexOf(option.value) > -1 : false} />
                    <ListItemText primary={option.label} />
                  </MenuItem>
                ))}
              </Select>
              {(error || field.helpText) && <FormHelperText>{error || field.helpText}</FormHelperText>}
            </FormControl>
          );
        }
    case 'user_selector_single':
    case 'user_selector_multiple': {
      const fetchUsers = async (
        authFetch: typeof authenticatedFetch,
        inputValue?: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _params?: Record<string, string|number> // Not using additional params for users for now
      ): Promise<PaginatedResponse<User> | User[]> => {
        // getUserList expects authenticatedFetch as its first argument.
        // It might need to be adapted if it doesn't fit PaginatedResponse<User> directly or needs search.
        // For now, assuming getUserList is compatible or we adapt its usage.
        // If getUserList returns User[], wrap it or adjust GenericApiAutocomplete.
        // Let's assume getUserList itself handles pagination and search if necessary,
        // or we simplify for now and fetch all and let Autocomplete filter client-side.
        // The `getUserList` in `authApi.ts` returns `Promise<User[]>` after extracting `results`.
        // So, we directly return that.
        const users = await getUserList(authFetch, { search: inputValue, page_size: 20 }); // Example: pass inputValue as search
        return users; // This is User[]
      };

      return (
        <GenericApiAutocomplete<User>
          label={field.label}
          value={value as number | number[] | null}
          onChange={(newValue) => onChange(field.name, newValue)}
          fetchOptionsApi={fetchUsers}
          optionValueField="id"
          optionLabelField={(option: User) => `${option.first_name} ${option.last_name} (${option.username})`}
          multiple={field.type === 'user_selector_multiple'}
          required={field.required}
          disabled={disabled || field.readonly}
          readOnly={field.readonly}
          placeholder={field.placeholder || (field.type.includes('multiple') ? 'Select users' : 'Select user')}
          helperText={error || field.helpText}
          error={Boolean(error)}
          authenticatedFetch={authenticatedFetch}
        />
      );
    }
    case 'asset_selector_single':
    case 'asset_selector_multiple': {
      const fetchAssets = async (
        authFetch: typeof authenticatedFetch,
        inputValue?: string,
        apiParams?: Record<string, string|number>
      ): Promise<PaginatedResponse<Asset> | Asset[]> => {
        const params: import('../../assets/types/assetTypes').GetAssetsParams = {
            filters: { search: inputValue || '' }, // Use search filter
            pageSize: apiParams?.pageSize as number || 20,
            // Add other necessary params like page if GenericApiAutocomplete handles pagination internally
        };
        const response = await getAssets(authFetch, params);
        return response; // This is PaginatedResponse<Asset>
      };

      return (
        <GenericApiAutocomplete<Asset>
          label={field.label}
          value={value as number | number[] | null}
          onChange={(newValue) => onChange(field.name, newValue)}
          fetchOptionsApi={fetchAssets}
          optionValueField="id"
          optionLabelField={(option: Asset) => `${option.asset_tag} - ${option.name}`}
          multiple={field.type === 'asset_selector_multiple'}
          required={field.required}
          disabled={disabled || field.readonly}
          readOnly={field.readonly}
          placeholder={field.placeholder || (field.type.includes('multiple') ? 'Select assets' : 'Select asset')}
          helperText={error || field.helpText}
          error={Boolean(error)}
          authenticatedFetch={authenticatedFetch}
        />
      );
    }
    case 'group_selector_single':
    case 'group_selector_multiple': {
      // Using the placeholder getAuthGroups from coreApi.ts
      // This will show an empty list until the backend API is implemented.
      const fetchGroups = async (
        authFetch: typeof authenticatedFetch,
        inputValue?: string,
        apiParams?: Record<string, string|number>
      ): Promise<PaginatedResponse<AuthGroup> | AuthGroup[]> => {
        const response = await getAuthGroups(authFetch, inputValue, apiParams);
        return response; // getAuthGroups currently returns PaginatedGroupResponse or AuthGroup[]
      };

      return (
        <GenericApiAutocomplete<AuthGroup>
          label={field.label}
          value={value as number | number[] | null}
          onChange={(newValue) => onChange(field.name, newValue)}
          fetchOptionsApi={fetchGroups}
          optionValueField="id"
          optionLabelField="name" // AuthGroup has 'name' field
          multiple={field.type === 'group_selector_multiple'}
          required={field.required}
          disabled={disabled || field.readonly}
          readOnly={field.readonly}
          placeholder={field.placeholder || (field.type.includes('multiple') ? 'Select groups' : 'Select group')}
          helperText={error || field.helpText || "Group selector (requires backend API for actual data)"}
          error={Boolean(error)}
          authenticatedFetch={authenticatedFetch}
        />
      );
    }
    case 'department_selector': {
      const fetchDepartments = async (
        authFetch: typeof authenticatedFetch,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        inputValue?: string, // Departments list is usually not searched via free text for now
        apiParams?: Record<string, string|number>
      ): Promise<PaginatedResponse<Department> | Department[]> => {
        // getDepartmentsForDropdown returns PaginatedResponse<Department>
        // No specific search input for now, fetches all (up to page_size in API)
        const response = await getDepartmentsForDropdown(authFetch /*, { pageSize: apiParams?.pageSize as number || 200 } */); // pageSize is hardcoded in API
        return response;
      };

      return (
        <GenericApiAutocomplete<Department>
          label={field.label}
          value={value as number | null} // Assuming single select for department
          onChange={(newValue) => onChange(field.name, newValue)}
          fetchOptionsApi={fetchDepartments}
          optionValueField="id"
          optionLabelField={(option: Department) => `${option.name} ${option.department_code ? `(${option.department_code})` : ''}`}
          multiple={false} // Department selector is single
          required={field.required}
          disabled={disabled || field.readonly}
          readOnly={field.readonly}
          placeholder={field.placeholder || 'Select department'}
          helperText={error || field.helpText}
          error={Boolean(error)}
          authenticatedFetch={authenticatedFetch}
          // No server-side search for departments yet, Autocomplete will filter client-side
        />
      );
    }
    case 'project_selector': {
      const fetchProjects = async (
        authFetch: typeof authenticatedFetch,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        inputValue?: string, // Projects list is usually not searched via free text for now
        apiParams?: Record<string, string|number>
      ): Promise<PaginatedResponse<Project> | Project[]> => {
        // getProjectsForDropdown returns PaginatedResponse<Project>
        const response = await getProjectsForDropdown(authFetch /*, { pageSize: apiParams?.pageSize as number || 200 } */); // pageSize is hardcoded in API
        return response;
      };

      return (
        <GenericApiAutocomplete<Project>
          label={field.label}
          value={value as number | null} // Assuming single select for project
          onChange={(newValue) => onChange(field.name, newValue)}
          fetchOptionsApi={fetchProjects}
          optionValueField="id"
          optionLabelField={(option: Project) => `${option.name} ${option.project_code ? `(${option.project_code})` : ''}`}
          multiple={false} // Project selector is single
          required={field.required}
          disabled={disabled || field.readonly}
          readOnly={field.readonly}
          placeholder={field.placeholder || 'Select project'}
          helperText={error || field.helpText}
          error={Boolean(error)}
          authenticatedFetch={authenticatedFetch}
        />
      );
    }
    case 'file_upload': {
        return (
            <TextField
                {...commonProps}
                type="text"
                value={(value as string) || (field.defaultValue as string) || ''}
                placeholder={field.placeholder || "Enter file name or path (actual upload handled by form)"}
                onChange={(e) => onChange(field.name, e.target.value)}
                helperText={error || field.helpText || "File upload field. Actual upload mechanism is part of the main form."}
                InputProps={{
                    endAdornment: <InputAdornment position="end">(File)</InputAdornment>
                }}
            />
        );
      }
    default:
      return (
        <Box sx={{p:1, border: '1px dashed red'}}>
            <Typography color="error">Unsupported field type: {field.type} for field "{field.name}"</Typography>
        </Box>
      );
  }
};

export default DynamicIomFormFieldRenderer;
