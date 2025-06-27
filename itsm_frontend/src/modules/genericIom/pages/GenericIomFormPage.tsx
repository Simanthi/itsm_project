import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import GenericIomFormComponent from '../components/GenericIomForm'; // Import the actual form component

const GenericIomFormPage: React.FC = () => {
  const { templateId, iomId } = useParams<{ templateId?: string; iomId?: string }>();
  const navigate = useNavigate();
  // const location = useLocation(); // Not needed if form component handles its own data fetching via params

  const isEditMode = Boolean(iomId);
  // The GenericIomFormComponent will fetch template details if needed, so page title can be more generic here
  // or the form component could provide title information via a context or callback if desired.
  const pageTitle = isEditMode
    ? 'Edit Internal Office Memo'
    : 'Create New Internal Office Memo';

  return (
    <Paper sx={{ p: { xs: 2, md: 4 }, m: { xs: 1, md: 2 } }} elevation={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          // Navigate back to IOM list, or to detail view if editing, or to template selection if creating from specific template route
          onClick={() => navigate(isEditMode ? `/ioms/view/${iomId}` : (templateId ? '/ioms/new/select-template' : '/ioms') )}
        >
          {isEditMode ? 'Back to View' : (templateId ? 'Back to Template Selection': 'Back to IOMs')}
        </Button>
        <Typography variant="h5" component="h1">
          {pageTitle}
        </Typography>
      </Box>
      <GenericIomFormComponent /> {/* Render the actual form component */}
      {/* The GenericIomFormComponent uses useParams internally to get templateId or iomId */}
    </Paper>
  );
};

export default GenericIomFormPage;
