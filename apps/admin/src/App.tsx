import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/Toast';
import { LoginPage } from './pages/LoginPage';
import { MaterialsListPage } from './pages/MaterialsListPage';
import { MaterialFormPage } from './pages/MaterialFormPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/materials" replace /> : <LoginPage />}
      />
      <Route
        path="/materials"
        element={
          <ProtectedRoute>
            <MaterialsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/materials/new"
        element={
          <ProtectedRoute>
            <MaterialFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/materials/:id/edit"
        element={
          <ProtectedRoute>
            <MaterialFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/materials" replace />} />
      <Route path="*" element={<Navigate to="/materials" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
            <ToastContainer />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
