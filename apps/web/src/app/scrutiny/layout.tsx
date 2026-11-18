'use client';

import React, { type ReactNode } from 'react';
import { Role } from '@tribalscholar/shared';
import { RoleGuard } from '../../components/RoleGuard';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';

export default function ScrutinyLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <RoleGuard allowedRoles={[Role.SCRUTINY_OFFICER, Role.ADMIN]}>
      <div className="min-h-[calc(100vh-41px)] flex flex-col bg-slate-100">
        <Navbar />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar role={Role.SCRUTINY_OFFICER} />
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
