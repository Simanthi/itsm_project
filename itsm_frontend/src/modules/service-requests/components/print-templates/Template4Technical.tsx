// itsm_frontend/src/modules/service-requests/components/print-templates/Template4Technical.tsx
import React from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material'; // Removed Divider, Avatar
import { type ServiceRequest } from '../../types/ServiceRequestTypes';
import { formatDate } from '../../../../utils/formatters'; // Ensure this path is correct

interface CompanyDetails {
  name: string;
  address: string;
  logoUrl: string;
}

interface TemplateProps {
  request: ServiceRequest;
  companyDetails: CompanyDetails;
}

const Template4Technical: React.FC<TemplateProps> = ({ request, companyDetails }) => {
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
        fontFamily: 'Consolas, "Courier New", monospace', // Monospace for technical feel
        fontSize: '9.5pt',
        color: 'black',
        '& .section-title': {
            fontWeight: 'bold',
            fontSize: '11pt',
            marginTop: '16px',
            marginBottom: '8px',
            borderBottom: '1px solid #555',
            paddingBottom: '4px',
            color: '#222',
        },
        '& .field-label': {
            fontWeight: '600',
            color: '#444',
            minWidth: '120px',
            display: 'inline-block',
        },
        '& .field-value': {
            fontFamily: 'Consolas, "Courier New", monospace', // Ensure values also use mono
        }
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pb:1, borderBottom: '2px solid black' }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', fontSize: '18pt' }}>{companyDetails.name} - IT Support</Typography>
          <Typography variant="caption" sx={{ fontSize: '8pt' }}>Technical Service Record</Typography>
        </Box>
         {companyDetails.logoUrl && (
            <img
              src={companyDetails.logoUrl}
              alt="Logo"
              style={{ maxHeight: '45px' }}
            />
          )}
      </Box>

      <Typography variant="h6" component="h2" sx={{ fontSize: '14pt', fontWeight: 'bold', mb: 2, textAlign: 'center' }}>
        Service Request ID: {request.request_id}
      </Typography>

      {/* Core Identification */}
      <Typography className="section-title">Identification & Categorization</Typography>
      <Grid container spacing={1}>
        <Grid item xs={12}><Typography><span className="field-label">Title:</span> <span className="field-value">{request.title}</span></Typography></Grid>
        <Grid item xs={6}><Typography><span className="field-label">Status:</span> <span className="field-value">{statusDisplay}</span></Typography></Grid>
        <Grid item xs={6}><Typography><span className="field-label">Priority:</span> <span className="field-value">{request.priority?.toUpperCase()}</span></Typography></Grid>
        <Grid item xs={6}><Typography><span className="field-label">Category:</span> <span className="field-value">{request.category?.replace(/\b\w/g, (l) => l.toUpperCase())}</span></Typography></Grid>
        <Grid item xs={6}><Typography><span className="field-label">Catalog Item ID:</span> <span className="field-value">{request.catalog_item_id || 'N/A'}</span></Typography></Grid>
        <Grid item xs={12}><Typography><span className="field-label">Catalog Item Name:</span> <span className="field-value">{request.catalog_item_name || 'N/A'}</span></Typography></Grid>
      </Grid>

      {/* User and Assignment Details */}
      <Typography className="section-title">User & Assignment</Typography>
      <Grid container spacing={1}>
        <Grid item xs={6}><Typography><span className="field-label">Requested By (User):</span> <span className="field-value">{request.requested_by_username}</span></Typography></Grid>
        <Grid item xs={6}><Typography><span className="field-label">User ID:</span> <span className="field-value">{request.requested_by_id}</span></Typography></Grid>
        <Grid item xs={6}><Typography><span className="field-label">Assigned To (Tech):</span> <span className="field-value">{request.assigned_to_username || 'UNASSIGNED'}</span></Typography></Grid>
        <Grid item xs={6}><Typography><span className="field-label">Tech ID:</span> <span className="field-value">{request.assigned_to_id || 'N/A'}</span></Typography></Grid>
      </Grid>

      {/* Timestamps */}
      <Typography className="section-title">Timestamps (UTC)</Typography>
      <Grid container spacing={1}>
        <Grid item xs={6}><Typography><span className="field-label">Created At:</span> <span className="field-value">{request.created_at}</span></Typography></Grid>
        <Grid item xs={6}><Typography><span className="field-label"> (Formatted):</span> <span className="field-value">{formatDate(request.created_at)}</span></Typography></Grid>
        <Grid item xs={6}><Typography><span className="field-label">Updated At:</span> <span className="field-value">{request.updated_at}</span></Typography></Grid>
        <Grid item xs={6}><Typography><span className="field-label"> (Formatted):</span> <span className="field-value">{formatDate(request.updated_at)}</span></Typography></Grid>
        {request.resolved_at && (
          <>
          <Grid item xs={6}><Typography><span className="field-label">Resolved At:</span> <span className="field-value">{request.resolved_at}</span></Typography></Grid>
          <Grid item xs={6}><Typography><span className="field-label"> (Formatted):</span> <span className="field-value">{formatDate(request.resolved_at)}</span></Typography></Grid>
          </>
        )}
      </Grid>

      {/* Description */}
      <Typography className="section-title">Reported Issue / Description</Typography>
      <Paper variant="outlined" sx={{ p: 1, my: 1, backgroundColor: '#fdfdfd', border: '1px solid #ccc', whiteSpace: 'pre-wrap', fontFamily: 'Consolas, "Courier New", monospace' }}>
        {request.description}
      </Paper>

      {/* Resolution Notes */}
      {request.resolution_notes && (
        <>
          <Typography className="section-title">Resolution Details & Notes</Typography>
          <Paper variant="outlined" sx={{ p: 1, my: 1, backgroundColor: '#fdfdfd', border: '1px solid #ccc', whiteSpace: 'pre-wrap', fontFamily: 'Consolas, "Courier New", monospace' }}>
            {request.resolution_notes}
          </Paper>
        </>
      )}

      {/* System Info / Placeholder for more technical data */}
      {/*
      <Typography className="section-title">System Information (Placeholder)</Typography>
      <Grid container spacing={1}>
        <Grid item xs={6}><Typography><span className="field-label">Affected CI:</span> <span className="field-value">CI-XYZ-123</span></Typography></Grid>
        <Grid item xs={6}><Typography><span className="field-label">IP Address:</span> <span className="field-value">192.168.1.100</span></Typography></Grid>
      </Grid>
      */}

      {/* Footer */}
      <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #aaa', textAlign: 'right' }}>
        <Typography variant="caption" sx={{ fontSize: '8pt' }}>
          Document Generated: {new Date().toISOString()}
        </Typography>
      </Box>
    </Paper>
  );
};

export default Template4Technical;
