'use client';

import { useEffect, useState } from 'react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ToastNotification from '@/components/ui/ToastNotification';
import { RefreshCw, Plus, Search, Power, GitCommit, Trash2, ExternalLink } from 'lucide-react';
import type { CatalogSourceAnalysis, SyncedSourceSnapshot } from '@/modules/ecc-catalog/catalog-sources';

interface SourceRow {
  id: string;
  name: string;
  owner: string;
  repo: string;
  pinnedCommit: string;
  license: string;
  role: 'BASE_LIBRARY' | 'SPECIALIST' | 'METHODOLOGY' | 'CURATED';
  priority: number;
  status: 'PENDING' | 'ACTIVE' | 'DISABLED';
  analysis: CatalogSourceAnalysis | null;
}

interface SyncRow {
  id: string;
  commitSha: string;
  versionTag: string;
  status: 'IN_PROGRESS' | 'VALID' | 'FAILED';
  isActiveCatalog: boolean;
  componentCount: number;
  errorDetails?: { message?: string } | null;
  sources: SyncedSourceSnapshot[];
  syncedAt: string;
}

const ROLE_LABELS: Record<SourceRow['role'], string> = {
  BASE_LIBRARY: 'Bibliothèque de base',
  SPECIALIST: 'Spécialisée',
  METHODOLOGY: 'Méthodologie',
  CURATED: 'Composants maison',
};

