import React from 'react';
import { Box, Typography, Paper, Button, CircularProgress, Alert } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit'; // Keep EditIcon if needed for a page-level button
import { Link as RouterLink } from 'react-router-dom'; // For Edit button link

import GenericIomDetailComponent from '../components/GenericIomDetailComponent'; // Import the actual component

const GenericIomDetailPage: React.FC = () => {
  const { iomId } = useParams<{ iomId?: string }>();
  const navigate = useNavigate();

  // The GenericIomDetailComponent will handle its own data fetching, loading, and error states.
  // This page component primarily provides the overall page structure and title.

  if (!iomId) {
    return (
      <Paper sx={{ p: { xs: 2, md: 4 }, m: { xs: 1, md: 2 } }} elevation={3}>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/ioms')}>
          Back to IOMs
        </Button>
        <Alert severity="error" sx={{ mt: 2 }}>Invalid IOM ID provided.</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: { xs: 2, md: 4 }, m: { xs: 1, md: 2 } }} elevation={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/ioms')}>
            Back to IOMs
          </Button>
          {/* Title can be dynamic based on fetched IOM data, or more generic here */}
          <Typography variant="h5" component="h1">
            IOM Details
          </Typography>
        </Box>
        {/* Edit button can live here, or within the DetailComponent based on permissions fetched with IOM */}
        <Button
            variant="contained"
            color="primary"
            component={RouterLink}
            to={`/ioms/edit/${iomId}`}
            startIcon={<EditIcon />}
            // Add logic here or in DetailComponent to disable if not editable by current user
        >
            Edit IOM
        </Button>
      </Box>

      <GenericIomDetailComponent iomId={parseInt(iomId, 10)} />

    </Paper>
  );
};

export default GenericIomDetailPage;
