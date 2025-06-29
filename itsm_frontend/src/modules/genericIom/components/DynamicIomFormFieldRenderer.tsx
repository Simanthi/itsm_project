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
  ListItemText,
  InputAdornment
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'; // Or your preferred date adapter
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import type { FieldDefinition } from '../../iomTemplateAdmin/types/iomTemplateAdminTypes'; // Assuming FieldDefinition is here

interface DynamicFormFieldProps {
  field: FieldDefinition;
  value: any;
  onChange: (fieldName: string, value: any) => void;
  disabled?: boolean;
  error?: string | null; // For displaying field-specific errors from parent form
}

const DynamicIomFormFieldRenderer: React.FC<DynamicFormFieldProps> = ({
  field,
  value,
  onChange,
  disabled = false,
  error = null,
}) => {
  const commonProps = {
    name: field.name,
    label: field.label,
    required: field.required,
    fullWidth: true,
    disabled: disabled || field.readonly,
    helperText: error || field.helpText,
    error: Boolean(error),
    InputLabelProps: { shrink: true }, // Ensure labels shrink correctly, esp for date/time
  };

  // Handle date/datetime value conversion
  const handleDateChange = (date: Date | null) => {
    onChange(field.name, date ? date.toISOString() : null);
  };

  const handleDateTimeChange = (dateTime: Date | null) => {
    onChange(field.name, dateTime ? dateTime.toISOString() : null);
  };

  // For file inputs, we'd need more complex state management in the parent form
  // For now, file_upload will be a placeholder or a simple text input for filename.

  switch (field.type) {
    case 'text_short':
      return (
        <TextField
          {...commonProps}
          type="text"
          value={value || field.defaultValue || ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.name, e.target.value)}
          inputProps={field.attributes}
        />
      );
    case 'text_area':
      return (
        <TextField
          {...commonProps}
          type="text"
          multiline
          rows={typeof field.attributes?.rows === 'number' ? field.attributes.rows : 4}
          value={value || field.defaultValue || ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.name, e.target.value)}
          inputProps={field.attributes}
        />
      );
    case 'number':
      return (
        <TextField
          {...commonProps}
          type="number"
          value={value === null || value === undefined ? '' : value} // Handle null/undefined for number input
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.name, e.target.value === '' ? null : parseFloat(e.target.value))}
          inputProps={field.attributes} // For min, max, step
        />
      );
    case 'date':
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
    case 'datetime':
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
            value={value || field.defaultValue || ''}
            label={field.label} // Label prop for Select for proper positioning
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
    case 'choice_multiple':
        // MUI Select with multiple attribute or CheckboxGroup
        // This is a simplified version for now, a CheckboxGroup or Autocomplete might be better.
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
                    <Checkbox checked={Array.isArray(value) ? value.indexOf(option.value) > -1 : false} />
                    <ListItemText primary={option.label} />
                  </MenuItem>
                ))}
              </Select>
              {(error || field.helpText) && <FormHelperText>{error || field.helpText}</FormHelperText>}
            </FormControl>
          );

    // Placeholder for selector types - initially simple text inputs for IDs
    case 'user_selector_single':
    case 'user_selector_multiple':
    case 'group_selector_single':
    case 'group_selector_multiple':
    case 'asset_selector_single':
    case 'asset_selector_multiple':
    case 'department_selector': // Assuming single selection for these
    case 'project_selector':
      return (
        <TextField
          {...commonProps}
          type={field.type.includes('multiple') ? 'text' : "number"} // Text for multiple IDs (comma-sep), number for single
          value={value || field.defaultValue || ''}
          placeholder={field.placeholder || (field.type.includes('multiple') ? 'Enter IDs comma-separated' : 'Enter ID')}
          onChange={(e) => onChange(field.name, field.type.includes('multiple') ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : (e.target.value === '' ? null : Number(e.target.value)))}
          helperText={error || field.helpText || `Placeholder for ${field.label}. API source: ${field.api_source?.endpoint || 'N/A'}`}
        />
      );
    case 'file_upload':
        // Basic file input. Real implementation needs state in parent form for the File object.
        // This renderer would just display the input type="file".
        // For now, just a text field to input a filename or path as a string.
        return (
            <TextField
                {...commonProps}
                type="text"
                value={value || field.defaultValue || ''} // Or handle File object if parent supports
                placeholder={field.placeholder || "Enter file name or path (actual upload handled by form)"}
                onChange={(e) => onChange(field.name, e.target.value)}
                helperText={error || field.helpText || "File upload field. Actual upload mechanism is part of the main form."}
                InputProps={{
                    endAdornment: <InputAdornment position="end">(File)</InputAdornment>
                }}
            />
        );

    default:
      return (
        <Box sx={{p:1, border: '1px dashed red'}}>
            <Typography color="error">Unsupported field type: {field.type} for field "{field.name}"</Typography>
        </Box>
      );
  }
};

export default DynamicIomFormFieldRenderer;
