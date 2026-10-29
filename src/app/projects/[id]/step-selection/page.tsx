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

      {/* Composants sur mesure synthétisés */}
      {(selection?.customComponents || []).length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <span>Composants Sur Mesure Synthétisés</span>
            <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-normal">
              Besoin non couvert par ECC
            </span>
          </h3>

          <div className="space-y-3">
            {selection?.customComponents?.map((custom) => (
              <div key={custom.slug} className="p-4 rounded-lg bg-indigo-50/40 border border-indigo-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{custom.name}</span>
                  <span className="text-indigo-600 font-mono">{custom.slug}</span>
                </div>
                <p className="text-slate-600">
                  <strong>Raison du besoin :</strong> {custom.gapReason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidats écartés avec justifications */}
      {(selection?.rejectedComponents || []).length > 0 && (
        <details className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <summary className="text-sm font-semibold text-slate-700 cursor-pointer">
            Voir les candidats écartés avec leurs motifs ({selection?.rejectedComponents?.length || 0})
          </summary>

          <div className="space-y-2 pt-4">
            {selection?.rejectedComponents?.slice(0, 15).map((rej) => (
              <div
                key={rej.slug}
                className="p-3 rounded bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-slate-800">{rej.name}</span>
                  <span className="text-slate-400 font-mono ml-2">({rej.slug})</span>
                  <p className="text-slate-500 mt-0.5">{rej.rejectedRationale}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUserIncludes([...userIncludes, rej.slug]);
                    calculateSelection();
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium shrink-0 ml-4"
                >
                  + Forcer l inclusion
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

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
