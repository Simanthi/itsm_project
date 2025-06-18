import { Suspense, lazy } from 'react'; // Added Suspense, lazy
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline, CircularProgress, Box } from '@mui/material'; // Added CircularProgress, Box
import { AuthProvider } from './context/auth/AuthContext';
import { ThemeContextProvider } from './context/ThemeContext/ThemeContextProvider';
import { ServiceRequestProvider } from './modules/service-requests/context';
import { UIContextProvider } from './context/UIContext/UIContextProvider'; // Import the new UIContextProvider

// Lazy load page components
const LoginPage = lazy(() => import('./modules/auth/LoginPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const DashboardPage = lazy(() => import('./modules/dashboard/DashboardPage'));

const ServiceRequestsPage = lazy(() => import('./modules/service-requests/pages').then(module => ({ default: module.ServiceRequestsPage })));
const NewServiceRequestPage = lazy(() => import('./modules/service-requests/pages').then(module => ({ default: module.NewServiceRequestPage })));
const ServiceRequestPrintView = lazy(() => import('./modules/service-requests/components').then(module => ({ default: module.ServiceRequestPrintView })));

const AssetsPage = lazy(() => import('./modules/assets/pages').then(module => ({ default: module.AssetsPage })));
const AssetForm = lazy(() => import('./modules/assets/components').then(module => ({ default: module.AssetForm })));
const AssetPrintView = lazy(() => import('./modules/assets/components').then(module => ({ default: module.AssetPrintView })));
const CategoryPrintView = lazy(() => import('./modules/assets/components').then(module => ({ default: module.CategoryPrintView })));
const LocationPrintView = lazy(() => import('./modules/assets/components').then(module => ({ default: module.LocationPrintView })));
const VendorPrintView = lazy(() => import('./modules/assets/components').then(module => ({ default: module.VendorPrintView })));

const ProcurementDashboardPage = lazy(() => import('./modules/procurement/pages').then(module => ({ default: module.ProcurementDashboardPage })));
const PurchaseRequestMemoList = lazy(() => import('./modules/procurement/components/purchase-request-memos').then(module => ({ default: module.PurchaseRequestMemoList })));
const PurchaseRequestMemoForm = lazy(() => import('./modules/procurement/components/purchase-request-memos').then(module => ({ default: module.PurchaseRequestMemoForm })));
const PurchaseRequestMemoDetailView = lazy(() => import('./modules/procurement/components/purchase-request-memos').then(module => ({ default: module.PurchaseRequestMemoDetailView })));
const PurchaseRequestMemoPrintView = lazy(() => import('./modules/procurement/components/purchase-request-memos').then(module => ({ default: module.PurchaseRequestMemoPrintView })));

const PurchaseOrderList = lazy(() => import('./modules/procurement/components/purchase-orders').then(module => ({ default: module.PurchaseOrderList })));
const PurchaseOrderForm = lazy(() => import('./modules/procurement/components/purchase-orders').then(module => ({ default: module.PurchaseOrderForm })));
const PurchaseOrderDetailView = lazy(() => import('./modules/procurement/components/purchase-orders').then(module => ({ default: module.PurchaseOrderDetailView })));
const PurchaseOrderPrintView = lazy(() => import('./modules/procurement/components/purchase-orders').then(module => ({ default: module.PurchaseOrderPrintView })));

const CheckRequestList = lazy(() => import('./modules/procurement/components/check-requests').then(module => ({ default: module.CheckRequestList })));
const CheckRequestForm = lazy(() => import('./modules/procurement/components/check-requests').then(module => ({ default: module.CheckRequestForm })));
const CheckRequestDetailView = lazy(() => import('./modules/procurement/components/check-requests').then(module => ({ default: module.CheckRequestDetailView })));
const CheckRequestPrintView = lazy(() => import('./modules/procurement/components/check-requests').then(module => ({ default: module.CheckRequestPrintView })));

const SecurityAccessPage = lazy(() => import('./modules/security-access/SecurityAccessPage'));
const IncidentManagementPage = lazy(() => import('./modules/incidents/IncidentManagementPage'));
const ChangeManagementPage = lazy(() => import('./modules/changes/pages/ChangeManagementPage'));
const ConfigurationManagementPage = lazy(() => import('./modules/configs/pages/ConfigurationManagementPage'));
const ApprovalWorkflowPage = lazy(() => import('./modules/workflows/ApprovalWorkflowPage'));
const MyApprovalsPage = lazy(() => import('./modules/workflows/pages/MyApprovalsPage')); // Added MyApprovalsPage
const ReportsAnalyticsPage = lazy(() => import('./modules/reports/ReportsAnalyticsPage'));
const CatalogPage = lazy(() => import('./modules/service-catalog/pages/CatalogPage'));


function AppContent() {
  return (
    <>
      <CssBaseline />
      <Suspense fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              <CircularProgress />
          </Box>
      }>
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
              <Route path="assets/print-preview" element={<AssetPrintView />} />
              <Route
                path="assets/categories/print-preview"
                element={<CategoryPrintView />}
              />
              <Route
                path="assets/locations/print-preview"
                element={<LocationPrintView />}
              />
              <Route
                path="assets/vendors/print-preview"
                element={<VendorPrintView />}
              />{' '}
              {/* Added Vendor Print Preview Route */}
              {/* Procurement Routes */}
              <Route path="procurement" element={<ProcurementDashboardPage />} />
              <Route path="procurement/iom" element={<PurchaseRequestMemoList />} />
              <Route
                path="procurement/iom/new"
                element={<PurchaseRequestMemoForm />}
              />
              <Route
                path="procurement/iom/edit/:memoId"
                element={<PurchaseRequestMemoForm />}
              />
              <Route
                path="procurement/iom/view/:memoId"
                element={<PurchaseRequestMemoDetailView />}
              />
              <Route
                path="procurement/iom/print-preview"
                element={<PurchaseRequestMemoPrintView />}
              />{' '}
              {/* Added IOM Print Preview Route */}
              <Route
                path="procurement/purchase-orders"
                element={<PurchaseOrderList />}
              />
              <Route
                path="procurement/purchase-orders/new"
                element={<PurchaseOrderForm />}
              />
              <Route
                path="procurement/purchase-orders/edit/:poId"
                element={<PurchaseOrderForm />}
              />
              <Route
                path="procurement/purchase-orders/view/:poId"
                element={<PurchaseOrderDetailView />}
              />
              <Route
                path="procurement/purchase-orders/print-preview"
                element={<PurchaseOrderPrintView />}
              />{' '}
              {/* Added Print Preview Route */}
              {/* Check Request Routes */}
              <Route
                path="procurement/check-requests"
                element={<CheckRequestList />}
              />
              <Route
                path="procurement/check-requests/new"
                element={<CheckRequestForm />}
              />
              <Route
                path="procurement/check-requests/edit/:checkRequestId"
                element={<CheckRequestForm />}
              />
              <Route
                path="procurement/check-requests/view/:checkRequestId"
                element={<CheckRequestDetailView />}
              />
              <Route
                path="procurement/check-requests/print-preview"
                element={<CheckRequestPrintView />}
              />{' '}
              {/* Added Print Preview Route */}
              <Route path="security-access" element={<SecurityAccessPage />} />
              <Route path="incidents" element={<IncidentManagementPage />} />
              <Route path="service-catalog" element={<CatalogPage />} />
              <Route path="changes" element={<ChangeManagementPage />} />
              <Route path="configs" element={<ConfigurationManagementPage />} />
              <Route path="workflows" element={<ApprovalWorkflowPage />} /> 
              <Route path="my-approvals" element={<MyApprovalsPage />} /> {/* Added MyApprovalsPage Route */}
              <Route path="reports" element={<ReportsAnalyticsPage />} />
            </Route>
            {/* Fallback for unmatched routes */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
      </Suspense>
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
