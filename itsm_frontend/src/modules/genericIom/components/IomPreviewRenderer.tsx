import React from 'react';
import { Box, Typography, Paper, Grid, Chip, Divider, Alert } from '@mui/material'; // Added Alert
import type { IOMTemplate, FieldDefinition } from '../../iomTemplateAdmin/types/iomTemplateAdminTypes';
import type { IomDataPayload } from '../types/genericIomTypes';
import type { FormFieldValue } from './DynamicIomFormFieldRenderer'; // For DisplayDynamicFieldValue's value type

interface IomPreviewRendererProps {
  iomTemplate: IOMTemplate;
  dataPayload: IomDataPayload;
  subject: string;
  // For simplicity in preview, we might pass the raw strings of IDs
  // or pre-fetched display names if available from the form state.
  toUsersStr?: string;
  toGroupsStr?: string;
  parentRecordDisplay?: string | null;
  // If we have richer recipient details available from form state (e.g. after selection in Autocomplete)
  // toUsersDetails?: Array<{ id: number; username?: string; name?: string }>;
  // toGroupsDetails?: Array<{ id: number; name: string }>;
}

// Helper to display dynamic field values appropriately for PREVIEW
// This can be simpler than the one in GenericIomDetailComponent as it doesn't handle live API data for display
const PreviewDisplayDynamicFieldValue: React.FC<{field: FieldDefinition, value: FormFieldValue}> = ({ field, value }) => {
    if (value === null || value === undefined || String(value).trim() === '') {
        return <Typography variant="body2" color="text.secondary"><em>Not provided</em></Typography>;
    }
    if (field.type === 'boolean') {
        return <Chip label={value ? 'Yes' : 'No'} size="small" variant="outlined" />;
    }
    if ((field.type === 'date' || field.type === 'datetime') && typeof value === 'string') {
        try {
            const dateObj = new Date(value);
            if (isNaN(dateObj.getTime())) { // Invalid date string
                 return <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'error.main' }}><em>Invalid Date Value</em></Typography>;
            }
            return <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap'}}>
                {field.type === 'date' ? dateObj.toLocaleDateString() : dateObj.toLocaleString()}
            </Typography>;
        } catch (_e) { // Marked as unused
            return <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: 'error.main' }}><em>Invalid Date Value</em></Typography>;
        }
    }
    if (Array.isArray(value)) {
        // For multi-selects, value is likely an array of IDs or simple strings/numbers
        return <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap'}}>{value.join(', ')}</Typography>;
    }
    // For selector types (user_selector_single, asset_selector_single etc.),
    // 'value' will be the ID. Displaying the ID is acceptable for preview if names aren't readily available.
    // A more advanced preview could try to use cached names from Autocomplete if available.
    return <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap'}}>{String(value)}</Typography>;
};


const IomPreviewRenderer: React.FC<IomPreviewRendererProps> = ({
  iomTemplate,
  dataPayload,
  subject,
  toUsersStr,
  toGroupsStr,
  parentRecordDisplay,
}) => {
  if (!iomTemplate) {
    return <Alert severity="error">IOM Template data is missing for preview.</Alert>;
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mt: 2, borderColor: 'primary.main' }}>
      <Typography variant="h6" gutterBottom sx={{ borderBottom: 1, borderColor: 'divider', pb:1, mb:2 }}>
        Preview: {iomTemplate.name}
      </Typography>

      <Grid container spacing={2}>
        {/* Basic IOM Info */}
        <Grid item xs={12} md={8}>
          <Typography variant="h5" component="h2" gutterBottom>
            Subject: {subject || <em>(Subject not yet entered)</em>}
          </Typography>
        </Grid>
        <Grid item xs={12} md={4} sx={{textAlign: {xs: 'left', md: 'right'}}}>
            <Chip label="Status: Draft (Preview)" variant="outlined" color="info" size="small" />
        </Grid>


        {(toUsersStr || toGroupsStr || parentRecordDisplay) && (
            <Grid item xs={12}>
                {parentRecordDisplay && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Related To:</strong> {parentRecordDisplay}
                    </Typography>
                )}
                {toUsersStr && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>To Users (IDs):</strong> {toUsersStr}
                    </Typography>
                )}
                {toGroupsStr && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>To Groups (IDs):</strong> {toGroupsStr}
                    </Typography>
                )}
                 <Divider sx={{my:1}}/>
            </Grid>
        )}

        {/* Dynamic Fields from dataPayload */}
        <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
                Details:
            </Typography>
            <Grid container spacing={1.5}>
                {iomTemplate.fields_definition.map((fieldDef) => (
                <Grid item xs={12} md={fieldDef.type === 'text_area' ? 12 : 6} key={fieldDef.name}>
                    <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}>
                        {fieldDef.label}:
                    </Typography>
                    <PreviewDisplayDynamicFieldValue field={fieldDef} value={dataPayload[fieldDef.name]} />
                    </Box>
                </Grid>
                ))}
                {Object.keys(dataPayload).length === 0 && !iomTemplate.fields_definition.some(fd => Object.hasOwn(dataPayload, fd.name)) && (
                    <Grid item xs={12}><Typography variant="body2" color="text.secondary"><em>No details entered yet.</em></Typography></Grid>
                )}
            </Grid>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default IomPreviewRenderer;
