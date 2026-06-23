import { Navigate } from 'react-router-dom';

import type { AppRole } from '../auth/auth';

interface Props {
  allowed: AppRole[];
  userRoles: AppRole[];
  isAuthenticated: boolean;
  children: React.ReactNode;
}

export function RoleGate({ allowed, userRoles, isAuthenticated, children }: Props) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const granted = allowed.some((r) => userRoles.includes(r));
  if (!granted) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
