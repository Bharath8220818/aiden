import { useCallback } from 'react';
import { useAuthStore } from '../authStore';
import { Permission, permissionsForRole, roleHasPermission } from '../permissions';
import { SystemRole } from '../types';

/** Session + identity access with actions. */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const expiresAt = useAuthStore((s) => s.expiresAt);
  const isAuthenticating = useAuthStore((s) => s.isAuthenticating);
  const error = useAuthStore((s) => s.error);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const logout = useAuthStore((s) => s.logout);
  const clearError = useAuthStore((s) => s.clearError);

  const role: SystemRole | null = user?.systemRole ?? null;
  const permissions = role ? permissionsForRole(role) : [];

  // `new Date().getTime()` (not static Date.now) keeps the render pure per react-hooks/purity
  const isAuthenticated = Boolean(user && token && expiresAt && new Date(expiresAt).getTime() > new Date().getTime());

  const can = useCallback((permission: Permission) => (role ? roleHasPermission(role, permission) : false), [role]);

  const canAny = useCallback(
    (permissions: Permission[]) => permissions.some((p) => (role ? roleHasPermission(role, p) : false)),
    [role]
  );

  return {
    user,
    role,
    permissions,
    token,
    expiresAt,
    isAuthenticated,
    isAuthenticating,
    error,
    login,
    register,
    logout,
    clearError,
    can,
    canAny,
  };
}

/** Standalone permission check hook — subscribe only to the role slice. */
export function usePermission(permission: Permission): boolean {
  const role = useAuthStore((s) => s.user?.systemRole ?? null);
  return role ? roleHasPermission(role, permission) : false;
}
