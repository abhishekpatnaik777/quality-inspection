import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider.jsx';
import RequireAdmin from './auth/RequireAdmin.jsx';
import RequireAuth from './auth/RequireAuth.jsx';
import RequireInspectionAccess from './auth/RequireInspectionAccess.jsx';
import RequireQualityEngineer from './auth/RequireQualityEngineer.jsx';
import RequireSupervisor from './auth/RequireSupervisor.jsx';
import AppShell from './layout/AppShell.jsx';
import HomePage from './pages/HomePage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import SkusPage from './pages/SkusPage.jsx';
import ManufacturingUnitsPage from './pages/ManufacturingUnitsPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import InspectionsPage from './pages/InspectionsPage.jsx';
import ViewInspectionsPage from './pages/ViewInspectionsPage.jsx';
import InspectionDetailPage from './pages/InspectionDetailPage.jsx';
import SupervisorDashboardPage from './pages/SupervisorDashboardPage.jsx';
import SupervisorInspectionsPage from './pages/SupervisorInspectionsPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route
              path="/users"
              element={
                <RequireAdmin>
                  <UsersPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/skus"
              element={
                <RequireAdmin>
                  <SkusPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/manufacturing-units"
              element={
                <RequireAdmin>
                  <ManufacturingUnitsPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/products"
              element={
                <RequireAdmin>
                  <ProductsPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/inspections"
              element={
                <RequireQualityEngineer>
                  <InspectionsPage />
                </RequireQualityEngineer>
              }
            />
            <Route
              path="/inspections/view"
              element={
                <RequireQualityEngineer>
                  <ViewInspectionsPage />
                </RequireQualityEngineer>
              }
            />
            <Route
              path="/inspections/:inspectionId"
              element={
                <RequireInspectionAccess>
                  <InspectionDetailPage />
                </RequireInspectionAccess>
              }
            />
            <Route
              path="/supervisor/dashboard"
              element={
                <RequireSupervisor>
                  <SupervisorDashboardPage />
                </RequireSupervisor>
              }
            />
            <Route
              path="/supervisor/inspections"
              element={
                <RequireSupervisor>
                  <SupervisorInspectionsPage />
                </RequireSupervisor>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
