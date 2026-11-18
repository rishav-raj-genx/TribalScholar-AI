'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Award,
  CreditCard,
  Building,
  CheckCircle2,
  FileCheck,
  ListOrdered,
  Sparkles,
  ArrowRight,
  Download,
} from 'lucide-react';

export default function SelectionDashboardPage(): React.JSX.Element {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-600/60 text-blue-100">
              National Selection Committee Desk
            </span>
            <span className="text-xs text-amber-300 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Award Letters · Sanction Orders · DBT
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Committee Chair: {user?.fullName || 'Shri Rajeshwar Meena'}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Review verified decision packages forwarded by Scrutiny Officers, confirm slot allocations, issue digital sanction orders, and trigger Direct Benefit Transfer (DBT) disbursements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-blue-950/80 border border-blue-500/40 text-blue-200 text-xs flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            DBT PFMS Adapter Online
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Verified Packages</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-800">45</div>
          <div className="text-[11px] text-blue-600 font-medium">Ready for Committee Vote</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Sanction Orders Issued</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">38</div>
          <div className="text-[11px] text-emerald-600 font-medium">Digital Signatures Attached</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">DBT Disbursed (₹)</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-700">₹ 1.28 Cr</div>
          <div className="text-[11px] text-slate-500">Direct to Scholar Bank A/C</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Institutional Verifications</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-800">32</div>
          <div className="text-[11px] text-amber-700 font-medium">Confirmed by Registrar</div>
        </div>
      </div>

      {/* Candidates for Committee Review */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              National Fellowship &amp; Overseas Candidates
            </h2>
            <p className="text-xs text-slate-500">
              Ranked candidates with verified first-pass scrutiny clearance
            </p>
          </div>
          <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
            Selection Cycle 2026-I
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Rank / Score</th>
                <th className="px-4 py-3">App Number</th>
                <th className="px-4 py-3">Scholar Name</th>
                <th className="px-4 py-3">Scheme</th>
                <th className="px-4 py-3">Scrutiny Status</th>
                <th className="px-4 py-3">Selection Award</th>
                <th className="px-4 py-3 text-right">Sanction Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50 transition">
                <td className="px-4 py-3 font-mono font-bold text-slate-900">
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                    #1 · 96.5 pts
                  </span>
                </td>
                <td className="px-4 py-3 font-mono font-bold text-slate-800">
                  TS-NFST-2026-0001
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">Birsa Munda</div>
                  <div className="text-[10px] text-slate-400">Scheduled Tribe (Santhal)</div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-800">NFST Fellowship</span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    SCRUTINY_APPROVED
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                    SELECTION_PENDING
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition cursor-pointer shadow-sm"
                  >
                    <Award className="w-3.5 h-3.5" />
                    Issue Sanction
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
