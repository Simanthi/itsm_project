import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './context/auth/AuthContext';
import { ThemeContextProvider } from './context/ThemeContext/ThemeContextProvider';
import { ServiceRequestProvider } from './modules/service-requests/context/ServiceRequestProvider';
import { UIContextProvider } from './context/UIContext/UIContextProvider'; // Import the new UIContextProvider

import LoginPage from './modules/auth/LoginPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import DashboardPage from './modules/dashboard/DashboardPage';
import ServiceRequestsPage from './modules/service-requests/pages/ServiceRequestsPage';
import NewServiceRequestPage from './modules/service-requests/pages/NewServiceRequestPage';
import AssetsPage from './modules/assets/AssetsPage';
import AssetForm from './modules/assets/components/AssetForm'; // Import AssetForm
import SecurityAccessPage from './modules/security-access/SecurityAccessPage';
import IncidentManagementPage from './modules/incidents/IncidentManagementPage';
import ChangeManagementPage from './modules/changes/ChangeManagementPage';
import ConfigurationManagementPage from './modules/configs/ConfigurationManagementPage';
import ApprovalWorkflowPage from './modules/workflows/ApprovalWorkflowPage';
import ReportsAnalyticsPage from './modules/reports/ReportsAnalyticsPage';
import ServiceRequestPrintView from './modules/service-requests/components/ServiceRequestPrintView';

function AppContent() {
  return (
    <>
      <CssBaseline />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Main application routes, protected by HomePage's auth check */}
        <Route path="/" element={<HomePage />}>
          <Route index element={<DashboardPage />} />
          <Route path="service-requests" element={<ServiceRequestsPage />} />
          <Route
            path="service-requests/new"
            element={<NewServiceRequestPage />}
          />
          <Route
            path="service-requests/edit/:id"
            element={<NewServiceRequestPage />}
          />
          <Route
            path="service-requests/print-preview"
            element={<ServiceRequestPrintView />}
          />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="assets/new" element={<AssetForm />} />
          <Route path="assets/edit/:assetId" element={<AssetForm />} />
          <Route path="security-access" element={<SecurityAccessPage />} />
          <Route path="incidents" element={<IncidentManagementPage />} />
          <Route path="changes" element={<ChangeManagementPage />} />
          <Route path="configs" element={<ConfigurationManagementPage />} />
          <Route path="workflows" element={<ApprovalWorkflowPage />} />
          <Route path="reports" element={<ReportsAnalyticsPage />} />
        </Route>
        {/* Fallback for unmatched routes */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      {/* Theme context provider */}
      <ThemeContextProvider>
        {/* Auth context provider */}
        <AuthProvider>
          {/* Service Request context provider */}
          <ServiceRequestProvider>
            {/* UI Context Provider should wrap AppContent to make snackbars/dialogs available globally */}
            <UIContextProvider>
              <AppContent />
            </UIContextProvider>
          </ServiceRequestProvider>
        </AuthProvider>
      </ThemeContextProvider>
    </Router>
  );
}

export default App;
