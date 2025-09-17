import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';

export function AdminRedirect({ children }: { children: ReactNode }) {
  const { profile, loading, isInitialized } = useUserProfile();
  const location = useLocation();

  if (loading || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // **CAS 1: no hi ha sessió → envia a /login**
  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  // **CAS 2: admin sense context de client → envia a /admin-dashboard**
  const isAdmin = profile.admin_role === 'super_admin' || profile.admin_role === 'client_admin';
  const isOnClientDashboard = [
    '/dashboard',
    '/salutdental-dashboard',
    '/salutdental-tickets',
    '/salutdental-calls',
    '/registre-trucades',
    '/tickets',
  ].some(p => location.pathname.startsWith(p));

  if (isAdmin && !isOnClientDashboard && !profile.active_client_id) {
    return <Navigate to="/admin-dashboard" replace />;
  }

  // **CAS 3: usuari regular o admin amb context de client → render normal**
  return <>{children}</>;
}