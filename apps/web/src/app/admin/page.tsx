'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import {
  Settings,
  BookOpen,
  Users,
  History,
  Activity,
  CheckCircle2,
  ShieldCheck,
  Code2,
  Play,
  ArrowRight,
} from 'lucide-react';

export default function AdminDashboardPage(): React.JSX.Element {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-slate-900 to-slate-950 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-600/60 text-purple-100">
              System Administration &amp; Policy
            </span>
            <span className="text-xs text-amber-300 font-medium">
              Versioned Rule DSL Engine &amp; Audit Governance
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Administrator: {user?.fullName || 'MoTA Admin'}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Configure dynamic scheme rules without code deployment, simulate dry-run eligibility runs, inspect append-only audit trails, and manage officer role privileges.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/schemes"
            className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition"
          >
            <BookOpen className="w-4 h-4" />
            Manage Scheme Rule DSLs
          </Link>
          <div className="px-3.5 py-2 rounded-xl bg-purple-950/80 border border-purple-500/40 text-purple-200 text-xs flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Rule Engine v1.0.0 Active
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Configured Schemes</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-800">2</div>
          <div className="text-[11px] text-purple-700 font-medium">NFST &amp; NOS Active</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Rule Versions</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Code2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">v1 (2026-27)</div>
          <div className="text-[11px] text-emerald-600 font-medium">Deterministic JSON DSL</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Governed Users</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-800">4 RBAC Personas</div>
          <div className="text-[11px] text-blue-600 font-medium">Applicant, Scrutiny, Selection, Admin</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Immutable Audit Entries</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-700">100% Tamper-Evident</div>
          <div className="text-[11px] text-slate-500">Append-Only Postgres Log</div>
        </div>
      </div>

      {/* Versioned Schemes Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Versioned Scheme Rule Sets &amp; Dry-Run Simulation
            </h2>
            <p className="text-xs text-slate-500">
              Update eligibility criteria and document checklists without modifying codebase
            </p>
          </div>
          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded border border-purple-200">
            JSON Rule Engine
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Scheme Code</th>
                <th className="px-4 py-3">Scheme Title</th>
                <th className="px-4 py-3">Active Version</th>
                <th className="px-4 py-3">Mandatory Documents</th>
                <th className="px-4 py-3">Income Ceiling</th>
                <th className="px-4 py-3 text-right">Simulation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50 transition">
                <td className="px-4 py-3 font-mono font-bold text-slate-900">
                  NFST
                </td>
                <td className="px-4 py-3 font-semibold text-slate-800">
                  National Fellowship for Higher Education of ST Students
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
                    v1 (PUBLISHED)
                  </span>
                </td>
                <td className="px-4 py-3">
                  4 types (Caste, Income, Domicile, Marksheet)
                </td>
                <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                  ≤ ₹ 80,000 / year
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href="/admin/schemes?scheme=NFST"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs transition cursor-pointer shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Simulate &amp; Edit DSL
                  </Link>
                </td>
              </tr>
              <tr className="hover:bg-slate-50 transition">
                <td className="px-4 py-3 font-mono font-bold text-slate-900">
                  NOS
                </td>
                <td className="px-4 py-3 font-semibold text-slate-800">
                  National Overseas Scholarship for ST Candidates
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold">
                    v1 (PUBLISHED)
                  </span>
                </td>
                <td className="px-4 py-3">
                  5 types (Caste, Admission, Marksheet, Domicile, Proposal)
                </td>
                <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                  ≤ ₹ 6,00,000 / year
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href="/admin/schemes?scheme=NOS"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs transition cursor-pointer shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Simulate &amp; Edit DSL
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
