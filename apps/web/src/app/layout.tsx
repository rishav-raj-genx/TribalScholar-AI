import './globals.css';
import type { Metadata } from 'next';
import React, { type ReactNode } from 'react';
import { AuthProvider } from '../context/AuthContext';
import { SihDemoRoleSwitcher } from '../components/SihDemoRoleSwitcher';

export const metadata: Metadata = {
  title: 'TribalScholar AI | Ministry of Tribal Affairs (SIH 2026)',
  description:
    'AI-Enabled Scholarship and Fellowship Operations Platform for Scheduled Tribes. Built for Smart India Hackathon 2026 (Problem Statement SIH26239).',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex flex-col antialiased">
        <AuthProvider>
          {/* Top Sticky SIH Jury Demo Role Switcher */}
          <SihDemoRoleSwitcher />
          {/* Page Content */}
          <div className="flex-1 flex flex-col">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
