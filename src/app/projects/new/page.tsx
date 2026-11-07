'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ArrowRight,
  Terminal,
  Upload,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  AUDIT_EXTRACTION_PROMPT,
  parseAuditReportText,
  AntigravityAuditReport,
} from '@/modules/project-profile/audit-extractor';
import { nextStepAfterAuditIngestion } from '@/lib/after-audit-ingestion';

export default function NewProjectPage() {
  const router = useRouter();
  const [projectMode, setProjectMode] = useState<'NEW' | 'UPGRADE'>('NEW');

  // Champs mode "Nouveau projet"
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetSurface, setTargetSurface] = useState<'APP' | 'IDE' | 'CLI'>('IDE');

  // Champs mode "Mise à niveau"
  const [auditText, setAuditText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [parsedAudit, setParsedAudit] = useState<AntigravityAuditReport | null>(null);
  const [auditParseError, setAuditParseError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
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

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AUDIT_EXTRACTION_PROMPT);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = AUDIT_EXTRACTION_PROMPT;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    }
  };

  // Analyse en direct du texte d'audit collé
  const handleAuditTextChange = (text: string) => {
    setAuditText(text);
    if (!text.trim()) {
      setParsedAudit(null);
      setAuditParseError(null);
      return;
    }

    try {
      const parsed = parseAuditReportText(text);
      setParsedAudit(parsed);
      setAuditParseError(null);
      if (parsed.targetSurfaceRecommendation) {
        setTargetSurface(parsed.targetSurfaceRecommendation);
      }
    } catch (err: unknown) {
      setParsedAudit(null);
      setAuditParseError(err instanceof Error ? err.message : 'JSON invalide');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      handleAuditTextChange(text);
    } catch (err: unknown) {
      setError('Impossible de lire le fichier sélectionné.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (projectMode === 'UPGRADE') {
        if (!auditText.trim()) {
          throw new Error('Veuillez coller le résultat du prompt d\'audit ou charger le fichier antigravity-audit.json.');
        }

        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'UPGRADE',
            auditText,
            targetSurface,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur lors de la création du projet');

        // Cahier des charges joint à l'audit : extraction et fusion du profil, puis profil
        router.push(await nextStepAfterAuditIngestion(data.project.id, data, () => setExtracting(true)));
      } else {
        if (!name.trim()) {
          throw new Error('Le nom du projet est obligatoire.');
        }

        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description,
            targetSurface,
            mode: 'NEW',
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur lors de la création');

        router.push(`/projects/${data.project.id}/step-import`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return <div className="text-center py-16 text-slate-500">Vérification de l authentification...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-7 rounded-xl border border-slate-200 shadow-xs">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Nouveau Projet</h1>
        <p className="text-xs text-slate-500 mt-1">
          Démarrez un nouveau harnais de zéro ou modernisez un dépôt Antigravity existant.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Choix du mode de projet */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-slate-700 mb-2.5">
          Type d'initialisation
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div
            onClick={() => setProjectMode('NEW')}
            className={`p-4 rounded-xl border-2 cursor-pointer active:scale-[0.99] transition-all flex flex-col justify-between ${
              projectMode === 'NEW'
                ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div>
              <div className="flex items-center space-x-2.5 mb-1.5">
                <div className={`p-1.5 rounded-lg ${projectMode === 'NEW' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Nouveau projet</h3>
                  <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-100/70 px-2 py-0.2 rounded-full">De zéro</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Génération ex-nihilo à partir d'un cahier des charges et d'une charte graphique.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Import de documents</span>
              <input
                type="radio"
                name="projectMode"
                checked={projectMode === 'NEW'}
                onChange={() => setProjectMode('NEW')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div
            onClick={() => setProjectMode('UPGRADE')}
            className={`p-4 rounded-xl border-2 cursor-pointer active:scale-[0.99] transition-all flex flex-col justify-between ${
              projectMode === 'UPGRADE'
                ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div>
              <div className="flex items-center space-x-2.5 mb-1.5">
                <div className={`p-1.5 rounded-lg ${projectMode === 'UPGRADE' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Mise à niveau</h3>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/70 px-2 py-0.2 rounded-full">Dépôt existant</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Audit automatique : extraction instantanée du nom, de la stack et des règles existantes.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Extraction 100% automatique</span>
              <input
                type="radio"
                name="projectMode"
                checked={projectMode === 'UPGRADE'}
                onChange={() => setProjectMode('UPGRADE')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleCreate} className="space-y-6">
        {/* ========================================================= */}
        {/* CAS 1 : MODE MISE À NIVEAU (Extraction automatique)        */}
        {/* ========================================================= */}
        {projectMode === 'UPGRADE' ? (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-900 font-semibold text-xs">
                  <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                  <span>1. Lancez ce prompt d'audit dans Antigravity (lecture seule)</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-xs transition-all active:scale-[0.98]"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPrompt ? 'Copié !' : 'Copier le prompt'}</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className="text-emerald-700 font-medium">✓ 100% lecture seule</span>
                <span>•</span>
                <span>Fichiers .env et secrets ignorés</span>
                <span>•</span>
                <span>Génère un rapport JSON</span>
              </div>
            </div>

            {/* Zone de collage du résultat d'audit */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  2. Collez le résultat JSON ou téléversez antigravity-audit.json <span className="text-rose-500">*</span>
                </label>
                <label className="inline-flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer">
                  <Upload className="w-3 h-3" />
                  <span>Téléverser fichier</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>

              <textarea
                value={auditText}
                onChange={(e) => handleAuditTextChange(e.target.value)}
                rows={7}
                placeholder="Collez ici le JSON ou le texte renvoyé par Antigravity..."
                className={`w-full px-3 py-2 border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 ${
                  parsedAudit
                    ? 'border-emerald-300 ring-1 ring-emerald-300 bg-emerald-50/20'
                    : auditParseError
                      ? 'border-amber-300 focus:ring-amber-500'
                      : 'border-slate-300 focus:ring-indigo-500'
                }`}
              />

              {auditParseError && auditText.trim() && (
                <p className="mt-1.5 text-xs text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Format non reconnu : assurez-vous de coller le bloc JSON complet de l'audit.</span>
                </p>
              )}
            </div>

            {/* Aperçu direct des éléments extraits automatiquement */}
            {parsedAudit && (
              <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-xl space-y-2 animate-fadeIn">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Projet détecté avec succès !</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs text-slate-700">
                  <div>
                    <span className="font-semibold text-slate-500 block">Nom du projet extrait :</span>
                    <strong className="text-slate-900 text-sm">{parsedAudit.projectName || 'Projet Audité'}</strong>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 block">Surface conseillée :</span>
                    <strong className="text-slate-900">{parsedAudit.targetSurfaceRecommendation || 'IDE'}</strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-semibold text-slate-500 block">Description succincte générée :</span>
                    <p className="text-slate-700 italic mt-0.5">
                      {parsedAudit.projectDescription || 'Application existante analysée avec succès.'}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-semibold text-slate-500 block mb-1">Technologies & Outils identifiés :</span>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedAudit.techStack.languages.map((l) => (
                        <span key={l} className="px-2 py-0.5 bg-white border border-emerald-300 text-emerald-800 rounded font-medium">
                          {l}
                        </span>
                      ))}
                      {parsedAudit.techStack.frameworks.map((f) => (
                        <span key={f} className="px-2 py-0.5 bg-white border border-indigo-200 text-indigo-700 rounded font-medium">
                          {f}
                        </span>
                      ))}
                      {parsedAudit.techStack.databases.map((db) => (
                        <span key={db} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded font-medium">
                          {db}
                        </span>
                      ))}
                      {parsedAudit.techStack.testingTools.map((t) => (
                        <span key={t} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-semibold text-slate-500 block">Harnais existant :</span>
                    <p className="text-slate-700 mt-0.5">
                      {(parsedAudit.existingAiHarness?.files ?? []).length > 0
                        ? `${parsedAudit.existingAiHarness?.files.length} fichier(s) inventorié(s) avec empreinte`
                        : "Aucun inventaire détaillé (audit au format 1.0 : relancez le prompt d'audit actuel pour un plan de mise à niveau précis)"}
                      {parsedAudit.previousGeneration
                        ? ` — harnais AHB précédent détecté (${parsedAudit.previousGeneration.files.length} fichier(s) gérés)`
                        : ''}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-semibold text-slate-500 block">Documents fonctionnels joints :</span>
                    {(parsedAudit.functionalDocuments ?? []).some((d) => d.content) ? (
                      <ul className="mt-0.5 space-y-0.5 text-slate-700">
                        {parsedAudit.functionalDocuments
                          .filter((d) => d.content)
                          .map((d) => (
                            <li key={d.path}>
                              <code className="font-mono">{d.path}</code>
                              {d.role === 'SPECIFICATION' ? ' — cahier des charges' : d.role === 'DESIGN_SYSTEM' ? ' — design system' : ''}
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <p className="mt-0.5 p-2 bg-amber-50 border border-amber-200 rounded text-amber-900">
                        Aucun : le harnais ne connaîtra que la pile technique. Ajoutez le cahier des charges au dépôt
                        et relancez l&apos;audit, ou importez-le à l&apos;étape « Import ».
                      </p>
                    )}
                    {(parsedAudit.functionalDocuments ?? []).some((d) => !d.content) && (
                      <p className="mt-1 text-amber-800">
                        Non joints (format non texte), à importer à la main :{' '}
                        {parsedAudit.functionalDocuments.filter((d) => !d.content).map((d) => d.path).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Choix de la surface */}
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
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                      targetSurface === surface.id
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-slate-900">{surface.title}</span>
                        <input
                          type="radio"
                          name="targetSurfaceUpgrade"
                          value={surface.id}
                          checked={targetSurface === surface.id}
                          onChange={() => setTargetSurface(surface.id as any)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">{surface.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* CAS 2 : MODE NOUVEAU PROJET (Formulaire classique)        */
          /* ========================================================= */
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nom du projet <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required={projectMode === 'NEW'}
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
                          name="targetSurfaceNew"
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
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading || (projectMode === 'NEW' ? !name.trim() : !auditText.trim())}
            className="inline-flex items-center space-x-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
          >
            <span>
              {extracting
                ? 'Extraction du cahier des charges…'
                : loading
                ? 'Création...'
                : projectMode === 'UPGRADE'
                  ? 'Analyser l\'audit & Créer'
                  : 'Créer le projet'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
