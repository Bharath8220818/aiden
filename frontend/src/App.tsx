import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layout
import Header from './components/common/Header';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import PipelinesPage from './pages/PipelinesPage';
import PipelineBuilderPage from './pages/PipelineBuilderPage';
import PipelineDetailsPage from './pages/PipelineDetailsPage';
import MonitoringPage from './pages/MonitoringPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <div className="min-h-screen bg-gray-50">
            <ErrorBoundary>
              <Header />
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  
                  {/* Protected Routes */}
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/pipelines"
                    element={
                      <ProtectedRoute>
                        <PipelinesPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/pipelines/:id"
                    element={
                      <ProtectedRoute>
                        <PipelineDetailsPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/builder"
                    element={
                      <ProtectedRoute>
                        <PipelineBuilderPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/monitoring"
                    element={
                      <ProtectedRoute>
                        <MonitoringPage />
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* Catch-all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </ErrorBoundary>
          </div>
        </BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;