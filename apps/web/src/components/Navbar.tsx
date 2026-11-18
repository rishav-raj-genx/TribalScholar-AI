'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  FileCheck2,
  Building2,
  User,
  ExternalLink,
} from 'lucide-react';

export function Navbar(): React.JSX.Element {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      {/* Top tricolor subtle line */}
      <div className="h-1 bg-gradient-to-r from-orange-500 via-white to-green-600" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand & MoTA Identity */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center font-bold text-xl shadow-md group-hover:bg-emerald-900 transition">
                <GraduationCap className="w-6 h-6 text-amber-300" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900 text-lg tracking-tight">
                    TribalScholar<span className="text-emerald-700">AI</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    MoTA · SIH 2026
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 leading-none">
                  Ministry of Tribal Affairs · Government of India
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link
              href="/"
              className="hover:text-emerald-700 transition flex items-center gap-1"
            >
              Overview
            </Link>
            <div className="flex items-center gap-1 text-slate-400">
              <span>|</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-slate-700">
                <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                NFST Fellowship
              </span>
              <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-slate-700">
                <GraduationCap className="w-3.5 h-3.5 text-amber-700" />
                NOS Overseas
              </span>
              <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-slate-700">
                <FileCheck2 className="w-3.5 h-3.5 text-blue-700" />
                DigiLocker Verified
              </span>
            </div>
          </nav>

          {/* Auth CTA or User Indicator */}
          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-800">
                    {user.fullName}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-mono">
                    {user.role}
                  </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  {user.fullName ? user.fullName[0]?.toUpperCase() : 'U'}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:text-emerald-700 transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-1.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition"
                >
                  New Scholar Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
