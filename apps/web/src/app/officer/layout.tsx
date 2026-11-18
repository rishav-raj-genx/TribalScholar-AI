'use client';

import React, { type ReactNode } from 'react';
import { Role } from '@tribalscholar/shared';
import { RoleGuard } from '../../components/RoleGuard';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import { useAuth } from '../../context/AuthContext';

export default function OfficerLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const { user } = useAuth();
  const sidebarRole =
    user?.role === Role.SELECTION_OFFICER
      ? Role.SELECTION_OFFICER
      : Role.SCRUTINY_OFFICER;

  return (
    <RoleGuard
      allowedRoles={[
        Role.SCRUTINY_OFFICER,
        Role.SELECTION_OFFICER,
        Role.ADMIN,
      ]}
    >
      <div className="min-h-[calc(100vh-41px)] flex flex-col bg-slate-100">
        <Navbar />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar role={sidebarRole} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="max-w-[1600px] mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
