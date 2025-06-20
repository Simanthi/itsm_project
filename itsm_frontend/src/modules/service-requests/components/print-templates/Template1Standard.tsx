// itsm_frontend/src/modules/service-requests/components/print-templates/Template1Standard.tsx
import React from 'react';
import { Box, Typography, Grid, Paper, Divider, Avatar } from '@mui/material';
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

const Template1Standard: React.FC<TemplateProps> = ({ request, companyDetails }) => {
  const statusDisplay = request.status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <Paper
      elevation={0}
      sx={{
        width: '210mm',
        minHeight: '290mm', // Slightly less than 297mm to allow for browser print margins
        padding: '10mm', // Standard print margin
        boxSizing: 'border-box',
        backgroundColor: 'white',
        fontFamily: 'Arial, sans-serif', // Common font for printing
        color: 'black',
        '& table': {
            width: '100%',
            borderCollapse: 'collapse',
        },
        '& th, & td': {
            border: '1px solid #ccc',
            padding: '8px',
            textAlign: 'left',
            fontSize: '10pt',
        },
        '& th': {
            backgroundColor: '#f2f2f2',
            fontWeight: 'bold',
        },
        '& h1, & h2, & h3, & h4, & h5, & h6': {
            marginTop: '0.5em',
            marginBottom: '0.5em',
            color: 'black',
        }
      }}
    >
      {/* Header */}
      <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Grid item xs={2}>
          {companyDetails.logoUrl && (
            <Avatar
              src={companyDetails.logoUrl}
              alt={`${companyDetails.name} Logo`}
              variant="square"
              sx={{ width: 80, height: 80, mr: 2 }}
            />
          )}
        </Grid>
        <Grid item xs={7}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>{companyDetails.name}</Typography>
          <Typography variant="body2" sx={{ fontSize: '10pt'}}>{companyDetails.address}</Typography>
        </Grid>
        <Grid item xs={3} sx={{ textAlign: 'right' }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>Service Request</Typography>
          <Typography variant="body1" sx={{ fontSize: '12pt', fontWeight: 'bold' }}>{request.request_id}</Typography>
        </Grid>
      </Grid>
      <Divider sx={{ my: 2, borderColor: 'black' }} />

      {/* Request Title and Status */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" component="h3" sx={{ textDecoration: 'underline' }}>{request.title}</Typography>
      </Box>

      {/* Main Details Table */}
      <table>
        <tbody>
          <tr>
            <th>Status</th>
            <td>{statusDisplay}</td>
            <th>Priority</th>
            <td>{request.priority?.toUpperCase()}</td>
          </tr>
          <tr>
            <th>Category</th>
            <td>{request.category?.replace(/\b\w/g, (l) => l.toUpperCase())}</td>
            <th>Catalog Item</th>
            <td>{request.catalog_item_name || 'N/A'}</td>
          </tr>
          <tr>
            <th>Requested By</th>
            <td>{request.requested_by_username}</td>
            <th>Assigned To</th>
            <td>{request.assigned_to_username || 'Unassigned'}</td>
          </tr>
          <tr>
            <th>Created At</th>
            <td>{formatDate(request.created_at)}</td>
            <th>Last Updated</th>
            <td>{formatDate(request.updated_at)}</td>
          </tr>
          {request.resolved_at && (
            <tr>
              <th>Resolved At</th>
              <td colSpan={3}>{formatDate(request.resolved_at)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Description */}
      <Box sx={{ my: 3 }}>
        <Typography variant="h6" component="h4" sx={{ fontWeight: 'bold', fontSize: '11pt', mb:1 }}>Description:</Typography>
        <Paper variant="outlined" sx={{ p: 1.5, backgroundColor: '#f9f9f9', fontSize: '10pt', whiteSpace: 'pre-wrap', border: '1px solid #ddd' }}>
          {request.description}
        </Paper>
      </Box>

      {/* Resolution Notes */}
      {request.resolution_notes && (
        <Box sx={{ my: 3 }}>
          <Typography variant="h6" component="h4" sx={{ fontWeight: 'bold', fontSize: '11pt', mb:1 }}>Resolution Notes:</Typography>
          <Paper variant="outlined" sx={{ p: 1.5, backgroundColor: '#f0f4f8', fontSize: '10pt', whiteSpace: 'pre-wrap', border: '1px solid #ddd' }}>
            {request.resolution_notes}
          </Paper>
        </Box>
      )}

      {/* Footer - Optional */}
      <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #ccc', textAlign: 'center' }}>
        <Typography variant="caption" sx={{ fontSize: '8pt' }}>
          Printed on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
        </Typography>
      </Box>
    </Paper>
  );
};

export default Template1Standard;
