// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline } from '@mui/material';

// --- Context Imports (Confirmed Paths) ---
import { AuthProvider } from './context/AuthContext'; // Assuming AuthContext.tsx is directly in src/context/
import { ThemeContextProvider } from './context/ThemeContext/ThemeContextProvider'; // Corrected path for ThemeContextProvider

// --- Page Imports (Confirmed Paths) ---
// LoginPage is in modules/auth
import LoginPage from './modules/auth/LoginPage';
// HomePage and NotFoundPage are in pages/
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';

// --- Module-based Page Imports (Confirmed Paths) ---
import DashboardPage from './modules/dashboard/DashboardPage';
import ServiceRequestsPage from './modules/service-requests/ServiceRequestsPage';
import AssetsPage from './modules/assets/AssetsPage';
import SecurityAccessPage from './modules/security-access/SecurityAccessPage';
import IncidentManagementPage from './modules/incidents/IncidentManagementPage';
import ChangeManagementPage from './modules/changes/ChangeManagementPage';
import ConfigurationManagementPage from './modules/configs/ConfigurationManagementPage';
import ApprovalWorkflowPage from './modules/workflows/ApprovalWorkflowPage';
import ReportsAnalyticsPage from './modules/reports/ReportsAnalyticsPage';

// Note: useThemeContext is not directly used in AppContent, so it's not imported here.
// It's used by HomePage and other components that explicitly call it.

function AppContent() {
  // Removed the unused destructuring of mode and toggleColorMode,
  // as it caused a 'destructured elements are unused' warning.
  // The theme context is still provided by ThemeContextProvider for children to use.

  return (
    <>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* HomePage acts as the layout component for the main application routes */}
        <Route path="/" element={<HomePage />}>
          {/* Nested routes for module-specific pages */}
          <Route index element={<DashboardPage />} />
          <Route path="service-requests" element={<ServiceRequestsPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="security-access" element={<SecurityAccessPage />} />
          <Route path="incidents" element={<IncidentManagementPage />} /> {/* Corrected JSX here */}
          <Route path="changes" element={<ChangeManagementPage />} />
          <Route path="configs" element={<ConfigurationManagementPage />} />
          <Route path="workflows" element={<ApprovalWorkflowPage />} />
          <Route path="reports" element={<ReportsAnalyticsPage />} />
        </Route>
        {/* Catch-all route for any undefined paths, directing to NotFoundPage */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeContextProvider> {/* Provides theme context to all children */}
          <AppContent />
        </ThemeContextProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;