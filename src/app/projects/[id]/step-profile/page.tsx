'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProjectProfile } from '../../../../modules/project-profile/schema';

export default function StepProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();

  const [profile, setProfile] = useState<ProjectProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gestion interactive de l'arbitrage des incertitudes
  const [editingUncertaintyIdx, setEditingUncertaintyIdx] = useState<number | null>(null);
  const [customResolutionText, setCustomResolutionText] = useState<string>('');

  const handleAcceptFallback = (index: number) => {
    if (!profile || !profile.uncertainties) return;
    const updated = [...profile.uncertainties];
    const item = updated[index];
    if (!item) return;
    updated[index] = {
      ...item,
      isResolved: true,
      userResolution: item.proposedFallback,
      requiresHumanDecision: false,
      resolvedAt: new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setProfile({ ...profile, uncertainties: updated });
    setEditingUncertaintyIdx(null);
  };

  const handleStartCustomResolution = (index: number) => {
    if (!profile || !profile.uncertainties) return;
    const item = profile.uncertainties[index];
    if (!item) return;
    setEditingUncertaintyIdx(index);
    setCustomResolutionText(item.userResolution || item.proposedFallback);
  };

  const handleSaveCustomResolution = (index: number) => {
    if (!profile || !profile.uncertainties) return;
    const updated = [...profile.uncertainties];
    const item = updated[index];
    if (!item) return;
    const text = customResolutionText.trim() || item.proposedFallback;
    updated[index] = {
      ...item,
      isResolved: true,
      userResolution: text,
      requiresHumanDecision: false,
      resolvedAt: new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setProfile({ ...profile, uncertainties: updated });
    setEditingUncertaintyIdx(null);
  };

  const handleReopenUncertainty = (index: number) => {
    if (!profile || !profile.uncertainties) return;
    const updated = [...profile.uncertainties];
    const item = updated[index];
    if (!item) return;
    updated[index] = {
      ...item,
      isResolved: false,
      requiresHumanDecision: true,
    };
    setProfile({ ...profile, uncertainties: updated });
    setEditingUncertaintyIdx(index);
    setCustomResolutionText(item.userResolution || item.proposedFallback);
  };

  const handleRemoveUncertainty = (index: number) => {
    if (!profile || !profile.uncertainties) return;
    const updated = profile.uncertainties.filter((_, i) => i !== index);
    setProfile({ ...profile, uncertainties: updated });
    setEditingUncertaintyIdx(null);
  };

  useEffect(() => {
    fetch(`/api/projects/${projectId}/profile`)
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setProfile(d.profile);
        } else {
          setError('Aucun profil extrait disponible. Veuillez lancer l extraction à l étape précédente.');
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleConfirmProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la confirmation');

      router.push(`/projects/${projectId}/step-selection`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const renderEpistemicBadge = (status: string, confidence?: string) => {
    switch (status) {
      case 'explicit':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Source explicite
          </span>
        );
      case 'deduced':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Déduction ({confidence ? `Confiance: ${confidence}` : 'Moyenne'})
          </span>
        );
      case 'hypothesis':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Hypothèse provisoire
          </span>
        );
      case 'missing_or_contradictory':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Manquant / Contradiction
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-slate-500">Chargement du profil...</div>;
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
        <p className="text-red-600 text-sm">{error || 'Profil manquant'}</p>
        <Link
          href={`/projects/${projectId}/step-import`}
          className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Retourner à l étape d import pour relancer l analyse
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Fil d'Ariane des étapes */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 text-xs font-semibold">
        <span className="text-slate-400">1. Import des Documents</span>
        <span className="text-slate-300">→</span>
        <span className="text-indigo-600 font-bold">2. Profil Extrait & Épistémique</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-400">3. Composition du Harnais</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-400">4. Prévisualisation & Code</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-400">5. Téléchargement</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Étape 2 — Profil Extrait & Épistémique ({profile.projectName})
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Chaque élément a été catégorisé selon son statut épistémique (§3.3 du cahier des charges).
          Vérifiez, modifiez ou levez les hypothèses avant la composition du harnais.
        </p>
      </div>

      {/* 1. Objectif & Domaine */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Domaine & Objectif Général</h3>
          {renderEpistemicBadge(profile.domainAndObjective?.epistemicStatus, profile.domainAndObjective?.confidence)}
        </div>
        <textarea
          rows={2}
          value={profile.domainAndObjective?.value || ''}
          onChange={(e) =>
            setProfile({
              ...profile,
              domainAndObjective: {
                ...profile.domainAndObjective,
                value: e.target.value,
                userEdited: true,
              },
            })
          }
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* 2. Stack Technique */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Stack Technique Normalisée</h3>
          {renderEpistemicBadge(profile.techStack?.epistemicStatus, profile.techStack?.confidence)}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Langages</label>
            <input
              type="text"
              value={(profile.techStack?.languages || []).join(', ')}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  techStack: {
                    ...profile.techStack,
                    languages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Frameworks</label>
            <input
              type="text"
              value={(profile.techStack?.frameworks || []).join(', ')}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  techStack: {
                    ...profile.techStack,
                    frameworks: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Bases de Données</label>
            <input
              type="text"
              value={(profile.techStack?.databases || []).join(', ')}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  techStack: {
                    ...profile.techStack,
                    databases: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Outils de Test</label>
            <input
              type="text"
              value={(profile.techStack?.testingTools || []).join(', ')}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  techStack: {
                    ...profile.techStack,
                    testingTools: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>
      </div>

      {/* 3. Fonctionnalités et Critères d'Acceptation */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-slate-900">
          Fonctionnalités & Critères d Acceptation Extraits
        </h3>

        <div className="space-y-4">
          {(profile.features || []).map((feat, idx) => (
            <div key={feat.id || idx} className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-slate-900">
                  {feat.title} ({feat.priority})
                </span>
                {renderEpistemicBadge(feat.epistemicStatus, feat.confidence)}
              </div>
              <p className="text-xs text-slate-600">{feat.description}</p>
              <div className="pt-2 text-xs text-slate-500">
                <span className="font-medium text-slate-700">Critères d acceptation :</span>
                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                  {feat.acceptanceCriteria.map((ac, acIdx) => (
                    <li key={acIdx}>{ac}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Incertitudes & Contradictions (docs/ASSUMPTIONS.md) */}
      {(() => {
        const uncertaintiesList = profile.uncertainties || [];
        const pendingCount = uncertaintiesList.filter((u) => !u.isResolved).length;

        return (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Registre des Incertitudes, Manques &amp; Contradictions
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Arbitrage humain : confirmez ou personnalisez chaque décision pour lever toute incertitude avant génération (consigné dans <code>docs/ASSUMPTIONS.md</code>).
                </p>
              </div>
              <div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    pendingCount === 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {pendingCount === 0
                    ? '✓ 0 incertitude en suspens'
                    : `${pendingCount} arbitrage(s) requis`}
                </span>
              </div>
            </div>

            {/* Bannière d'état */}
            {uncertaintiesList.length > 0 && (
              pendingCount === 0 ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
                  <span className="font-medium flex items-center gap-1.5">
                    ✓ Toutes les incertitudes ({uncertaintiesList.length}/{uncertaintiesList.length}) ont été arbitrées et validées. Le harnais sera généré sans ambiguïté résiduelle.
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between">
                  <span>
                    Il reste <strong>{pendingCount}</strong> point(s) en suspens. Vous pouvez valider directement le repli par défaut ou saisir une décision d&apos;architecture personnalisée.
                  </span>
                </div>
              )
            )}

            {uncertaintiesList.length === 0 ? (
              <p className="text-xs text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                ✓ Aucune contradiction ou manque bloquant détecté dans les documents fournis.
              </p>
            ) : (
              <div className="space-y-4">
                {uncertaintiesList.map((u, i) => {
                  const isEditing = editingUncertaintyIdx === i;
                  const isResolved = !!u.isResolved;

                  return (
                    <div
                      key={u.id || i}
                      className={`p-4 rounded-xl border transition-all text-xs space-y-3 ${
                        isResolved
                          ? 'bg-emerald-50/20 border-emerald-300'
                          : 'bg-amber-50/20 border-amber-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-bold text-slate-900 text-sm">
                          [{u.category.toUpperCase()}] {u.topic}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            Impact : {u.impact}
                          </span>
                          {isResolved ? (
                            <span className="font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              ✓ Arbitré &amp; Validé
                            </span>
                          ) : (
                            <span className="font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                              En attente d&apos;arbitrage
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-slate-700">
                        <strong>Constat initial :</strong> {u.statement}
                      </p>

                      <p className="text-slate-600">
                        <strong>Fallback proposé par défaut :</strong> {u.proposedFallback}
                      </p>

                      {/* Bloc décision validée */}
                      {isResolved && !isEditing && (
                        <div className="p-3 bg-white rounded-lg border border-emerald-200 shadow-sm space-y-2">
                          <div className="flex items-center justify-between text-emerald-900 font-semibold">
                            <span>Décision d&apos;architecture arrêtée et validée :</span>
                            {u.resolvedAt && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                Arbitré le {u.resolvedAt}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-800 bg-emerald-50/50 p-2.5 rounded border border-emerald-100 font-medium whitespace-pre-wrap">
                            {u.userResolution || u.proposedFallback}
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleStartCustomResolution(i)}
                              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded shadow-sm"
                            >
                              Modifier la décision
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReopenUncertainty(i)}
                              className="px-2.5 py-1 text-xs font-medium text-amber-700 hover:text-amber-900 hover:underline"
                            >
                              Rouvrir l&apos;incertitude
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveUncertainty(i)}
                              className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-800 hover:underline ml-auto"
                            >
                              Retirer du registre
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Mode formulaire de personnalisation */}
                      {isEditing && (
                        <div className="p-3 bg-white rounded-lg border border-indigo-200 shadow-sm space-y-2">
                          <label className="block font-semibold text-slate-800">
                            Votre décision d&apos;architecture pour lever cette incertitude :
                          </label>
                          <textarea
                            value={customResolutionText}
                            onChange={(e) => setCustomResolutionText(e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-sans"
                            placeholder="Saisissez votre choix technique ou organisationnel..."
                          />
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingUncertaintyIdx(null)}
                              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 border border-slate-200 rounded"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveCustomResolution(i)}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm"
                            >
                              Enregistrer ma décision
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Actions rapides quand non résolu */}
                      {!isResolved && !isEditing && (
                        <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60">
                          <button
                            type="button"
                            onClick={() => handleAcceptFallback(i)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded text-xs shadow-sm flex items-center gap-1 transition-colors"
                          >
                            <span>✓ Valider ce fallback</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartCustomResolution(i)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-medium border border-slate-300 rounded text-xs shadow-sm transition-colors"
                          >
                            Modifier / Personnaliser
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveUncertainty(i)}
                            className="px-2 py-1 text-slate-500 hover:text-rose-700 text-xs ml-auto hover:underline"
                          >
                            Retirer l&apos;incertitude
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Link
          href={`/projects/${projectId}/step-import`}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Retour à l import
        </Link>

        <button
          onClick={handleConfirmProfile}
          disabled={saving}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm shadow-sm transition-colors"
        >
          {saving ? 'Enregistrement...' : 'Confirmer le Profil & Passer à la Composition →'}
        </button>
      </div>
    </div>
  );
}
