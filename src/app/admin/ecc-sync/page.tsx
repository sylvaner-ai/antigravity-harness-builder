'use client';

import { useEffect, useState } from 'react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ToastNotification from '@/components/ui/ToastNotification';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
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
    setConfirmOpen(true);
  };

  const executeSync = async () => {
    setError(null);
    setSyncing(true);

    try {
      const res = await fetch('/api/admin/ecc/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeEmilKowalskiSkills: true,
          includeSuperpowersSkills: true,
          includeCloudflareSecuritySkills: true,
          includePonytailSkills: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la synchronisation');

      setToast({
        message: `Catalogue synchronisé : ${data.componentCount} composants indexés.`,
        type: 'success',
      });
      await fetchCatalogData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de synchronisation';
      setError(msg);
      setToast({ message: msg, type: 'error' });
    } finally {
      setSyncing(false);
      setConfirmOpen(false);
    }
  };

  if (loading && !activeCatalog) {
    return <div className="text-center py-16 text-slate-400 text-sm">Chargement du catalogue...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Catalogue de Référence Multi-Sources</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronisation des 5 dépôts officiels certifiés : ECC, Emil Kowalski, Superpowers, Cloudflare &amp; Ponytail.
          </p>
        </div>

        <button
          onClick={handleTriggerSync}
          disabled={syncing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 text-white font-medium rounded-lg text-sm shadow-xs transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Synchronisation...' : 'Synchroniser depuis GitHub'}</span>
        </button>
      </div>

      {/* Sources intégrées */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-sm">affaan-m/ECC</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
              Général
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Règles de code, sous-agents (architecte, reviewer) et workflows d&apos;ingénierie.
          </p>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-sm">emilkowalski/skills</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
              Design Craft
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Micro-interactions, fluidité GPU, finitions d&apos;interface et transitions naturelles.
          </p>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-sm">obra/superpowers</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
              Discipline SDLC
            </span>
          </div>
          <p className="text-xs text-slate-500">
            TDD rigoureux (red-green-refactor), brainstorming, git worktrees et revue croisée.
          </p>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-sm">cloudflare/security</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
              Audit Sécurité
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Chasse aux vulnérabilités en 6 phases avec sous-agent contradictoire et zéro faux positif.
          </p>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-900 text-sm">dietrichgebert/ponytail</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
              Anti-Overengineering
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Pragmatisme YAGNI, limitation stricte de la complexité et audits de dette technique.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* État du catalogue actif */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Catalogue Actif</h2>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Opérationnel
          </span>
        </div>

        {activeCatalog ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-400 block">Version Tag</span>
              <span className="text-xs font-bold text-slate-900">{activeCatalog.versionTag}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-400 block">Commit Git</span>
              <code className="text-xs font-mono font-bold text-slate-800 select-all">
                {activeCatalog.commitSha.slice(0, 10)}
              </code>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-400 block">Composants Indexés</span>
              <span className="text-xs font-bold text-indigo-600">
                {activeCatalog.componentCount || totalComponents} composants
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-400 block">Dernière Synchronisation</span>
              <span className="text-xs font-medium text-slate-700">
                {new Date(activeCatalog.syncedAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Aucun catalogue actif. Cliquez sur "Synchroniser depuis GitHub" pour initialiser.
          </p>
        )}
      </div>

      {/* Historique des synchronisations */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Historique des Versions</h2>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400">Aucun historique disponible.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Statut</th>
                  <th className="py-2 px-3">Commit</th>
                  <th className="py-2 px-3">Composants</th>
                  <th className="py-2 px-3">Actif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-sans text-slate-700">
                      {new Date(h.syncedAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-sans font-semibold ${
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
                    <td className="py-2 px-3 text-slate-800">{h.commitSha.slice(0, 8)}</td>
                    <td className="py-2 px-3 text-slate-700 font-sans">{h.componentCount}</td>
                    <td className="py-2 px-3 font-sans">
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

      {/* Modale de confirmation accessible */}
      <ConfirmModal
        isOpen={confirmOpen}
        title="Synchroniser les sources depuis GitHub ?"
        message="Les 5 sources officielles (ECC, Emil Kowalski, Superpowers, Cloudflare Security et Ponytail) seront téléchargées et réindexées en base."
        confirmText="Lancer la synchronisation"
        loading={syncing}
        onConfirm={executeSync}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Toast Notification */}
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
