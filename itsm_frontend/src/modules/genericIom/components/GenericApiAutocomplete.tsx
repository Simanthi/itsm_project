import React, { useState, useEffect, useMemo } from 'react';
import { Autocomplete, TextField, CircularProgress, Chip } from '@mui/material';
import type { AuthenticatedFetch } from '../../../context/auth/AuthContextDefinition'; // Adjust path as needed
import { useDebounce } from '../../../hooks/useDebounce'; // Assuming a debounce hook exists or will be created

// Generic type for API response items
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiOptionType extends Record<string, any> {
  // Ensure id is present, but allow any other fields
  id: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}


interface GenericApiAutocompleteProps<T extends ApiOptionType> {
  label: string;
  value: number | number[] | null; // Selected ID or array of IDs
  onChange: (newValue: number | number[] | null) => void;
  fetchOptionsApi: (
    authenticatedFetch: AuthenticatedFetch,
    inputValue?: string,
    params?: Record<string, string | number> // For additional fixed params like page_size
  ) => Promise<PaginatedResponse<T> | T[]>; // API function can return paginated or direct array
  optionValueField: keyof T | 'id'; // Key for the ID in fetched option objects, defaults to 'id'
  optionLabelField: keyof T | ((option: T) => string); // Key for the display label or a function to derive it

  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  helperText?: string;
  error?: boolean;
  authenticatedFetch: AuthenticatedFetch;

  // For Autocomplete's getOptionLabel, if more complex than just accessing a field
  getOptionLabelOverride?: (option: T) => string;
  // For Autocomplete's isOptionEqualToValue, crucial if `value` prop is an object
  isOptionEqualToValueOverride?: (option: T, value: T) => boolean;

  initialOptions?: T[]; // Allow passing initial options to avoid fetch on mount if data is already available
  fetchDelay?: number; // Debounce delay for fetching options based on input
  additionalApiParams?: Record<string, string | number>; // To pass fixed params like page_size to fetchOptionsApi
}

function GenericApiAutocomplete<T extends ApiOptionType>({
  label,
  value,
  onChange,
  fetchOptionsApi,
  optionValueField = 'id',
  optionLabelField,
  multiple = false,
  required = false,
  disabled = false,
  readOnly = false,
  placeholder,
  helperText,
  error,
  authenticatedFetch,
  getOptionLabelOverride,
  isOptionEqualToValueOverride,
  initialOptions = [],
  fetchDelay = 300,
  additionalApiParams = { pageSize: 20 } // Default page size
}: GenericApiAutocompleteProps<T>) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<readonly T[]>(initialOptions);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const debouncedInputValue = useDebounce(inputValue, fetchDelay);

  const getOptionLabel = (option: T | string): string => {
    if (typeof option === 'string') return option; // For freeSolo or when input is not an option yet
    if (getOptionLabelOverride) return getOptionLabelOverride(option);
    if (typeof optionLabelField === 'function') return optionLabelField(option);
    return String(option[optionLabelField] || '');
  };

  const isOptionEqualToValue = (option: T, val: T): boolean => {
    if (isOptionEqualToValueOverride) return isOptionEqualToValueOverride(option, val);
    return option[optionValueField] === val[optionValueField];
  };

  useEffect(() => {
    let active = true;

    if (!open && initialOptions.length === 0) { // Don't clear options if provided initially and not open
      // setOptions([]); // Clear options when dropdown is closed to re-fetch next time, unless initialOptions were provided
      return undefined;
    }

    // Only fetch if open and (input has changed for server-side search OR options are empty)
    // For server-side search, debouncedInputValue will trigger this.
    // For client-side search on initial open, options.length === 0 will trigger.
    if (!open && !debouncedInputValue && options.length > 0 && initialOptions.length > 0) {
        // If not open, no input, and we have initial options, do nothing.
        return undefined;
    }


    (async () => {
      setLoading(true);
      try {
        // Pass debouncedInputValue for server-side filtering if API supports it
        const response = await fetchOptionsApi(authenticatedFetch, debouncedInputValue, additionalApiParams);
        if (active) {
          const newOptions = Array.isArray(response) ? response : response.results;
          setOptions(newOptions);
        }
      } catch (apiError) {
        console.error(`Failed to fetch options for ${label}:`, apiError);
        // Optionally set an error state to display to the user
        setOptions([]); // Clear options on error
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedInputValue, open, authenticatedFetch, fetchOptionsApi, label, initialOptions.length > 0 ? null : fetchDelay]); // Re-fetch if fetchOptionsApi changes, or if dropdown opens with no initial options.


  // Memoize the selected value(s) in the format Autocomplete expects (full option objects)
  const selectedValueOrValues = useMemo(() => {
    if (multiple) {
      if (!Array.isArray(value)) return [];
      return options.filter(option => (value as number[]).includes(option[optionValueField] as number));
    }
    if (value === null || value === undefined) return null;
    return options.find(option => option[optionValueField] === value) || null;
  }, [value, options, multiple, optionValueField]);

  const handleChange = (_event: React.SyntheticEvent, newValue: T | T[] | null) => {
    if (readOnly) return;
    if (multiple) {
      const newIds = (newValue as T[]).map(option => option[optionValueField] as number);
      onChange(newIds.length > 0 ? newIds : null);
    } else {
      onChange(newValue ? (newValue as T)[optionValueField] as number : null);
    }
  };

  return (
    <Autocomplete<T, typeof multiple, undefined, false> // `false` for freeSolo not enabled by default
      multiple={multiple}
      open={open}
      onOpen={() => {
        if (readOnly || disabled) return;
        setOpen(true);
      }}
      onClose={() => {
        setOpen(false);
      }}
      value={selectedValueOrValues as typeof multiple extends true ? T[] : T | null} // Type assertion
      onChange={handleChange}
      options={options}
      loading={loading}
      isOptionEqualToValue={isOptionEqualToValue}
      getOptionLabel={getOptionLabel}
      onInputChange={(_event, newInputValue) => {
        if (readOnly || disabled) return;
        setInputValue(newInputValue);
      }}
      disabled={disabled || readOnly}
      readOnly={readOnly} // Pass readOnly to Autocomplete
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          placeholder={placeholder}
          helperText={helperText}
          error={error}
          InputProps={{
            ...params.InputProps,
            readOnly: readOnly, // Also apply to TextField's input element
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option, { selected }) => (
        <li {...props}>
          {multiple && <Checkbox checked={selected} style={{ marginRight: 8 }} />}
          {getOptionLabel(option)}
        </li>
      )}
      renderTags={multiple ? (tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip
            label={getOptionLabel(option)}
            {...getTagProps({ index })}
            disabled={disabled || readOnly}
          />
        )) : undefined
      }
      // sx={readOnly ? { backgroundColor: 'action.disabledBackground', pointerEvents: 'none'} : {}}
      // The disabled prop on Autocomplete should handle pointerEvents.
      // TextField's InputProps.readOnly will make the text field non-editable.
    />
  );
}

export default GenericApiAutocomplete;
