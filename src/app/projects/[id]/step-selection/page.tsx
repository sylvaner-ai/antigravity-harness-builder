'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PresetMode, SelectionResult } from '../../../../modules/selection-engine/schema';

// Descriptions claires et détaillées de ce que fait chaque composant
const ECC_DESCRIPTIONS_FR: Record<string, string> = {
  // Règles de développement et qualité
  'react-testing': 'Directives pour les tests de composants React (React Testing Library, Vitest/Jest, mocks MSW et couverture comportementale).',
  'typescript-testing': 'Standards de test TypeScript/JavaScript : typage strict des tests, fixtures, suites unitaires et assertions fiables.',
  'common-testing': 'Exigences fondamentales de test logiciel : isolation unitaire, couverture des cas limites et non-régression.',
  'common-code-review': 'Critères de revue de code : lisibilité, architecture, sécurité, gestion des erreurs et maintenabilité.',
  'common-security': 'Garde-fous impératifs de sécurité : prévention des injections, assainissement des entrées et gestion sécurisée des secrets.',
  'common-performance': 'Directives d’optimisation de performance transversale : requêtes économes, limitation des re-rendus et mise en cache.',
  'common-patterns': 'Design patterns recommandés et anti-patterns à proscrire pour garantir la modularité et l’évolutivité du code.',
  'common-git-workflow': 'Normes de versioning Git : commits conventionnels, organisation des branches et messages explicites.',
  'common-development-workflow': 'Cycle de développement local et qualité continue : validation progressive, linting et tests avant commit.',
  'arkts-testing': 'Standards de tests pour les applications ArkTS / OpenHarmony.',
  'react-native-coding-style': 'Conventions de style et patterns spécifiques à React Native mobile.',

  // Sous-agents spécialisés
  'architect': 'Architecte logiciel : conçoit l’architecture globale du système, évalue les arbitrages techniques et garantit la scalabilité.',
  'database-reviewer': 'Spécialiste PostgreSQL & SQL : optimise les schémas relationnels, les requêtes, index et stratégies de migration.',
  'code-reviewer': 'Revue de code senior : analyse la qualité, la maintenabilité, la lisibilité et la sécurité des modifications.',
  'build-error-resolver': 'Résolution de compilation : diagnostique et corrige les erreurs de build Next.js, imports cassés et erreurs de typage TypeScript.',

  // Skills & Commandes
  'codebase-onboarding': 'Cartographie et guide d’onboarding pour explorer rapidement une base de code et comprendre son architecture.',
  'react-build': 'Résolution incrémentale des échecs de build React (Vite, Next.js, webpack) et typages JSX/TSX.',

  // Skills de Design Engineering & Motion UI (Emil Kowalski)
  'emil-design-eng': 'Design Engineering UI : finitions d’interface, micro-interactions, cohérence des composants et détails invisibles qui rendent le logiciel agréable.',
  'animate': 'Conception d’animations web fluides et performantes (courbes cubic-bezier précises, durées < 300ms, transitions légères).',
  'animate-expo': 'Animations et micro-interactions React Native & Expo (gestes, haptiques et transitions d’écrans fluides).',
  'review-animations': 'Revue critique du motion design (audit anti-saccades, élimination des transitions lentes et des shifts de layout).',
  'improve-animations': 'Plan d’optimisation priorisé pour moderniser et fluidifier les animations existantes d’une application.',
  'animation-performance': 'Diagnostic et résolution des chutes de framerate (accélération GPU, optimisation des repaints).',
  'apple-design': 'Principes de design Apple adaptés au web : physique fluide, profondeur de matière et transitions naturelles.',
  'mobile-native': 'Optimisations ergonomiques pour rendre une application web aussi fluide qu’une application mobile native (touch, scroll, safe areas).',
  'pick-ui-library': 'Guide de sélection rigoureux de bibliothèques d’interface et de composants headless adaptés.',
  'prototype': 'Génération rapide de variantes interactives de design pour comparaison visuelle en direct.',

  // Règles projet sur-mesure
  'project-design-system-tokens': 'Application stricte des tokens visuels (palette de couleurs, typographies, règles UX) du projet.',
  'project-security-compliance-guard': 'Application impérative des règles de conformité et des contraintes de sécurité spécifiques au projet.',
};

