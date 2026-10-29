import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import { UserNav } from '@/components/UserNav';

export const metadata: Metadata = {
  title: 'Antigravity Harness Builder',
  description: 'Générateur officiel de harnais de développement pour Google Antigravity',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <a href="/" className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                  AG
                </span>
                <span className="font-semibold text-slate-900 text-lg tracking-tight">
                  Antigravity Harness Builder
                </span>
              </a>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                v0.1.0
              </span>
            </div>

            <nav className="flex items-center space-x-4 text-sm font-medium">
              <a href="/projects" className="text-slate-600 hover:text-slate-900 transition-colors">
                Projets
              </a>
              <a href="/projects/new" className="text-slate-600 hover:text-slate-900 transition-colors">
                Nouveau Harnais
              </a>
              <a href="/admin/ecc-sync" className="text-slate-600 hover:text-slate-900 transition-colors">
                Catalogue
              </a>
              <UserNav />
            </nav>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      </body>
    </html>
  );
}
