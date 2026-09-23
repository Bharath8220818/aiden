import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Permission } from '@/features/auth/permissions';
import { ForbiddenPage } from '@/features/auth/components/RouteGuards';

/** Layout-route guard: requires an authenticated session plus an optional permission. */
export const AuthenticatedLayout: React.FC<{ requiredPermission?: Permission }> = ({ requiredPermission }) => {
  const { isAuthenticated, can } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (requiredPermission && !can(requiredPermission)) {
    return <ForbiddenPage permission={requiredPermission} />;
  }
  return <Outlet />;
};
