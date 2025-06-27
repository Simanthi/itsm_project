import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';

import GenericIomListComponent from '../components/GenericIomList'; // Import the actual list component

const GenericIomListPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Internal Office Memos (IOMs)
        </Typography>
        <Button
          variant="contained"
          component={RouterLink}
          to="/ioms/new/select-template" // Route to select a template first
          startIcon={<AddIcon />}
        >
          Create New IOM
        </Button>
      </Box>
      <GenericIomListComponent /> {/* Use the actual list component */}
    </Box>
  );
};

export default GenericIomListPage;
