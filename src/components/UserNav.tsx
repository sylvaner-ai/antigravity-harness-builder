'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function UserNav() {
  const [user, setUser] = useState<{ email: string; role: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) setUser(d.user);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center justify-center px-3 py-1.5 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
      >
        Connexion
      </Link>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <span className="text-xs text-slate-500 hidden sm:inline">
        {user.email} <span className="text-indigo-600 font-semibold">({user.role})</span>
      </span>
      <button
        onClick={handleLogout}
        className="inline-flex items-center justify-center px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
      >
        Déconnexion
      </button>
    </div>
  );
}
