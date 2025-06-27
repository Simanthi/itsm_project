import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import IomTemplateFormComponent from '../components/IomTemplateForm'; // Import the actual form component

const IomTemplateFormPage: React.FC = () => {
  const { templateId } = useParams<{ templateId?: string }>(); // templateId will be string or undefined
  const navigate = useNavigate();
  const isEditMode = Boolean(templateId);

  return (
    <Paper sx={{ p: { xs: 2, md: 4 }, m: { xs: 1, md: 2 } }} elevation={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin/iom-templates')} // Navigate to the list page
        >
          Back to Templates
        </Button>
        <Typography variant="h5" component="h1">
          {isEditMode ? 'Edit IOM Template' : 'Create New IOM Template'}
        </Typography>
      </Box>
      <IomTemplateFormComponent /> {/* Render the actual form component */}
      {/* The form component itself will use useParams to get templateId if needed */}
    </Paper>
  );
};

export default IomTemplateFormPage;
