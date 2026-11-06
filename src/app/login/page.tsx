'use client';

import React, { useEffect, useState } from 'react';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [registrationAllowed, setRegistrationAllowed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/config')
      .then((r) => r.json())
      .then((c) => setRegistrationAllowed(c.registrationAllowed === true))
      .catch(() => setRegistrationAllowed(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur d authentification');
      }

      window.location.href = '/projects';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur inattendue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {isRegister ? 'Créer un compte' : 'Connexion'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isRegister
            ? 'Rejoignez Antigravity Harness Builder'
            : 'Accédez à vos projets de génération de harnais'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Adresse email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="dev@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Mot de passe
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm shadow-sm transition-colors"
        >
          {loading ? 'Chargement...' : isRegister ? 'Créer mon compte' : 'Se connecter'}
        </button>
      </form>

      {registrationAllowed && (
        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {isRegister
              ? 'Vous possédez déjà un compte ? Connectez-vous'
              : 'Pas encore de compte ? Créer un compte'}
          </button>
        </div>
      )}
    </div>
  );
}
