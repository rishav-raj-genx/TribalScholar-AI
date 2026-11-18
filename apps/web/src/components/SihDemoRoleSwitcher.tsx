'use client';

import React, { useState } from 'react';
import { Role } from '@tribalscholar/shared';
import { DEMO_PERSONAS, useAuth } from '../context/AuthContext';
import { resetDemoState } from '../lib/api';
import {
  UserCheck,
  ShieldAlert,
  Award,
  Settings,
  LogOut,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

interface PersonaButtonConfig {
  role: Role;
  label: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  colorActive: string;
  colorInactive: string;
}

const BUTTON_CONFIGS: PersonaButtonConfig[] = [
  {
    role: Role.APPLICANT,
    label: 'Scholar (Applicant)',
    badge: 'Birsa Munda',
    icon: UserCheck,
    colorActive: 'bg-emerald-600 text-white ring-2 ring-emerald-400',
    colorInactive: 'bg-emerald-950/60 text-emerald-200 hover:bg-emerald-900 border border-emerald-700/50',
  },
  {
    role: Role.SCRUTINY_OFFICER,
    label: 'Scrutiny Officer',
    badge: 'Dr. Sunita Toppo',
    icon: ShieldAlert,
    colorActive: 'bg-amber-600 text-white ring-2 ring-amber-400',
    colorInactive: 'bg-amber-950/60 text-amber-200 hover:bg-amber-900 border border-amber-700/50',
  },
  {
    role: Role.SELECTION_OFFICER,
    label: 'Selection Officer',
    badge: 'Shri R. Meena',
    icon: Award,
    colorActive: 'bg-blue-600 text-white ring-2 ring-blue-400',
    colorInactive: 'bg-blue-950/60 text-blue-200 hover:bg-blue-900 border border-blue-700/50',
  },
  {
    role: Role.ADMIN,
    label: 'System Admin',
    badge: 'MoTA Admin',
    icon: Settings,
    colorActive: 'bg-purple-600 text-white ring-2 ring-purple-400',
    colorInactive: 'bg-purple-950/60 text-purple-200 hover:bg-purple-900 border border-purple-700/50',
  },
];

export function SihDemoRoleSwitcher(): React.JSX.Element {
  const { user, switchRoleDemo, logout, isLoading } = useAuth();
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const handleResetDemo = async (): Promise<void> => {
    const confirmed = window.confirm(
      'Reset TribalScholar AI database and storage to pristine SIH 2026 jury state?\n\n' +
        'This will reset:\n' +
        '• Schemes: NFST v1 (Published, 750 slots), NOS v1 (Published, 100 slots)\n' +
        '• 5 Workflow Applications (DRAFT, UNDER_SCRUTINY, DEFICIENCY_RAISED, PROVISIONALLY_SELECTED, NOS OVERSEAS)\n' +
        '• 4 Standard Demo Users (Scholar, Scrutiny Officer, Selection Officer, Admin)'
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsResetting(true);
      const res = await resetDemoState();
      alert(
        `Demo environment successfully reset in ${res.durationMs}ms!\n\n` +
          `• Applications: ${res.counts.applications}\n` +
          `• Documents: ${res.counts.documents}\n` +
          `• Open Deficiencies: ${res.counts.deficiencies}\n` +
          `• Selected / DBT: ${res.counts.postSelectionRecords}`
      );
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error during demo reset';
      alert(`Demo reset failed: ${msg}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <aside aria-label="SIH Jury Demonstration Persona Switcher" className="w-full bg-slate-900 border-b border-slate-700/80 text-white text-xs px-3 py-2 z-50 sticky top-0 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Left: Hackathon Jury Demo Indicator */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-semibold tracking-wide uppercase px-2 py-0.5 rounded bg-gradient-to-r from-orange-600 via-amber-500 to-green-600 text-white shadow-sm text-[11px]">
            <Sparkles className="w-3.5 h-3.5" />
            SIH 2026 Jury Demo Bar
          </span>
          <span className="hidden md:inline text-slate-400">
            One-Click Role Switcher:
          </span>
        </div>

        {/* Center: 4 Demo Persona Quick Switch Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {BUTTON_CONFIGS.map((config) => {
            const isActive = user?.role === config.role;
            const Icon = config.icon;
            const persona = DEMO_PERSONAS[config.role];

            return (
              <button
                key={config.role}
                type="button"
                disabled={isLoading || isResetting}
                onClick={() => {
                  void switchRoleDemo(config.role);
                }}
                title={`Switch to ${persona.name} (${persona.designation})`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer shadow-sm disabled:opacity-50 ${
                  isActive ? config.colorActive : config.colorInactive
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-semibold">{config.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isActive ? 'bg-black/25 text-white' : 'bg-black/35 text-slate-300'
                  }`}
                >
                  {config.badge}
                </span>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Reset Demo State & Active user state & Sign out */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            disabled={isResetting || isLoading}
            onClick={handleResetDemo}
            title="Reset Database & S3 Storage to Pristine SIH Demo State (<2s)"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-950/80 hover:bg-rose-900 text-rose-200 hover:text-white border border-rose-700/60 font-medium text-[11px] transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-rose-400' : ''}`} />
            <span>{isResetting ? 'Resetting...' : 'Reset Demo State'}</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <div className="font-medium text-slate-200 leading-tight">
                  {user.fullName}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">
                  {user.role}
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <span className="text-slate-400 italic text-[11px]">
              Not signed in (select persona above)
            </span>
          )}
        </div>
      </div>
    </aside>
  );
}