const STATUS_STYLES: Record<SourceRow['status'], { label: string; cls: string }> = {
  ACTIVE: { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PENDING: { label: 'En attente', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  DISABLED: { label: 'Désactivée', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const formatDate = (d: string) =>
  new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

async function callApi<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Session expirée.');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur inattendue.');
  return data as T;
}

function AnalysisSummary({ a, pinnedCommit }: { a: CatalogSourceAnalysis | null; pinnedCommit: string }) {
  if (!a) return <p className="text-xs text-slate-500">Pas encore analysée sur ce commit.</p>;
  const stale = a.commitSha !== pinnedCommit;
  return (
    <div className="space-y-1.5 text-xs text-slate-600">
      <p>
        <strong className={a.verdict === 'READY' ? 'text-emerald-700' : 'text-rose-700'}>
          {a.verdict === 'READY' ? 'Analyse favorable' : 'Analyse défavorable'}
        </strong>{' '}
        · {formatDate(a.analyzedAt)}
        {stale && <span className="text-amber-700"> · faite sur un autre commit</span>}
      </p>
      <p>
        {a.counts.RULE} règle(s), {a.counts.SKILL + a.counts.COMMAND_CONVERTED} skill(s), {a.counts.SUBAGENT} sous-agent(s) ·{' '}
        <strong>{a.usable} utilisable(s)</strong>, dont {a.autoSelectable} retenable(s) automatiquement
        {a.duplicates.length > 0 && <> · {a.duplicates.length} nom(s) déjà fourni(s) par une autre source</>}
        {a.blockedUnsafe.length > 0 && <> · {a.blockedUnsafe.length} bloqué(s) pour sûreté</>}
        {a.claudeSpecific > 0 && <> · {a.claudeSpecific} propre(s) à Claude Code</>}
      </p>
      {a.usable > a.autoSelectable && (
        <p className="text-slate-500">
          Les autres composants utilisables n&apos;ont pas de fonction connue du moteur : ils restent sélectionnables à la main à l&apos;étape Composition.
        </p>
      )}
      {a.reasons.map((r) => (
        <p key={r} className="text-rose-700">{r}</p>
      ))}
      {a.duplicates.length > 0 && (
        <details>
          <summary className="cursor-pointer text-slate-500 hover:text-slate-700">Voir les noms en double</summary>
          <p className="mt-1 font-mono text-[11px] text-slate-500 break-words">{a.duplicates.join(', ')}</p>
        </details>
      )}
    </div>
  );
}

export default function CatalogAdminPage() {
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [history, setHistory] = useState<SyncRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; message: string; action: () => Promise<void> } | null>(null);

  const [repository, setRepository] = useState('');
  const [ref, setRef] = useState('');
  const [role, setRole] = useState<'SPECIALIST' | 'METHODOLOGY' | 'BASE_LIBRARY'>('SPECIALIST');
  const [repinFor, setRepinFor] = useState<string | null>(null);
  const [repinRef, setRepinRef] = useState('');

  const load = async () => {
    try {
      setLoadError(null);
      const data = await callApi<{ sources: SourceRow[]; history: SyncRow[] }>('/api/admin/catalog');
      setSources(data.sources);
      setHistory(data.history);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const run = async (key: string, fn: () => Promise<string>) => {
    setBusy(key);
    try {
      setToast({ message: await fn(), type: 'success' });
      await load();
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Erreur.', type: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const sourceAction = (id: string, body: Record<string, string>, done: string) =>
    run(`${id}:${body.action}`, async () => {
      await callApi(`/api/admin/catalog/sources/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
      return done;
    });

  const addSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repository.trim()) return;
    run('add', async () => {
      const { source } = await callApi<{ source: SourceRow }>('/api/admin/catalog/sources', {
        method: 'POST',
        body: JSON.stringify({ repository, ref: ref.trim() || undefined, role }),
      });
      setRepository('');
      setRef('');
      return source.analysis?.verdict === 'READY'
        ? `${source.name} ajouté et analysé : vous pouvez l’activer.`
        : `${source.name} ajouté, mais l’analyse est défavorable.`;
    });
  };

  const synchronize = () =>
    setConfirm({
      title: 'Reconstruire le catalogue ?',
      message:
        'Les sources actives sont téléchargées sur leur commit figé puis indexées. Le catalogue actuel reste en service si la synchronisation échoue.',
      action: async () => {
        setConfirm(null);
        await run('sync', async () => {
          const r = await callApi<{ componentCount: number; sources: SyncedSourceSnapshot[] }>('/api/admin/catalog/sync', { method: 'POST' });
          const failed = r.sources.filter((s) => s.error).length;
          return `Catalogue reconstruit : ${r.componentCount} composants${failed ? `, ${failed} source(s) en échec` : ''}.`;
        });
      },
    });

  const active = history.find((h) => h.isActiveCatalog) ?? null;
  const activeCount = sources.filter((s) => s.status === 'ACTIVE').length;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4" aria-busy="true">
        <div className="h-8 w-72 bg-slate-200 rounded animate-pulse" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto text-center py-12 bg-white rounded-xl border border-slate-200 p-8 space-y-3">
        <p className="text-sm text-rose-700">{loadError}</p>
        <button onClick={() => { setLoading(true); load(); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg">
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Catalogue de composants</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeCount} source(s) active(s) sur {sources.length}. Une source n&apos;entre au catalogue qu&apos;après analyse, activation puis reconstruction.
          </p>
        </div>
        <button
          onClick={synchronize}
          disabled={busy !== null || activeCount === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${busy === 'sync' ? 'animate-spin' : ''}`} />
          <span>{busy === 'sync' ? 'Reconstruction…' : 'Reconstruire le catalogue'}</span>
        </button>
      </div>

      <form onSubmit={addSource} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Ajouter un dépôt GitHub</h2>
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-2.5">
          <input
            aria-label="Dépôt GitHub"
            placeholder="propriétaire/dépôt ou https://github.com/…"
            value={repository}
            onChange={(e) => setRepository(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            aria-label="Branche, étiquette ou commit"
            placeholder="Commit (défaut : branche principale)"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            aria-label="Rôle de la source"
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          >
            <option value="SPECIALIST">Spécialisée</option>
            <option value="METHODOLOGY">Méthodologie</option>
            <option value="BASE_LIBRARY">Bibliothèque de base</option>
          </select>
          <button
            type="submit"
            disabled={busy !== null || !repository.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
          >
            {busy === 'add' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>{busy === 'add' ? 'Analyse…' : 'Ajouter et analyser'}</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          Le commit est figé à l&apos;ajout. L&apos;analyse vérifie la licence, compte les composants détectables, repère les doublons avec les
          sources actives et bloque les contenus dangereux.
        </p>
      </form>

      <div className="space-y-3">
        {sources.length === 0 && (
          <p className="text-center text-sm text-slate-500 py-8 bg-white rounded-xl border border-dashed border-slate-200">
            Aucune source enregistrée : ajoutez un dépôt ci-dessus.
          </p>
        )}
        {sources.map((s) => {
          const st = STATUS_STYLES[s.status];
          return (
            <div key={s.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{s.name}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    <a href={`https://github.com/${s.owner}/${s.repo}/tree/${s.pinnedCommit}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-indigo-700">
                      {s.owner}/{s.repo}@<code className="font-mono">{s.pinnedCommit.slice(0, 7)}</code>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>{' '}
                    · {ROLE_LABELS[s.role]} · priorité {s.priority} · licence {s.license}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => sourceAction(s.id, { action: 'analyze' }, `${s.name} réanalysée.`)}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg text-xs font-medium text-slate-700"
                  >
                    <Search className="w-3.5 h-3.5" aria-hidden="true" />
                    {busy === `${s.id}:analyze` ? 'Analyse…' : 'Analyser'}
                  </button>
                  <button
                    onClick={() =>
                      s.status === 'ACTIVE'
                        ? sourceAction(s.id, { action: 'disable' }, `${s.name} désactivée : reconstruisez le catalogue pour l’en retirer.`)
                        : sourceAction(s.id, { action: 'activate' }, `${s.name} activée : reconstruisez le catalogue pour l’intégrer.`)
                    }
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg text-xs font-medium text-slate-700"
                  >
                    <Power className="w-3.5 h-3.5" aria-hidden="true" />
                    {s.status === 'ACTIVE' ? 'Désactiver' : 'Activer'}
                  </button>
                  <button
                    onClick={() => { setRepinFor(repinFor === s.id ? null : s.id); setRepinRef(''); }}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg text-xs font-medium text-slate-700"
                  >
                    <GitCommit className="w-3.5 h-3.5" aria-hidden="true" />
                    Changer de commit
                  </button>
                  {s.status !== 'ACTIVE' && (
                    <button
                      aria-label={`Supprimer ${s.name}`}
                      onClick={() =>
                        setConfirm({
                          title: `Supprimer ${s.name} ?`,
                          message: 'La source est retirée de la liste. Les catalogues déjà construits ne changent pas.',
                          action: async () => {
                            setConfirm(null);
                            await run(`${s.id}:delete`, async () => {
                              await callApi(`/api/admin/catalog/sources/${encodeURIComponent(s.id)}`, { method: 'DELETE' });
                              return `${s.name} supprimée.`;
                            });
                          },
                        })
                      }
                      disabled={busy !== null}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              {repinFor === s.id && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!repinRef.trim()) return;
                    setRepinFor(null);
                    sourceAction(s.id, { action: 'repin', ref: repinRef }, `${s.name} figée sur le nouveau commit et réanalysée : réactivez-la si l’analyse est favorable.`);
                  }}
                  className="flex flex-col sm:flex-row gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <input
                    aria-label="Nouveau commit, branche ou étiquette"
                    placeholder="SHA, branche ou étiquette (ex. main, v3.0.0)"
                    value={repinRef}
                    onChange={(e) => setRepinRef(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                  />
                  <button type="submit" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium">
                    Figer et réanalyser
                  </button>
                </form>
              )}

              <AnalysisSummary a={s.analysis} pinnedCommit={s.pinnedCommit} />
            </div>
          );
        })}
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Catalogue en service</h2>
        {active ? (
          <>
            <p className="text-xs text-slate-600">
              {active.componentCount} composants · construit le {formatDate(active.syncedAt)}
            </p>
            {active.sources.length > 0 ? (
              <ul className="text-xs text-slate-600 space-y-1">
                {active.sources.map((src) => (
                  <li key={src.id}>
                    <strong className="text-slate-800">{src.name}</strong> — {src.owner}/{src.repo}@
                    <code className="font-mono">{src.commitSha.slice(0, 7)}</code> · {src.license} ·{' '}
                    {src.error ? <span className="text-rose-700">échec : {src.error}</span> : `${src.componentCount} composant(s)`}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-amber-800">Catalogue construit avant l&apos;enregistrement des sources : reconstruisez-le pour voir leur détail.</p>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-500">Aucun catalogue en service : cliquez sur « Reconstruire le catalogue ».</p>
        )}
      </div>

      {history.length > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Historique</h2>
          <ul className="text-xs text-slate-600 divide-y divide-slate-100">
            {history.map((h) => (
              <li key={h.id} className="py-1.5 flex flex-wrap gap-x-3">
                <span>{formatDate(h.syncedAt)}</span>
                <span className={h.status === 'FAILED' ? 'text-rose-700' : h.isActiveCatalog ? 'text-emerald-700 font-medium' : ''}>
                  {h.status === 'FAILED' ? `Échec : ${h.errorDetails?.message ?? 'inconnu'}` : h.isActiveCatalog ? 'En service' : 'Remplacé'}
                </span>
                {h.status !== 'FAILED' && <span>{h.componentCount} composants</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConfirmModal
        isOpen={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmText="Confirmer"
        variant="primary"
        loading={busy !== null}
        onConfirm={async () => { await confirm?.action(); }}
        onCancel={() => setConfirm(null)}
      />
      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
