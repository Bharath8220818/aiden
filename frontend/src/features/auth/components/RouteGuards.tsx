import React, { Suspense, lazy } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Permission } from '../permissions';
import { ROLE_LABELS } from '../types';
import { Button } from '@/components/ui/Button';
import { ShieldAlert, LogIn, ArrowLeft } from 'lucide-react';

const LandingPage = lazy(() => import('@/pages/LandingPage'));

const LandingElement = () => (
  <Suspense fallback={null}>
    <LandingPage />
  </Suspense>
);

/** Blocks unauthenticated (or expired-session) access to the app shell. */
export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
};

/**
 * Root gate: `/` shows the public marketing landing for anonymous visitors
 * and the authenticated app shell (its normal children) once signed in.
 * Deep links to permissioned pages still bounce anonymous users to the
 * glass auth popup via AuthenticatedLayout.
 */
export const RootGate: React.FC = () => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Outlet />;
  return <Navigate to="/" replace />;
};

/** Renders the landing page (no redirect) — used as the `/` element. */
export const PublicRoot: React.FC = () => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Outlet />;
  return <LandingElement />;
};

/** Layout guard used directly in the router: auth + optional permission. */
export { AuthenticatedLayout } from './AuthenticatedLayout';

interface PermissionGateProps {
  permission: Permission;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/** Renders children only when the current user holds the permission; otherwise renders fallback (nothing by default). */
export const PermissionGate: React.FC<PermissionGateProps> = ({ permission, fallback = null, children }) => {
  const { can } = useAuth();
  return <>{can(permission) ? children : fallback}</>;
};

interface ForbiddenPageProps {
  permission?: Permission;
}

/** 403 surface shown when a signed-in user lacks the route's permission. */
export const ForbiddenPage: React.FC<ForbiddenPageProps> = ({ permission }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full p-8 rounded-2xl bg-card border border-border text-center space-y-4">
        <span className="inline-flex p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600">
          <ShieldAlert className="w-7 h-7" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-text-primary">Access restricted</h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            Your role (<span className="text-text-primary font-semibold">{user ? ROLE_LABELS[user.systemRole] : 'unknown'}</span>)
            does not include{permission ? <span className="font-mono text-indigo-600"> {permission}</span> : ' this area'}.
            Ask a Platform Admin to grant elevated access.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Button variant="primary" size="sm" leftIcon={<LogIn className="w-3.5 h-3.5" />} onClick={() => navigate('/dashboard')}>
            Overview
          </Button>
        </div>
        <p className="text-[10px] font-mono text-text-muted pt-2">HTTP 403 · RBAC policy enforcement</p>
      </div>
    </div>
  );
};
