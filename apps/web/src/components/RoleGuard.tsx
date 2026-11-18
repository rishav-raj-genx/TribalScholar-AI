'use client';

import React, { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '@tribalscholar/shared';
import { useAuth, getRoleDashboardPath } from '../context/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles: Role[];
  children: ReactNode;
}

export function RoleGuard({
  allowedRoles,
  children,
}: RoleGuardProps): React.JSX.Element {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        router.replace('/login');
      } else if (!allowedRoles.includes(user.role)) {
        // Redirect to their authorized role dashboard
        const target = getRoleDashboardPath(user.role);
        router.replace(target);
      }
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm text-slate-600 font-medium">
          Verifying security credentials & role clearance...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user || !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 p-6 text-center">
        <ShieldAlert className="w-10 h-10 text-amber-600" />
        <h2 className="text-lg font-semibold text-slate-800">
          Access Restricted
        </h2>
        <p className="text-sm text-slate-600 max-w-md">
          Your active session does not possess clearance for this workspace. Redirecting to your assigned dashboard...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
