// src/App.tsx

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline } from '@mui/material';

// --- Context Imports (Confirmed Paths) ---
import { AuthProvider } from './context/AuthContext';
import { ThemeContextProvider } from './context/ThemeContext/ThemeContextProvider';
import { ServiceRequestProvider } from './modules/service-requests/context/ServiceRequestProvider';
// --- Page Imports (Confirmed Paths) ---
import LoginPage from './modules/auth/LoginPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';

// --- Module-based Page Imports (Confirmed Paths) ---
import DashboardPage from './modules/dashboard/DashboardPage';
import ServiceRequestsPage from './modules/service-requests/pages/ServiceRequestsPage';
// NEW: Import NewServiceRequestPage
import NewServiceRequestPage from './modules/service-requests/pages/NewServiceRequestPage'; // <--- ADD THIS LINE

import AssetsPage from './modules/assets/AssetsPage';
import SecurityAccessPage from './modules/security-access/SecurityAccessPage';
import IncidentManagementPage from './modules/incidents/IncidentManagementPage';
import ChangeManagementPage from './modules/changes/ChangeManagementPage';
import ConfigurationManagementPage from './modules/configs/ConfigurationManagementPage';
import ApprovalWorkflowPage from './modules/workflows/ApprovalWorkflowPage';
import ReportsAnalyticsPage from './modules/reports/ReportsAnalyticsPage';

function AppContent() {
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
          {/* NEW: Add route for creating a new service request */}
          <Route path="service-requests/new" element={<NewServiceRequestPage />} /> {/* <--- ADD THIS LINE */}
          {/* NEW: Route for editing an existing service request */}
          <Route path="service-requests/edit/:id" element={<NewServiceRequestPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="security-access" element={<SecurityAccessPage />} />
          <Route path="incidents" element={<IncidentManagementPage />} />
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
        <ThemeContextProvider>
          <ServiceRequestProvider> {/* <--- ADD THIS LINE */}
            <AppContent />
          </ServiceRequestProvider> {/* <--- ADD THIS LINE */}
        </ThemeContextProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;