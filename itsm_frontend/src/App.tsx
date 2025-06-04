// itsm_frontend/src/App.tsx
import React from 'react'; // Removed useState, useEffect as AuthContext handles
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import theme from './theme';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import { useAuth } from './context/AuthContext'; // <--- Import useAuth

// Placeholder components for other modules (create these files later)
const ServiceRequestsPage = () => <HomePage />; // For now, just render HomePage content
const AssetsPage = () => <HomePage />;
const SecurityAccessPage = () => <HomePage />;
const IncidentsPage = () => <HomePage />;
const ChangesPage = () => <HomePage />;
const ConfigsPage = () => <HomePage />;
const WorkflowsPage = () => <HomePage />;
const ReportsPage = () => <HomePage />;


function App() {
  const { isAuthenticated } = useAuth(); // <--- Get isAuthenticated from AuthContext
  console.log('App.tsx - isAuthenticated from Context:', isAuthenticated); // Debugging log

  // Helper component for protected routes
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

        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/service-requests" element={<ProtectedRoute><ServiceRequestsPage /></ProtectedRoute>} />
        <Route path="/assets" element={<ProtectedRoute><AssetsPage /></ProtectedRoute>} />
        <Route path="/security-access" element={<ProtectedRoute><SecurityAccessPage /></ProtectedRoute>} />
        <Route path="/incidents" element={<ProtectedRoute><IncidentsPage /></ProtectedRoute>} />
        <Route path="/changes" element={<ProtectedRoute><ChangesPage /></ProtectedRoute>} />
        <Route path="/configs" element={<ProtectedRoute><ConfigsPage /></ProtectedRoute>} />
        <Route path="/workflows" element={<ProtectedRoute><WorkflowsPage /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />


        {/* Catch-all for any unmatched routes */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;