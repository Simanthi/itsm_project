import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import GenericIomFormComponent from '../components/GenericIomForm'; // Import the actual form component

const GenericIomFormPage: React.FC = () => {
  const { templateId, iomId } = useParams<{ templateId?: string; iomId?: string }>();
  const navigate = useNavigate();
  const location = useLocation(); // Use location to get state

  // Changed from assetContext to parentRecordContext
  const parentRecordContext = location.state?.parentRecordContext;

  const isEditMode = Boolean(iomId);

  let relatedToInfo = '';
  if (parentRecordContext) {
    const modelName = parentRecordContext.contentTypeModel?.replace(/_/g, ' ') || 'Record';
    const capitalizedModelName = modelName.charAt(0).toUpperCase() + modelName.slice(1);
    relatedToInfo = `related to ${capitalizedModelName}: ${parentRecordContext.recordName || parentRecordContext.recordIdentifier || `ID ${parentRecordContext.objectId}`}`;
  }

  const pageTitle = isEditMode
    ? 'Edit Internal Office Memo'
    : `Create New IOM ${templateId ? `(for Template ID: ${templateId})` : ''} ${relatedToInfo}`;

  return (
    <Paper sx={{ p: { xs: 2, md: 4 }, m: { xs: 1, md: 2 } }} elevation={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(isEditMode ? `/ioms/view/${iomId}` : (templateId ? '/ioms/new/select-template' : '/ioms') )}
        >
          {isEditMode ? 'Back to View' : (templateId ? 'Back to Template Selection': 'Back to IOMs')}
        </Button>
        <Typography variant="h5" component="h1" sx={{ flexGrow: 1 }}> {/* Allow title to take space */}
          {pageTitle}
        </Typography>
      </Box>
      {/* Pass parentRecordContext to the form component if it exists */}
      <GenericIomFormComponent parentRecordContext={parentRecordContext} />
    </Paper>
  );
};

export default GenericIomFormPage;
