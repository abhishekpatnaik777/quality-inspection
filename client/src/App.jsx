import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider.jsx';
import RequireAdmin from './auth/RequireAdmin.jsx';
import HomePage from './pages/HomePage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import SkusPage from './pages/SkusPage.jsx';
import ManufacturingUnitsPage from './pages/ManufacturingUnitsPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