function getComponentDescription(comp: { slug: string; kind: string; description?: string }): string {
  const customDesc = ECC_DESCRIPTIONS_FR[comp.slug];
  if (customDesc) {
    return customDesc;
  }
  if (comp.description && comp.description.trim()) {
    if (comp.description.startsWith('Règle ECC')) {
      const parts = comp.description.split(' : ');
      if (parts.length > 1 && parts[1]) {
        return `Règle de qualité et standards pour ${parts.slice(1).join(' : ')}.`;
      }
    }
    return comp.description;
  }
  return 'Composant de configuration et bonnes pratiques logicielles.';
}

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

  // Filtres et exploration des composants retenus
  const [selectedKindFilter, setSelectedKindFilter] = useState<'ALL' | 'RULE' | 'SUBAGENT' | 'SKILL' | 'COMMAND_CONVERTED'>('ALL');
  const [selectedSearch, setSelectedSearch] = useState('');

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
          <h1 className="text-2xl font-bold text-slate-900">Étape 3 — Composition du Harnais Antigravity</h1>
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
      {(() => {
        const retainedList = [
          ...(selection?.selectedComponents || []).map((comp) => ({
            slug: comp.slug,
            name: comp.name,
            kind: comp.kind,
            origin: comp.origin,
            description: comp.description,
            rationale: comp.acceptedRationale,
            score: comp.score?.totalScore ?? 100,
            isCustom: false,
          })),
          ...(selection?.customComponents || []).map((custom) => ({
            slug: custom.slug,
            name: custom.name,
            kind: custom.kind,
            origin: 'PROJECT_CUSTOM' as const,
            description: custom.description,
            rationale: custom.gapReason,
            score: 100,
            isCustom: true,
          })),
        ];

        const filteredRetained = retainedList.filter((comp) => {
          if (selectedKindFilter !== 'ALL' && comp.kind !== selectedKindFilter) {
            return false;
          }
          if (selectedSearch.trim()) {
            const q = selectedSearch.toLowerCase().trim();
            const desc = getComponentDescription(comp).toLowerCase();
            const matchName = comp.name.toLowerCase().includes(q);
            const matchSlug = comp.slug.toLowerCase().includes(q);
            const matchDesc = desc.includes(q);
            const matchRationale = comp.rationale.toLowerCase().includes(q);
            return matchName || matchSlug || matchDesc || matchRationale;
          }
          return true;
        });

        const KIND_TABS: Array<{ label: string; kind: 'ALL' | 'SUBAGENT' | 'RULE' | 'SKILL' | 'COMMAND_CONVERTED' }> = [
          { label: 'Tous', kind: 'ALL' },
          { label: 'Sous-agents', kind: 'SUBAGENT' },
          { label: 'Règles', kind: 'RULE' },
          { label: 'Skills', kind: 'SKILL' },
          { label: 'Commandes', kind: 'COMMAND_CONVERTED' },
        ];

        return (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <span>Composants Retenus ({retainedList.length})</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Composants validés pour le harnais (catalogue adapté et règles métier sur-mesure).
                </p>
              </div>

              {/* Recherche rapide */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Filtrer par nom, description, slug..."
                  value={selectedSearch}
                  onChange={(e) => setSelectedSearch(e.target.value)}
                  className="w-full px-3 py-1.5 pl-8 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                {selectedSearch && (
                  <button
                    onClick={() => setSelectedSearch('')}
                    className="absolute right-2.5 top-1.5 text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Onglets de filtrage par type */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-b border-slate-100 pb-3">
              {KIND_TABS.map((tab) => {
                const count =
                  tab.kind === 'ALL'
                    ? retainedList.length
                    : retainedList.filter((c) => c.kind === tab.kind).length;
                const active = selectedKindFilter === tab.kind;
                return (
                  <button
                    key={tab.kind}
                    type="button"
                    onClick={() => setSelectedKindFilter(tab.kind)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      active
                        ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Liste filtrée des composants */}
            <div className="space-y-3 pt-1">
              {filteredRetained.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Aucun composant retenu ne correspond à ce filtre ou critère de recherche.
                </div>
              ) : (
                filteredRetained.map((comp) => (
                  <div
                    key={comp.slug}
                    className="p-4 rounded-lg bg-slate-50 hover:bg-slate-100/70 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${
                            comp.kind === 'RULE'
                              ? 'bg-blue-100 text-blue-800'
                              : comp.kind === 'SUBAGENT'
                                ? 'bg-purple-100 text-purple-800'
                                : comp.kind === 'SKILL'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {comp.kind}
                        </span>

                        {comp.isCustom && (
                          <span className="font-sans text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                            SUR-MESURE PROJET
                          </span>
                        )}

                        <span className="font-semibold text-slate-900 text-sm">{comp.name}</span>
                        <span className="text-slate-400 font-mono text-[11px]">({comp.slug})</span>
                      </div>

                      {/* Description de ce que fait le composant */}
                      <p className="text-slate-600 text-xs leading-relaxed">
                        <strong className="text-slate-700">Rôle :</strong> {getComponentDescription(comp)}
                      </p>

                      {/* Détails rétractables pour la justification de sélection */}
                      <details className="text-[11px] pt-0.5">
                        <summary className="text-slate-400 hover:text-indigo-600 cursor-pointer select-none transition-colors">
                          🔍 Pourquoi ce composant a-t-il été retenu ?
                        </summary>
                        <div className="mt-1 pl-2.5 border-l-2 border-indigo-200 text-slate-500 text-[11px] italic">
                          {comp.rationale}
                        </div>
                      </details>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0 self-start sm:self-auto">
                      <span className="font-semibold px-2 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs">
                        Score : {comp.score}/100
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setUserExcludes([...userExcludes, comp.slug]);
                          calculateSelection();
                        }}
                        className="text-red-500 hover:text-red-700 font-medium text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Exclure ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })()}

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
