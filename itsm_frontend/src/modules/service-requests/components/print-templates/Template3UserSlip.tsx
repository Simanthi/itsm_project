// itsm_frontend/src/modules/service-requests/components/print-templates/Template3UserSlip.tsx
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

const Template3UserSlip: React.FC<TemplateProps> = ({ request, companyDetails }) => {
  const statusFriendly = (status: string) => {
    switch (status) {
      case 'new': return 'We have received your request.';
      case 'in_progress': return 'We are currently working on your request.';
      case 'pending_approval': return 'Your request is pending approval.';
      case 'resolved': return 'Your request has been resolved.';
      case 'closed': return 'This request is now closed.';
      case 'cancelled': return 'This request has been cancelled.';
      default: return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: '210mm',
        minHeight: '290mm',
        padding: '12mm',
        boxSizing: 'border-box',
        backgroundColor: '#fcfcfc', // Slightly off-white for a softer look
        fontFamily: 'Verdana, Geneva, sans-serif',
        fontSize: '11pt',
        lineHeight: 1.6,
        color: '#333',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: '2px solid #007bff' }}>
        <div>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', color: '#0056b3' }}>{companyDetails.name}</Typography>
          <Typography variant="caption" sx={{ fontSize: '9pt' }}>Service Update</Typography>
        </div>
        {companyDetails.logoUrl && (
          <img
            src={companyDetails.logoUrl}
            alt="Logo"
            style={{ maxHeight: '50px' }}
          />
        )}
      </Box>

      <Typography variant="h6" component="h2" sx={{ mb: 1, color: '#007bff' }}>
        Update for Your Service Request: {request.request_id}
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Dear {request.requested_by_username},
      </Typography>
      <Typography variant="body1" paragraph>
        Here's an update on your service request titled: <strong>"{request.title}"</strong>.
      </Typography>

      {/* Key Information */}
      <Paper elevation={1} sx={{ p: 2, backgroundColor: 'white', borderRadius: '8px', mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Current Status:</Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#007bff' }}>{statusFriendly(request.status)}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Date Submitted:</Typography>
            <Typography variant="body1">{formatDate(request.created_at)}</Typography>
          </Grid>
          {request.assigned_to_username && (
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Our Specialist:</Typography>
              <Typography variant="body1">{request.assigned_to_username}</Typography>
            </Grid>
          )}
          {request.resolved_at && (
             <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>Date Resolved:</Typography>
              <Typography variant="body1">{formatDate(request.resolved_at)}</Typography>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* What you told us */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" component="h3" sx={{ fontSize: '12pt', fontWeight: '600', color: '#0056b3', mb: 1 }}>
          What You Told Us:
        </Typography>
        <Typography variant="body2" sx={{
            fontStyle: 'italic',
            backgroundColor: '#e9ecef',
            p: 1.5,
            borderRadius: '4px',
            whiteSpace: 'pre-wrap'
        }}>
          {request.description}
        </Typography>
      </Box>

      {/* What we did (Resolution) */}
      {request.resolution_notes && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" component="h3" sx={{ fontSize: '12pt', fontWeight: '600', color: '#0056b3', mb: 1 }}>
            Our Resolution:
          </Typography>
          <Typography variant="body2" sx={{
              backgroundColor: '#d4edda', // Light green for positive resolution
              color: '#155724',
              p: 1.5,
              borderRadius: '4px',
              whiteSpace: 'pre-wrap'
          }}>
            {request.resolution_notes}
          </Typography>
        </Box>
      )}

      <Divider sx={{ my: 3 }}/>

      <Typography variant="body2" sx={{ fontSize: '10pt' }}>
        If you have any questions or if this issue is not fully resolved, please contact our support desk.
      </Typography>
      <Typography variant="body2" sx={{ fontSize: '10pt', mt:1 }}>
        Thank you for choosing {companyDetails.name}.
      </Typography>

      {/* Footer */}
      <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid #ccc', textAlign: 'center' }}>
        <Typography variant="caption" sx={{ fontSize: '8pt', color: '#666' }}>
          {companyDetails.name} | {companyDetails.address} <br/>
          Report Generated: {new Date().toLocaleDateString()}
        </Typography>
      </Box>
    </Paper>
  );
};

export default Template3UserSlip;
