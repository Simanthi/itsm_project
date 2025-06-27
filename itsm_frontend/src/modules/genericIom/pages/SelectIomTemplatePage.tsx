import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import SelectIomTemplateComponent from '../components/SelectIomTemplateComponent'; // Import the actual component

const SelectIomTemplatePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Paper sx={{ p: { xs: 2, md: 4 }, m: { xs: 1, md: 2 } }} elevation={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/ioms')} // Navigate back to IOM list
        >
          Back to IOMs
        </Button>
        <Typography variant="h5" component="h1">
          Create New IOM: Select Template
        </Typography>
      </Box>
      <SelectIomTemplateComponent /> {/* Use the actual component */}
    </Paper>
  );
};

export default SelectIomTemplatePage;
