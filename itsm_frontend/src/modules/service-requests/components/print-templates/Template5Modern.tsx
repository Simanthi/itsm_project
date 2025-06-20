// itsm_frontend/src/modules/service-requests/components/print-templates/Template5Modern.tsx
import React from 'react';
import { Box, Typography, Grid, Paper, Divider, Chip, Avatar } from '@mui/material';
import { type ServiceRequest } from '../../types/ServiceRequestTypes';
import { formatDate } from '../../../../utils/formatters';
import { CheckCircleOutline, RadioButtonUncheckedOutlined, ErrorOutline, HourglassEmptyOutlined, CancelOutlined } from '@mui/icons-material'; // Icons for status

interface CompanyDetails {
  name: string;
  address: string;
  logoUrl: string;
}

interface TemplateProps {
  request: ServiceRequest;
  companyDetails: CompanyDetails;
}

const Template5Modern: React.FC<TemplateProps> = ({ request, companyDetails }) => {

  const getStatusChip = (status: ServiceRequest['status']) => {
    const statusText = status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    let icon = <RadioButtonUncheckedOutlined />;
    let color: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = 'default';

    switch (status) {
      case 'new': icon = <RadioButtonUncheckedOutlined />; color = 'primary'; break;
      case 'in_progress': icon = <HourglassEmptyOutlined />; color = 'warning'; break;
      case 'resolved': icon = <CheckCircleOutline />; color = 'success'; break;
      case 'closed': icon = <CheckCircleOutline />; color = 'info'; break;
      case 'cancelled': icon = <CancelOutlined />; color = 'error'; break;
      default: icon = <RadioButtonUncheckedOutlined />;
    }
    return <Chip icon={icon} label={statusText} color={color} variant="outlined" size="small" />;
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: '210mm',
        minHeight: '290mm',
        padding: '15mm', // Generous padding
        boxSizing: 'border-box',
        backgroundColor: 'white',
        fontFamily: '"Roboto", "Helvetica Neue", Arial, sans-serif', // Modern sans-serif
        fontSize: '10pt',
        color: '#212121', // Dark grey for text
        lineHeight: 1.7,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          {companyDetails.logoUrl && (
            <img
              src={companyDetails.logoUrl}
              alt={`${companyDetails.name} Logo`}
              style={{ maxHeight: '35px', marginBottom: '10px' }}
            />
          )}
          <Typography variant="h4" component="div" sx={{ fontWeight: 300, letterSpacing: '0.5px' }}>
            {companyDetails.name}
          </Typography>
          <Typography variant="caption" sx={{ color: '#757575', fontSize: '9pt' }}>
            Service Request Dossier
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 500, color: 'primary.main' }}>
            {request.request_id}
          </Typography>
          <Typography variant="body2" sx={{ color: '#424242' }}>
            {formatDate(request.created_at)}
          </Typography>
        </Box>
      </Box>

      {/* Title */}
      <Typography variant="h6" component="h1" sx={{ fontWeight: 500, mb: 1, borderBottom: '1px solid #eeeeee', pb:1 }}>
        {request.title}
      </Typography>

      {/* Meta Info Grid */}
      <Grid container spacing={2.5} sx={{ my: 2 }}>
        <Grid item xs={12} sm={4}>
          <Typography variant="overline" display="block" sx={{ color: '#757575', fontSize:'8pt' }}>Status</Typography>
          {getStatusChip(request.status)}
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography variant="overline" display="block" sx={{ color: '#757575', fontSize:'8pt' }}>Priority</Typography>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>{request.priority?.toUpperCase()}</Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography variant="overline" display="block" sx={{ color: '#757575', fontSize:'8pt' }}>Category</Typography>
          <Typography variant="body1">{request.category?.replace(/\b\w/g, (l) => l.toUpperCase())}</Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography variant="overline" display="block" sx={{ color: '#757575', fontSize:'8pt' }}>Requested By</Typography>
          <Typography variant="body1">{request.requested_by_username}</Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography variant="overline" display="block" sx={{ color: '#757575', fontSize:'8pt' }}>Assigned To</Typography>
          <Typography variant="body1">{request.assigned_to_username || 'Pending Assignment'}</Typography>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Typography variant="overline" display="block" sx={{ color: '#757575', fontSize:'8pt' }}>Last Update</Typography>
          <Typography variant="body1">{formatDate(request.updated_at)}</Typography>
        </Grid>
         {request.catalog_item_name && (
            <Grid item xs={12}>
              <Typography variant="overline" display="block" sx={{ color: '#757575', fontSize:'8pt' }}>Service Catalog Item</Typography>
              <Typography variant="body1">{request.catalog_item_name}</Typography>
            </Grid>
          )}
      </Grid>

      <Divider sx={{ my: 3, borderColor: '#eeeeee' }} />

      {/* Description */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'primary.main', mb: 1 }}>
          Request Description
        </Typography>
        <Paper elevation={0} sx={{ p: 2, backgroundColor: '#fafafa', borderRadius: '4px', whiteSpace: 'pre-wrap', border: '1px solid #f0f0f0' }}>
          <Typography variant="body2" sx={{ color: '#424242' }}>{request.description}</Typography>
        </Paper>
      </Box>

      {/* Resolution Notes */}
      {request.resolution_notes && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'success.main', mb: 1 }}>
            Resolution Provided
          </Typography>
          <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f0fff0', borderRadius: '4px', whiteSpace: 'pre-wrap', border: '1px solid #e0f0e0' }}>
            <Typography variant="body2" sx={{ color: '#2e7d32' }}>{request.resolution_notes}</Typography>
            {request.resolved_at && (
                 <Typography variant="caption" display="block" sx={{ color: '#2e7d32', mt: 1, fontSize: '8pt' }}>
                    Resolved on: {formatDate(request.resolved_at)}
                 </Typography>
            )}
          </Paper>
        </Box>
      )}

      {/* Footer */}
      <Box sx={{ mt: 5, pt: 2, borderTop: '1px solid #eeeeee', textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: '#9e9e9e', fontSize: '8pt' }}>
          {companyDetails.address} | Generated: {new Date().toLocaleString()}
        </Typography>
      </Box>
    </Paper>
  );
};

export default Template5Modern;
