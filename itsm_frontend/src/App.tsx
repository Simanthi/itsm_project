// itsm_frontend/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { ThemeContextProvider, useThemeContext } from './context/ThemeContext';
import { lightTheme, darkTheme } from './theme/theme'; // Using your specified path './theme/theme'

import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';

// --- Import all your module pages (ensure these files exist in src/pages/) ---
import ServiceRequestsPage from './pages/ServiceRequestsPage';
import DashboardPage from './pages/DashboardPage'; // As per your App.tsx
import AssetsPage from './pages/AssetsPage';
import SecurityAccessPage from './pages/SecurityAccessPage';
import IncidentManagementPage from './pages/IncidentManagementPage'; // As per your App.tsx
import ChangeManagementPage from './pages/ChangeManagementPage'; // As per your App.tsx
import ConfigurationManagementPage from './pages/ConfigurationManagementPage'; // As per your App.tsx
import ApprovalWorkflowPage from './pages/ApprovalWorkflowPage'; // As per your App.tsx
import ReportsAnalyticsPage from './pages/ReportsAnalyticsPage'; // As per your App.tsx
import NotFoundPage from './pages/NotFoundPage';

import { AuthProvider, useAuth } from './context/AuthContext'; // <--- CORRECTED: Import from the consolidated AuthContext.tsx

// Inner component to consume the theme and auth contexts and apply them
function AppContent() {
  const { mode } = useThemeContext(); // Get the current theme mode from context
  const theme = mode === 'light' ? lightTheme : darkTheme; // Select theme based on mode
  const { isAuthenticated } = useAuth(); // Get isAuthenticated from AuthContext

  // ProtectedRoute component defined here to use isAuthenticated from context
  const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* Resets CSS, applies background color from theme.palette.background.default */}
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

        {/* Catch-all for any unmatched routes */}
        <Route path="*" element={<NotFoundPage />} /> {/* Display a 404 page */}
      </Routes>
    </ThemeProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeContextProvider> {/* Wrap with your custom ThemeContext */}
          <AppContent />
        </ThemeContextProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;