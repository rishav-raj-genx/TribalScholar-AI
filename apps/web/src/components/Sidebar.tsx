'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Role } from '@tribalscholar/shared';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  AlertTriangle,
  User,
  ShieldCheck,
  CheckCircle2,
  Award,
  ListOrdered,
  FileCheck,
  CreditCard,
  Settings,
  BookOpen,
  Users,
  History,
  Activity,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const APPLICANT_NAV: NavItem[] = [
  { label: 'Scholar Dashboard', href: '/applicant', icon: LayoutDashboard },
  { label: 'My Applications', href: '/applicant/applications', icon: FileText },
  { label: 'Apply for Scheme', href: '/applicant/apply', icon: PlusCircle },
  { label: 'Action Items / Deficiencies', href: '/applicant/deficiencies', icon: AlertTriangle },
  { label: 'Scholar Profile & DigiLocker', href: '/applicant/profile', icon: User },
];

const SCRUTINY_NAV: NavItem[] = [
  { label: 'Scrutiny Overview', href: '/scrutiny', icon: LayoutDashboard },
  { label: 'Officer Scrutiny Queue', href: '/officer/queue', icon: ShieldCheck },
  { label: 'AI OCR Cross-Doc Audit', href: '/scrutiny/consistency', icon: Activity },
  { label: 'Deficiency Flags', href: '/scrutiny/deficiencies', icon: AlertTriangle },
  { label: 'Approved Packages', href: '/scrutiny/approved', icon: CheckCircle2 },
];

const SELECTION_NAV: NavItem[] = [
  { label: 'Selection Overview', href: '/selection', icon: LayoutDashboard },
  { label: 'Officer Scrutiny Queue', href: '/officer/queue', icon: ShieldCheck },
  { label: 'National Merit Quota', href: '/selection/merit', icon: ListOrdered },
  { label: 'Sanction Orders', href: '/selection/sanctions', icon: Award },
  { label: 'DBT Direct Benefits', href: '/selection/dbt', icon: CreditCard },
  { label: 'Institutional Verification', href: '/selection/institutional', icon: FileCheck },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Administration Console', href: '/admin', icon: LayoutDashboard },
  { label: 'Versioned Scheme Rules DSL', href: '/admin/schemes', icon: BookOpen },
  { label: 'User Governance & Roles', href: '/admin/users', icon: Users },
  { label: 'Immutable Audit Trail', href: '/admin/audit', icon: History },
  { label: 'System Health & Metrics', href: '/admin/diagnostics', icon: Activity },
];

interface SidebarProps {
  role: Role;
}

export function Sidebar({ role }: SidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const { user } = useAuth();

  let items: NavItem[] = [];
  let roleTitle = 'Workspace';
  let badgeColor = 'bg-slate-100 text-slate-800';

  switch (role) {
    case Role.APPLICANT:
      items = APPLICANT_NAV;
      roleTitle = 'Scholar Intake Portal';
      badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      break;
    case Role.SCRUTINY_OFFICER:
      items = SCRUTINY_NAV;
      roleTitle = 'Scrutiny Officer Desk';
      badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
      break;
    case Role.SELECTION_OFFICER:
      items = SELECTION_NAV;
      roleTitle = 'Selection Committee Desk';
      badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
      break;
    case Role.ADMIN:
      items = ADMIN_NAV;
      roleTitle = 'MoTA System Administration';
      badgeColor = 'bg-purple-100 text-purple-800 border-purple-300';
      break;
  }

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0 text-slate-300">
      {/* Workspace Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Designated Workspace
        </div>
        <div className="text-sm font-bold text-white mt-0.5">{roleTitle}</div>
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badgeColor}`}
          >
            {role}
          </span>
          <span className="text-[11px] text-emerald-400 font-medium">Active Clearance</span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-emerald-700 text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Active User Card Footer */}
      {user && (
        <div className="p-3 border-t border-slate-800 bg-slate-950/50">
          <div className="text-[11px] text-slate-400">Authenticated Identity</div>
          <div className="text-xs font-semibold text-slate-200 truncate mt-0.5">
            {user.fullName}
          </div>
          <div className="text-[10px] text-slate-400 font-mono truncate">
            {user.email}
          </div>
        </div>
      )}
    </aside>
  );
}
