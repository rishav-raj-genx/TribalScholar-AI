'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function DeficienciesOverviewPage(): React.JSX.Element {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Scholar Deficiency &amp; Exception Desk
            </h1>
            <p className="text-xs text-slate-500">
              Itemized correction notices raised during PaddleOCR scrutiny and officer review
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-amber-200 text-amber-900">
                  TS-NFST-2026-0001
                </span>
                <span className="text-xs font-bold text-slate-900">
                  INCOME_CERTIFICATE_LEGIBILITY
                </span>
                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.2 rounded">
                  ACTION REQUIRED
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Uploaded income certificate scan is blurred or illegible (OCR confidence: 42.1%). Please re-upload a clear copy from the issuing Revenue Tehsildar (≤ ₹80,000/yr).
              </p>
            </div>
            <Link
              href="/applicant/applications/demo-app-1"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition cursor-pointer flex-shrink-0"
            >
              Resolve &amp; Re-Verify
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
