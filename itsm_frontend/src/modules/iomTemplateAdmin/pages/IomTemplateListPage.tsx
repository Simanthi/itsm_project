import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom'; // Assuming react-router-dom is used
import AddIcon from '@mui/icons-material/Add';

import IomTemplateListComponent from '../components/IomTemplateList'; // Import the list component

const IomTemplateListPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          IOM Template Management
        </Typography>
        <Button
          variant="contained"
          component={RouterLink}
          to="/admin/iom-templates/new"
          startIcon={<AddIcon />}
        >
          Create New Template
        </Button>
      </Box>
      <IomTemplateListComponent /> {/* Use the actual list component */}
    </Box>
  );
};

export default IomTemplateListPage;
