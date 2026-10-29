'use client';

import React, { useEffect, useState } from 'react';

interface EccSyncRecord {
  id: string;
  commitSha: string;
  versionTag: string;
  status: 'IN_PROGRESS' | 'VALID' | 'FAILED';
  isActiveCatalog: boolean;
  componentCount: number;
  catalogSha256: string;
  errorDetails?: { code?: string; message?: string } | null;
  syncedAt: string;
}

export default function EccAdminSyncPage() {
  const [activeCatalog, setActiveCatalog] = useState<EccSyncRecord | null>(null);
  const [history, setHistory] = useState<EccSyncRecord[]>([]);
  const [totalComponents, setTotalComponents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalogData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/ecc');
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur de chargement');
      }
      setActiveCatalog(data.activeCatalog);
      setHistory(data.history || []);
      setTotalComponents(data.totalActiveComponents || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogData();
  }, []);

  const handleTriggerSync = async () => {
    if (!confirm('Déclencher la synchronisation des sources (affaan-m/ECC + emilkowalski/skills) depuis GitHub ?')) return;

    setError(null);
    setMessage(null);
    setSyncing(true);

    try {
      const res = await fetch('/api/admin/ecc/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeEmilKowalskiSkills: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la synchronisation');

      setMessage(`Synchronisation réussie ! ${data.componentCount} composants indexés depuis GitHub (ECC + emilkowalski/skills).`);
      await fetchCatalogData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  if (loading && !activeCatalog) {
    return <div className="text-center py-16 text-slate-500">Chargement de l état du catalogue...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Catalogue — Diagnostic & Synchronisation des Sources
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestion des bibliothèques de référence <code>affaan-m/ECC</code> et <code>emilkowalski/skills</code> avec conformité Antigravity.
          </p>
        </div>

        <button
          onClick={handleTriggerSync}
          disabled={syncing}
          className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm shadow-sm transition-colors"
        >
          {syncing ? 'Synchronisation en cours...' : 'Synchroniser les sources'}
        </button>
      </div>

      {/* Sources intégrées */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm">affaan-m/ECC</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">Catalogue Général</span>
          </div>
          <p className="text-xs text-slate-500">
            Socle d&apos;ingénierie logicielle : règles TypeScript/SQL/Testing, sous-agents d&apos;architecture et workflows convertis.
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm">emilkowalski/skills</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">Design Engineering</span>
          </div>
          <p className="text-xs text-slate-500">
            Excellence UI & Motion : micro-interactions, animations GPU fluides, polish d&apos;interface et transitions naturelles.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* État du catalogue actif */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Catalogue Actif en Production</h2>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            ✓ Opérationnel
          </span>
        </div>

        {activeCatalog ? (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Version Tag</span>
              <span className="text-sm font-bold text-slate-900">{activeCatalog.versionTag}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Commit Git SHA</span>
              <code className="text-xs font-mono font-bold text-slate-800 select-all">
                {activeCatalog.commitSha.slice(0, 10)}
              </code>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Composants Indexés</span>
              <span className="text-sm font-bold text-indigo-600">
                {activeCatalog.componentCount || totalComponents} composants
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Dernière Synchronisation</span>
              <span className="text-xs font-medium text-slate-700">
                {new Date(activeCatalog.syncedAt).toLocaleString('fr-FR')}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Aucun catalogue actif. Cliquez sur "Synchroniser depuis GitHub" pour initialiser.
          </p>
        )}
      </div>

      {/* Historique des synchronisations */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Historique des Synchronisations</h2>

        {history.length === 0 ? (
          <p className="text-xs text-slate-500">Aucun historique de synchronisation enregistré.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Statut</th>
                  <th className="py-2.5 px-3">Commit</th>
                  <th className="py-2.5 px-3">Composants</th>
                  <th className="py-2.5 px-3">Actif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-sans text-slate-700">
                      {new Date(h.syncedAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-sans font-semibold ${
                          h.status === 'VALID'
                            ? 'bg-emerald-50 text-emerald-700'
                            : h.status === 'IN_PROGRESS'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">{h.commitSha.slice(0, 8)}</td>
                    <td className="py-2.5 px-3 text-slate-700 font-sans">{h.componentCount}</td>
                    <td className="py-2.5 px-3 font-sans">
                      {h.isActiveCatalog ? (
                        <span className="text-emerald-600 font-bold">OUI</span>
                      ) : (
                        <span className="text-slate-400">Non</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
