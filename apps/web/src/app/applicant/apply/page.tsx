'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, GraduationCap, ArrowRight, Sparkles, BookOpen } from 'lucide-react';

export default function ApplyIndexPage(): React.JSX.Element {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center py-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-100 text-emerald-900 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
          Scholarship Intake 2026-2027
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Select Scheme to Begin Application
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
          Choose between National Higher Education Fellowship (NFST) or National Overseas Scholarship (NOS) to access the dedicated intake wizard.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* NFST Card */}
        <div className="bg-white rounded-2xl border-2 border-emerald-500/30 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-emerald-700" />
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 uppercase tracking-wider">
              Scheme Code: NFST
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              National Fellowship for Higher Education of ST Students
            </h2>
            <p className="text-xs text-slate-600 mt-2">
              For M.Phil and Ph.D. scholars pursuing full-time research in Indian universities. Annual family income limit: ≤ ₹80,000.
            </p>
          </div>
          <Link
            href="/applicant/apply/NFST"
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition"
          >
            Start NFST Application
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* NOS Card */}
        <div className="bg-white rounded-2xl border-2 border-amber-500/30 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
              <GraduationCap className="w-6 h-6 text-amber-700" />
            </div>
            <span className="text-xs font-mono font-bold text-amber-700 uppercase tracking-wider">
              Scheme Code: NOS
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              National Overseas Scholarship for ST Candidates
            </h2>
            <p className="text-xs text-slate-600 mt-2">
              For Master&apos;s and Ph.D. studies in top premier institutions abroad. Annual family income limit: ≤ ₹6,00,000.
            </p>
          </div>
          <Link
            href="/applicant/apply/NOS"
            className="mt-6 w-full py-2.5 px-4 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition"
          >
            Start NOS Application
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
