'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Role } from '@tribalscholar/shared';
import { useAuth, DEMO_PERSONAS, getRoleDashboardPath } from '../../context/AuthContext';
import {
  GraduationCap,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  Settings,
  UserCheck,
} from 'lucide-react';

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const { user, isAuthenticated, login, switchRoleDemo, isLoading } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // If already logged in, redirect to role workspace
  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(getRoleDashboardPath(user.role));
    }
  }, [isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const loggedUser = await login({ email, password });
      router.push(getRoleDashboardPath(loggedUser.role));
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Authentication failed. Please verify credentials.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoClick = async (role: Role): Promise<void> => {
    setErrorMessage(null);
    await switchRoleDemo(role);
  };

  return (
    <div className="min-h-[calc(100vh-41px)] bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Header / Ministry Brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-800 text-amber-300 shadow-lg mb-4">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          TribalScholar<span className="text-emerald-700">AI</span>
        </h1>
        <p className="mt-1 text-xs text-slate-600 font-medium">
          Ministry of Tribal Affairs · Smart India Hackathon 2026 (SIH26239)
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Intelligent Operations & Decision Support Platform for ST Schemes
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl px-4">
        {/* Main Login Card */}
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-slate-200 sm:px-10">
          <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>Secure Portal Sign In</span>
            <span className="text-[11px] font-normal text-slate-500">
              Role-Based Access Control (RBAC)
            </span>
          </h2>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wide"
              >
                Official / Registered Email
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="applicant@demo.in or officer@mota.gov.in"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wide"
              >
                Password
              </label>
              <div className="mt-1 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-slate-600">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-semibold text-emerald-700 hover:text-emerald-800 underline"
            >
              Register as New Scholar
            </Link>
          </div>

          {/* SIH Jury Instant Demo Switcher Box */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-amber-500" />
                SIH 2026 Jury One-Click Login
              </span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Instant Persona Switch
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              For live hackathon evaluation, click any demo persona below to log in directly:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Applicant Card */}
              <button
                type="button"
                onClick={() => void handleDemoClick(Role.APPLICANT)}
                className="flex items-start gap-2.5 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 text-left transition group cursor-pointer"
              >
                <div className="w-7 h-7 rounded bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <span>Birsa Munda</span>
                  </div>
                  <div className="text-[10px] text-emerald-700 font-medium truncate">
                    ST Scholar · NFST Candidate
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    applicant@demo.in
                  </div>
                </div>
              </button>

              {/* Scrutiny Officer Card */}
              <button
                type="button"
                onClick={() => void handleDemoClick(Role.SCRUTINY_OFFICER)}
                className="flex items-start gap-2.5 p-2.5 rounded-lg border border-amber-200 bg-amber-50/60 hover:bg-amber-100/80 text-left transition group cursor-pointer"
              >
                <div className="w-7 h-7 rounded bg-amber-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800">
                    Dr. Sunita Toppo
                  </div>
                  <div className="text-[10px] text-amber-700 font-medium truncate">
                    First-Pass Scrutiny Desk
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    scrutiny@mota.gov.in
                  </div>
                </div>
              </button>

              {/* Selection Officer Card */}
              <button
                type="button"
                onClick={() => void handleDemoClick(Role.SELECTION_OFFICER)}
                className="flex items-start gap-2.5 p-2.5 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 text-left transition group cursor-pointer"
              >
                <div className="w-7 h-7 rounded bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition">
                  <Award className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800">
                    Shri Rajeshwar Meena
                  </div>
                  <div className="text-[10px] text-blue-700 font-medium truncate">
                    Selection Committee & DBT
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    selection@mota.gov.in
                  </div>
                </div>
              </button>

              {/* Admin Card */}
              <button
                type="button"
                onClick={() => void handleDemoClick(Role.ADMIN)}
                className="flex items-start gap-2.5 p-2.5 rounded-lg border border-purple-200 bg-purple-50/60 hover:bg-purple-100/80 text-left transition group cursor-pointer"
              >
                <div className="w-7 h-7 rounded bg-purple-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition">
                  <Settings className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-800">
                    MoTA Administrator
                  </div>
                  <div className="text-[10px] text-purple-700 font-medium truncate">
                    Rules DSL & System Audit
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono">
                    admin@mota.gov.in
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
