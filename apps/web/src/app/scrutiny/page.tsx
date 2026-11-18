'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  CheckCircle,
  FileText,
  Search,
  ArrowRight,
  Filter,
  Eye,
  Bot,
} from 'lucide-react';

export default function ScrutinyDashboardPage(): React.JSX.Element {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-stone-900 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-600/60 text-amber-100">
              Scrutiny Officer Desk
            </span>
            <span className="text-xs text-amber-300 font-medium">
              Level-1 Document Intelligence &amp; Governance
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Officer Queue: {user?.fullName || 'Dr. Sunita Toppo'}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Evaluate PaddleOCR extracted field evidence side-by-side with submitted certificates, enforce cross-document consistency, and forward verified decision packages to the Selection Committee.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-amber-950/80 border border-amber-600/40 text-amber-200 text-xs flex items-center gap-2">
            <Bot className="w-4 h-4 text-amber-400" />
            AI Fast-Pass Engine Active
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Review</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-800">12</div>
          <div className="text-[11px] text-amber-700 font-medium">4 high priority</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">AI Verified (Clean)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">8</div>
          <div className="text-[11px] text-emerald-600 font-medium">Confidence &gt; 90%</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Deficiencies</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-red-600">3</div>
          <div className="text-[11px] text-slate-500">Awaiting scholar re-upload</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Packages Approved</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-blue-700">45</div>
          <div className="text-[11px] text-blue-600 font-medium">Forwarded to Committee</div>
        </div>
      </div>

      {/* Scrutiny Worklist */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Active Scrutiny Queue
            </h2>
            <p className="text-xs text-slate-500">
              Showing candidates awaiting first-pass document and consistency validation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search scholar or app #..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 text-xs font-medium hover:bg-slate-100"
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">App Number</th>
                <th className="px-4 py-3">Applicant Name</th>
                <th className="px-4 py-3">Scheme</th>
                <th className="px-4 py-3">OCR Confidence</th>
                <th className="px-4 py-3">Cross-Doc Status</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50 transition">
                <td className="px-4 py-3 font-mono font-bold text-slate-900">
                  TS-NFST-2026-0001
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">Birsa Munda</div>
                  <div className="text-[10px] text-slate-500">Khunti, Jharkhand</div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-slate-800">NFST 2026-27</span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                    94.8% (PaddleOCR)
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    Consistent (4/4 Matched)
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    UNDER_SCRUTINY
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href="/officer/applications/demo-app-1"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition cursor-pointer shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Open Decision Desk
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
