import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './auth/AuthContext';
import { ToastProvider } from './components/feedback/ToastContext';
import { ConfirmProvider } from './components/feedback/ConfirmContext';
import { ErrorBoundary } from './components/feedback/ErrorBoundary';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AdminLayout } from './components/layout/AdminLayout';

// Pages
import { LoginPage } from './pages/auth/LoginPage';
import { PartnerRegisterPage } from './pages/auth/PartnerRegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { BookingsPage } from './pages/bookings/BookingsPage';
import { DispatchPage } from './pages/dispatch/DispatchPage';
import { TaskersPage } from './pages/taskers/TaskersPage';
import { ServicesPage } from './pages/services/ServicesPage';
import { FinancePage } from './pages/finance/FinancePage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { TenantsPage } from './pages/tenants/TenantsPage';
import { CronPage } from './pages/cron/CronPage';
import { NotFoundPage } from './pages/error/NotFoundPage';
import { UnauthorizedPage } from './pages/error/UnauthorizedPage';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/partner/register" element={<PartnerRegisterPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="/403" element={<UnauthorizedPage />} />

              {/* Protected Authenticated Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/bookings" element={<BookingsPage />} />
                <Route path="/dispatch" element={<DispatchPage />} />
                <Route path="/taskers" element={<TaskersPage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/finance" element={<FinancePage />} />
                <Route path="/settings" element={<SettingsPage />} />

                {/* Super Admin Restricted Routes */}
                <Route
                  path="/tenants"
                  element={
                    <ProtectedRoute requiredRole="SUPER_ADMIN">
                      <TenantsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cron-jobs"
                  element={
                    <ProtectedRoute requiredRole="SUPER_ADMIN">
                      <CronPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Catch-all 404 Route */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);
};

export default App;
