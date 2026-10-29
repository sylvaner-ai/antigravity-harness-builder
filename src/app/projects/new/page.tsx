'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetSurface, setTargetSurface] = useState<'APP' | 'IDE' | 'CLI'>('IDE');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (!d.user) {
          window.location.href = '/login';
        } else {
          setCheckingAuth(false);
        }
      })
      .catch(() => {
        window.location.href = '/login';
      });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, targetSurface }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');

      router.push(`/projects/${data.project.id}/step-import`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return <div className="text-center py-16 text-slate-500">Vérification de l authentification...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Étape 1 — Nouveau Projet Antigravity</h1>
        <p className="text-sm text-slate-500 mt-1">
          Définissez les caractéristiques fondamentales et la surface cible de votre futur harnais.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nom du projet <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Acme B2B Portal"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Description succincte
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Objectifs principaux, technologies envisagées ou contraintes fortes..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Surface Google Antigravity ciblée
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'IDE',
                title: 'Antigravity IDE',
                desc: 'Intégration directe dans l éditeur de code et agents sidecar.',
              },
              {
                id: 'APP',
                title: 'Antigravity App',
                desc: 'Application autonome et orchestration plein écran.',
              },
              {
                id: 'CLI',
                title: 'Antigravity CLI (agy)',
                desc: 'Pilotage en ligne de commande pour terminaux et CI/CD.',
              },
            ].map((surface) => (
              <label
                key={surface.id}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  targetSurface === surface.id
                    ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-slate-900">{surface.title}</span>
                    <input
                      type="radio"
                      name="targetSurface"
                      value={surface.id}
                      checked={targetSurface === surface.id}
                      onChange={() => setTargetSurface(surface.id as any)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500">{surface.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium shadow-sm"
          >
            {loading ? 'Création...' : 'Créer et Importer les Documents →'}
          </button>
        </div>
      </form>
    </div>
  );
}
