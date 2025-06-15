// itsm_frontend/src/modules/procurement/pages/ProcurementDashboardPage.tsx
import React from 'react';
import { Box, Typography, Paper, Grid, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'; // For IOMs
import DescriptionIcon from '@mui/icons-material/Description'; // For POs (generic document icon)
import PaymentsIcon from '@mui/icons-material/Payments'; // For Check Requests

const ProcurementDashboardPage: React.FC = () => {
  return (
    <Box sx={{ p: 3, flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Procurement Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: '100%',
              justifyContent: 'space-between'
            }}
            elevation={3}
          >
            <Box sx={{ textAlign: 'center' }}>
              <ReceiptLongIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />
              <Typography variant="h6" component="h2" gutterBottom>
                Internal Office Memos
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                Manage internal requests for purchases and services. Track approvals and status.
              </Typography>
            </Box>
            <Button
              component={RouterLink}
              to="/procurement/iom"
              variant="contained"
              color="primary"
              fullWidth
            >
              Manage IOMs
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: '100%',
              justifyContent: 'space-between',
              // opacity: 0.6 // Remove opacity, no longer disabled
            }}
            elevation={3}
          >
            <Box sx={{ textAlign: 'center' }}>
              <DescriptionIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} /> {/* Changed color */}
              <Typography variant="h6" component="h2" gutterBottom>
                Purchase Orders
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                Create and manage official purchase orders sent to vendors.
              </Typography>
            </Box>
            <Button
              component={RouterLink}
              to="/procurement/purchase-orders"
              variant="contained"
              color="primary" // Added color
              sx={{ mt: 1 }}
              // disabled // Remove disabled
              fullWidth
            >
              Manage POs
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: '100%',
              justifyContent: 'space-between',
              opacity: 0.6 // Indicate disabled/coming soon
            }}
            elevation={3}
          >
            <Box sx={{ textAlign: 'center' }}>
              <PaymentsIcon sx={{ fontSize: 40, mb: 1, color: 'text.secondary' }} />
              <Typography variant="h6" component="h2" gutterBottom>
                Check Requests
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                Process and track requests for payments and checks.
              </Typography>
            </Box>
            <Button
              variant="contained"
              sx={{ mt: 1 }}
              disabled
              fullWidth
            >
              Manage CRs (Coming Soon)
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProcurementDashboardPage;
