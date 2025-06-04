// itsm_frontend/src/pages/DashboardPage.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';

function DashboardPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard Overview
      </Typography>
      <Typography paragraph>
        Welcome to your ITSM Dashboard! This is where you'll see key metrics and an overview of your system.
      </Typography>
    </Box>
  );
}

export default DashboardPage;