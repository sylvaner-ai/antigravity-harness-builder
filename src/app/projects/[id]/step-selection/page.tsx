'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PresetMode, SelectionResult } from '../../../../modules/selection-engine/schema';

export default function StepSelectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();

  const [preset, setPreset] = useState<PresetMode>('BALANCED');
  const [selection, setSelection] = useState<SelectionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userIncludes, setUserIncludes] = useState<string[]>([]);
  const [userExcludes, setUserExcludes] = useState<string[]>([]);

  // Filtres et exploration des candidats écartés
  const [rejectedSearch, setRejectedSearch] = useState('');
  const [rejectedKindFilter, setRejectedKindFilter] = useState<'ALL' | 'RULE' | 'SUBAGENT' | 'SKILL' | 'COMMAND_CONVERTED'>('ALL');
  const [rejectedDisplayLimit, setRejectedDisplayLimit] = useState(25);

  // Simulation / Pré-calcul de la sélection
  const calculateSelection = async () => {
    try {
      setLoading(true);
      // On lance la génération pour récupérer l'état de sélection
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetMode: preset, userIncludes, userExcludes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la sélection');

      setSelection(data.selection);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de calcul');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateSelection();
  }, [projectId, preset]);

  const handleGenerateAndProceed = async () => {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetMode: preset, userIncludes, userExcludes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l assemblage du harnais');

      router.push(`/projects/${projectId}/step-preview`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setGenerating(false);
    }
  };

  if (loading && !selection) {
    return <div className="text-center py-16 text-slate-500">Calcul du harnais optimal selon la stack...</div>;
  }

  const budgetPercent = selection?.budgetCompliance?.rulesBudgetPercent || 0;
  const isBudgetWarning = budgetPercent > 90;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Fil d'Ariane des étapes */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 text-xs font-semibold">
        <span className="text-slate-400">1. Import des Documents</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-400">2. Profil Extrait & Épistémique</span>
        <span className="text-slate-300">→</span>
        <span className="text-indigo-600 font-bold">3. Composition du Harnais</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-400">4. Prévisualisation & Code</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-400">5. Téléchargement</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Étape 4 — Composition du Harnais Antigravity</h1>
          <p className="text-sm text-slate-500 mt-1">
            Sélection multicritère explicable, gestion des quotas de règles et rôles multi-agents.
          </p>
        </div>

        {/* Sélecteur de preset */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          {(['MINIMAL', 'BALANCED', 'THOROUGH'] as PresetMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setPreset(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                preset === mode
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {mode === 'MINIMAL' ? 'Minimal' : mode === 'BALANCED' ? 'Équilibré' : 'Approfondi'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Jauge de Budget Tokens Always_on */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-sm font-semibold text-slate-900">Budget Quota Règles Always-On</span>
            <span className="text-xs text-slate-500 ml-2">
              (Limite officielle Antigravity : 20 000 tokens)
            </span>
          </div>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded ${
              isBudgetWarning ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {selection?.budgetCompliance?.rulesBudgetTokens || 0} / 20 000 tokens ({budgetPercent}%)
          </span>
        </div>

        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all ${
              isBudgetWarning ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, budgetPercent)}%` }}
          />
        </div>
      </div>

      {/* Composants sélectionnés */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">
            Composants Retenus ({selection?.selectedComponents?.length || 0})
          </h3>
          <span className="text-xs text-slate-400">Score de pertinence &gt;= seuil preset</span>
        </div>

        <div className="space-y-3">
          {selection?.selectedComponents?.map((comp) => (
            <div
              key={comp.slug}
              className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${
                      comp.kind === 'RULE'
                        ? 'bg-blue-100 text-blue-800'
                        : comp.kind === 'SUBAGENT'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {comp.kind}
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">{comp.name}</span>
                  <span className="text-slate-400 font-mono">({comp.slug})</span>
                </div>
                <p className="text-slate-600">
                  <strong>Justification :</strong> {comp.acceptedRationale}
                </p>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <span className="font-semibold px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Score : {comp.score?.totalScore}/100
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setUserExcludes([...userExcludes, comp.slug]);
                    calculateSelection();
                  }}
                  className="text-red-500 hover:text-red-700 font-medium"
                >
                  Exclure ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Composants Spécifiques au Projet (Générés Sur-Mesure) */}
      {(selection?.customComponents || []).length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-indigo-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <span>Composants Générés Sur-Mesure pour ce Projet</span>
                <span className="text-xs px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-medium">
                  {selection?.customComponents?.length} composant(s) synthétisé(s)
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                <strong>Pourquoi cette section ?</strong> Le catalogue communautaire ECC ne fournit que des composants génériques. À partir de votre cahier des charges et de votre design system, le générateur synthétise automatiquement des règles et tokens dédiés pour apporter à l&apos;agent Antigravity la connaissance approfondie de votre métier et de votre charte graphique.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {selection?.customComponents?.map((custom) => (
              <div key={custom.slug} className="p-4 rounded-lg bg-indigo-50/30 border border-indigo-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{custom.name}</span>
                  <span className="text-indigo-600 font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-indigo-100">{custom.slug}</span>
                </div>
                <p className="text-slate-600">
                  <strong className="text-slate-700">Rôle :</strong> {custom.gapReason}
                </p>
                <div className="text-[11px] text-indigo-800 bg-white/80 p-2 rounded border border-indigo-100/60 font-mono truncate">
                  Type: {custom.kind} • Cible: .antigravity/{custom.kind === 'RULE' ? 'rules' : custom.kind === 'SKILL' ? 'skills' : 'agents'}/{custom.slug}.md
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidats écartés avec justifications et exploration complète */}
      {(() => {
        const rejected = selection?.rejectedComponents || [];
        const filtered = rejected.filter((rej) => {
          if (rejectedKindFilter !== 'ALL' && rej.kind !== rejectedKindFilter) {
            return false;
          }
          if (rejectedSearch.trim()) {
            const q = rejectedSearch.toLowerCase().trim();
            const matchName = rej.name.toLowerCase().includes(q);
            const matchSlug = rej.slug.toLowerCase().includes(q);
            const matchRationale = rej.rejectedRationale.toLowerCase().includes(q);
            return matchName || matchSlug || matchRationale;
          }
          return true;
        });

        const displayed = filtered.slice(0, rejectedDisplayLimit);

        return (
          rejected.length > 0 && (
            <details className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4" open>
              <summary className="text-base font-semibold text-slate-900 cursor-pointer flex items-center justify-between">
                <span>Registre d&apos;Explicabilité : Candidats ECC écartés ({rejected.length})</span>
                <span className="text-xs font-normal text-indigo-600 hover:underline">
                  Cliquez pour replier / déplier
                </span>
              </summary>

              <p className="text-xs text-slate-500 pt-2">
                Chaque composant non retenu est consigné ci-dessous avec le motif précis de son rejet (incompatibilité de technologie, doublon fonctionnel ou quota du preset {preset}). Vous pouvez rechercher un composant ou forcer son inclusion manuelle.
              </p>

              {/* Barre de recherche et filtres de catégorie */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={rejectedSearch}
                    onChange={(e) => {
                      setRejectedSearch(e.target.value);
                      setRejectedDisplayLimit(25);
                    }}
                    placeholder="Filtrer par nom, slug ou motif (ex: python, vue, quota, doublon)..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 font-sans"
                  />
                  {rejectedSearch && (
                    <button
                      type="button"
                      onClick={() => setRejectedSearch('')}
                      className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 text-xs">
                  {(['ALL', 'SUBAGENT', 'RULE', 'SKILL', 'COMMAND_CONVERTED'] as const).map((k) => {
                    const count = k === 'ALL' ? rejected.length : rejected.filter((r) => r.kind === k).length;
                    const label = k === 'ALL' ? 'Tous' : k === 'SUBAGENT' ? 'Sous-agents' : k === 'RULE' ? 'Règles' : k === 'SKILL' ? 'Skills' : 'Commandes';
                    const active = rejectedKindFilter === k;

                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          setRejectedKindFilter(k);
                          setRejectedDisplayLimit(25);
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {label} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Compteur de résultats filtrés */}
              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>
                  Affichage de <strong>{displayed.length}</strong> sur <strong>{filtered.length}</strong> candidat(s) correspondant(s)
                </span>
                {filtered.length > rejectedDisplayLimit && (
                  <button
                    type="button"
                    onClick={() => setRejectedDisplayLimit(filtered.length)}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    Tout afficher ({filtered.length})
                  </button>
                )}
              </div>

              {/* Liste des cartes de candidats écartés */}
              <div className="space-y-2 pt-1 max-h-[600px] overflow-y-auto pr-1">
                {displayed.map((rej) => (
                  <div
                    key={rej.slug}
                    className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100/70 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{rej.name}</span>
                        <span className="text-slate-400 font-mono text-[11px]">({rej.slug})</span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                          {rej.kind}
                        </span>
                      </div>
                      <p className="text-slate-600">{rej.rejectedRationale}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setUserIncludes([...userIncludes, rej.slug]);
                        calculateSelection();
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 border border-indigo-200 rounded font-medium text-xs shrink-0 self-start sm:self-auto shadow-sm transition-colors"
                    >
                      + Forcer l&apos;inclusion
                    </button>
                  </div>
                ))}
              </div>

              {/* Bouton pagination si plus d'éléments */}
              {filtered.length > displayed.length && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setRejectedDisplayLimit((prev) => prev + 50)}
                    className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium border border-slate-300 transition-colors"
                  >
                    Afficher 50 candidats de plus ({filtered.length - displayed.length} restants)
                  </button>
                </div>
              )}
            </details>
          )
        );
      })()}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Link
          href={`/projects/${projectId}/step-profile`}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Retour au profil
        </Link>

        <button
          onClick={handleGenerateAndProceed}
          disabled={generating}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm shadow-sm transition-colors"
        >
          {generating ? 'Assemblage du harnais...' : 'Prévisualiser l Arborescence & les Fichiers →'}
        </button>
      </div>
    </div>
  );
}
