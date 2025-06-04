// itsm_frontend/src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
//import { Box, Typography } from '@mui/material'; // Also need Box and Typography for placeholders

import theme from './theme';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage'; // This is now your layout component

// --- Import all your new module pages ---
import ServiceRequestsPage from './pages/ServiceRequestsPage';
import DashboardPage from './pages/DashboardPage';
import AssetsPage from './pages/AssetsPage';
import SecurityAccessPage from './pages/SecurityAccessPage';
import IncidentManagementPage from './pages/IncidentManagementPage';
import ChangeManagementPage from './pages/ChangeManagementPage';
import ConfigurationManagementPage from './pages/ConfigurationManagementPage';
import ApprovalWorkflowPage from './pages/ApprovalWorkflowPage';
import ReportsAnalyticsPage from './pages/ReportsAnalyticsPage';

import { useAuth } from './context/AuthContextDefinition'; // <--- Updated import for useAuth

function App() {
  const { isAuthenticated } = useAuth();
  console.log('App.tsx - isAuthenticated from Context:', isAuthenticated);

  // ProtectedRoute component remains the same
  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        {/* Public route for login page */}
        <Route path="/login" element={<LoginPage />} />

        {/* Parent Protected Route for the main layout (HomePage) */}
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>}>
          {/* Nested Routes - these will render inside HomePage's <Outlet /> */}
          <Route index element={<DashboardPage />} /> {/* Default content for '/' */}
          <Route path="service-requests" element={<ServiceRequestsPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="security-access" element={<SecurityAccessPage />} />
          <Route path="incidents" element={<IncidentManagementPage />} />
          <Route path="changes" element={<ChangeManagementPage />} />
          <Route path="configs" element={<ConfigurationManagementPage />} />
          <Route path="workflows" element={<ApprovalWorkflowPage />} />
          <Route path="reports" element={<ReportsAnalyticsPage />} />
        </Route>

        {/* Catch-all for any unmatched routes outside the protected area, redirects to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;