// itsm_frontend/src/modules/service-requests/components/print-templates/Template2Compact.tsx
import React from 'react';
import { Box, Typography, Grid, Paper, Divider } from '@mui/material'; // Removed Avatar
import { type ServiceRequest } from '../../types/ServiceRequestTypes';
import { formatDate } from '../../../../utils/formatters';

interface CompanyDetails {
  name: string;
  address: string;
  logoUrl: string;
}

interface TemplateProps {
  request: ServiceRequest;
  companyDetails: CompanyDetails;
}

const Template2Compact: React.FC<TemplateProps> = ({ request, companyDetails }) => {
  const statusDisplay = request.status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <Paper
      elevation={0}
      sx={{
        width: '210mm',
        minHeight: '290mm',
        padding: '8mm',
        boxSizing: 'border-box',
        backgroundColor: 'white',
        fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
        fontSize: '9pt', // Smaller base font size
        color: 'black',
        '& hr': {
            borderColor: '#ddd',
            margin: '12px 0',
        }
      }}
    >
      {/* Header */}
      <Grid container justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Grid item xs={8}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: '600', fontSize: '16pt' }}>{companyDetails.name}</Typography>
          <Typography variant="caption" sx={{ fontSize: '8pt' }}>{companyDetails.address}</Typography>
        </Grid>
        <Grid item xs={4} sx={{ textAlign: 'right' }}>
           {companyDetails.logoUrl && (
            <img
              src={companyDetails.logoUrl}
              alt={`${companyDetails.name} Logo`}
              style={{ maxHeight: '40px', maxWidth: '100px' }}
            />
          )}
        </Grid>
      </Grid>
      <Divider />

      {/* Request ID and Title */}
      <Box sx={{ my: 1.5, textAlign: 'center' }}>
        <Typography variant="h6" component="h2" sx={{ fontSize: '14pt', fontWeight: '600' }}>Service Request: {request.request_id}</Typography>
        <Typography variant="subtitle1" sx={{ fontSize: '11pt', color: '#555' }}>{request.title}</Typography>
      </Box>
      <Divider />

      {/* Core Details Grid */}
      <Grid container spacing={1.5} sx={{ my: 1.5 }}>
        <Grid item xs={6}>
          <Typography variant="caption" display="block" color="textSecondary">Status:</Typography>
          <Typography variant="body1" sx={{ fontWeight: '500', fontSize: '10pt' }}>{statusDisplay}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" display="block" color="textSecondary">Priority:</Typography>
          <Typography variant="body1" sx={{ fontWeight: '500', fontSize: '10pt' }}>{request.priority?.toUpperCase()}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" display="block" color="textSecondary">Category:</Typography>
          <Typography variant="body1" sx={{ fontSize: '10pt' }}>{request.category?.replace(/\b\w/g, (l) => l.toUpperCase())}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" display="block" color="textSecondary">Catalog Item:</Typography>
          <Typography variant="body1" sx={{ fontSize: '10pt' }}>{request.catalog_item_name || 'N/A'}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" display="block" color="textSecondary">Requested By:</Typography>
          <Typography variant="body1" sx={{ fontSize: '10pt' }}>{request.requested_by_username}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" display="block" color="textSecondary">Assigned To:</Typography>
          <Typography variant="body1" sx={{ fontSize: '10pt' }}>{request.assigned_to_username || 'Unassigned'}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" display="block" color="textSecondary">Created At:</Typography>
          <Typography variant="body1" sx={{ fontSize: '10pt' }}>{formatDate(request.created_at)}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" display="block" color="textSecondary">Last Updated:</Typography>
          <Typography variant="body1" sx={{ fontSize: '10pt' }}>{formatDate(request.updated_at)}</Typography>
        </Grid>
         {request.resolved_at && (
            <Grid item xs={12}>
              <Typography variant="caption" display="block" color="textSecondary">Resolved At:</Typography>
              <Typography variant="body1" sx={{ fontSize: '10pt' }}>{formatDate(request.resolved_at)}</Typography>
            </Grid>
          )}
      </Grid>
      <Divider />

      {/* Description (Brief) */}
      <Box sx={{ my: 1.5 }}>
        <Typography variant="caption" display="block" color="textSecondary" sx={{mb: 0.5}}>Description Summary:</Typography>
        <Typography variant="body2" sx={{
            fontSize: '9pt',
            whiteSpace: 'pre-wrap',
            maxHeight: '100px', // Limit height
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            border: '1px solid #eee',
            p: 1,
            borderRadius: '4px',
            backgroundColor: '#fcfcfc'
        }}>
          {request.description}
        </Typography>
      </Box>

      {/* Resolution Notes (Brief) */}
      {request.resolution_notes && (
        <>
        <Divider />
        <Box sx={{ my: 1.5 }}>
          <Typography variant="caption" display="block" color="textSecondary" sx={{mb: 0.5}}>Resolution Summary:</Typography>
          <Typography variant="body2" sx={{
            fontSize: '9pt',
            whiteSpace: 'pre-wrap',
            maxHeight: '80px', // Limit height
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            border: '1px solid #eee',
            p: 1,
            borderRadius: '4px',
            backgroundColor: '#fcfcfc'
            }}>
            {request.resolution_notes}
          </Typography>
        </Box>
        </>
      )}

      {/* Footer */}
      <Box sx={{ mt: 3, pt: 1, borderTop: '1px dashed #ccc', textAlign: 'right' }}>
        <Typography variant="caption" sx={{ fontStyle: 'italic', fontSize: '7pt' }}>
          Printed: {new Date().toLocaleString()}
        </Typography>
      </Box>
    </Paper>
  );
};

export default Template2Compact;
