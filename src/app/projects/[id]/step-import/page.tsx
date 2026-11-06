'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StepNavigation from '@/components/StepNavigation';
import { Copy, Check, Upload, ArrowRight, RefreshCw } from 'lucide-react';
import { AUDIT_EXTRACTION_PROMPT } from '@/modules/project-profile/audit-extractor';

interface DocumentItem {
  id: string;
  role: 'SPECIFICATION' | 'DESIGN_SYSTEM' | 'SUPPLEMENTARY' | 'AUDIT_REPORT';
  originalName: string;
  sizeBytes: number;
  extractionStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  extractionMeta?: Record<string, unknown>;
}

export default function StepImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();

  const [project, setProject] = useState<any>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [hasGeneration, setHasGeneration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [ingestingAudit, setIngestingAudit] = useState(false);
  const [auditText, setAuditText] = useState('');
  const [copiedAuditPrompt, setCopiedAuditPrompt] = useState(false);
  const [uploadingRole, setUploadingRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-3.8-flash');

  useEffect(() => {
    const saved = localStorage.getItem('ahb_gemini_api_key');
    if (saved) setGeminiApiKey(saved);
    const savedModel = localStorage.getItem('ahb_gemini_model');
    if (savedModel) setGeminiModel(savedModel);
  }, []);

  // Notes complémentaires
  const [notes, setNotes] = useState({
    deploymentConstraints: '',
    regulatoryRequirements: '',
    qualityLevel: 'Production standard avec tests automatisés',
    costPreferences: 'Équilibré (compromis qualité/vitesse)',
  });

  const loadProjectData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error('Impossible de charger le projet');
      const data = await res.json();
      setProject(data.project);
      setDocuments(data.documents || []);
      setHasProfile(Boolean(data.latestProfile));
      setHasGeneration(Boolean(data.generations && data.generations.length > 0));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const handleCopyAuditPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AUDIT_EXTRACTION_PROMPT);
      setCopiedAuditPrompt(true);
      setTimeout(() => setCopiedAuditPrompt(false), 2500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = AUDIT_EXTRACTION_PROMPT;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedAuditPrompt(true);
      setTimeout(() => setCopiedAuditPrompt(false), 2500);
    }
  };

  const handleAuditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIngestingAudit(true);
    try {
      const text = await file.text();
      const res = await fetch(`/api/projects/${projectId}/audit-ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditText: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l ingestion de l audit');

      router.push(`/projects/${projectId}/step-profile`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la lecture du fichier');
    } finally {
      setIngestingAudit(false);
    }
  };

  const handleIngestAuditText = async () => {
    if (!auditText.trim()) {
      setError('Veuillez coller le JSON ou le rapport d audit généré par Antigravity.');
      return;
    }

    setError(null);
    setIngestingAudit(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/audit-ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l ingestion de l audit');

      router.push(`/projects/${projectId}/step-profile`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur d ingestion');
    } finally {
      setIngestingAudit(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, role: 'SPECIFICATION' | 'DESIGN_SYSTEM') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadingRole(role);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('role', role);

      const res = await fetch(`/api/projects/${projectId}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l upload');

      await loadProjectData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur upload');
    } finally {
      setUploadingRole(null);
    }
  };

  const handleExtractProfile = async () => {
    const hasSpec = documents.some((d) => (d.role === 'SPECIFICATION' || d.role === 'AUDIT_REPORT') && d.extractionStatus === 'COMPLETED');
    if (!hasSpec) {
      setError('Veuillez importer et vérifier au moins un document de cahier des charges ou un rapport d audit valide.');
      return;
    }

    setError(null);
    setExtracting(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/extract-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplementaryNotes: notes,
          geminiApiKey: geminiApiKey.trim() || undefined,
          geminiModel: geminiModel.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l analyse IA');

      router.push(`/projects/${projectId}/step-profile`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur d extraction');
      setExtracting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-slate-500">Chargement des données du projet...</div>;
  }

  const isUpgradeMode = project?.mode === 'UPGRADE';
  const auditDoc = documents.find((d) => d.role === 'AUDIT_REPORT');
  const specDoc = documents.find((d) => d.role === 'SPECIFICATION');
  const dsDoc = documents.find((d) => d.role === 'DESIGN_SYSTEM');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Navigation cliquable entre les étapes */}
      <StepNavigation
        projectId={projectId}
        currentStep={1}
        hasProfile={hasProfile}
        hasGeneration={hasGeneration}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Étape 1 — {isUpgradeMode ? 'Audit du Dépôt' : 'Documents Sources'}
            </h1>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
              isUpgradeMode ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
            }`}>
              {isUpgradeMode ? 'Mise à niveau' : 'Nouveau projet'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Projet : <strong className="text-slate-800">{project?.name}</strong> • Surface : <strong className="text-slate-800">Antigravity {project?.targetSurface}</strong>
          </p>
        </div>
      </div>

      {/* Raccourci vers les étapes suivantes si un profil existe déjà */}
      {hasProfile && (
        <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0"></span>
            <span className="text-slate-700">Profil déjà généré pour ce projet.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/projects/${projectId}/step-profile`}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold rounded-lg transition-all"
            >
              Étape 2 (Profil) →
            </Link>
            {hasGeneration && (
              <Link
                href={`/projects/${projectId}/step-export`}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold rounded-lg transition-all"
              >
                Étape 5 (Déploiement) →
              </Link>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* SECTION SPÉCIFIQUE : Mode Mise à Niveau (Audit) */}
      {isUpgradeMode && (
        <div className="bg-white p-6 rounded-xl border-2 border-indigo-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2 text-indigo-900 font-bold text-base">
                <RefreshCw className="w-5 h-5 text-indigo-600" />
                <h2>Rapport d'Audit Technique (antigravity-audit.json)</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Collez le rapport JSON généré par l'agent Antigravity ou téléversez le fichier directement.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyAuditPrompt}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all shrink-0"
            >
              {copiedAuditPrompt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedAuditPrompt ? 'Prompt copié !' : 'Copier le prompt d\'audit'}</span>
            </button>
          </div>

          {auditDoc && (
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
              <span className="font-semibold">✓ Rapport d'audit déjà ingéré ({Math.round(auditDoc.sizeBytes / 1024)} Ko)</span>
              <Link
                href={`/projects/${projectId}/step-profile`}
                className="font-bold underline hover:text-emerald-950"
              >
                Accéder au profil extrait →
              </Link>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Coller le JSON ou le bloc Markdown de l'audit :
              </label>
              <textarea
                value={auditText}
                onChange={(e) => setAuditText(e.target.value)}
                rows={6}
                placeholder='Collez ici le contenu de antigravity-audit.json ou la réponse complète d Antigravity...'
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <label className="inline-flex items-center space-x-2 px-3 py-2 border border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-medium text-slate-700 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Ou téléverser antigravity-audit.json</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    disabled={ingestingAudit}
                    onChange={handleAuditFileUpload}
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={handleIngestAuditText}
                disabled={ingestingAudit || !auditText.trim()}
                className="inline-flex items-center space-x-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
              >
                <span>{ingestingAudit ? 'Ingestion et Analyse...' : 'Ingérer l\'Audit et Configurer le Profil'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cartes d'upload classiques / complémentaires */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3">
          {isUpgradeMode ? 'Documents & Spécifications Complémentaires (Optionnel)' : 'Documents Fondateurs du Projet'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Document 1 : Spécification */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  isUpgradeMode ? 'text-slate-600 bg-slate-100' : 'text-indigo-600 bg-indigo-50'
                }`}>
                  {isUpgradeMode ? 'Optionnel' : 'Obligatoire'}
                </span>
                {specDoc && (
                  <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                    ✓ Extrait ({Math.round(specDoc.sizeBytes / 1024)} Ko)
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-slate-900">Cahier des Charges / Spécifications</h3>
              <p className="text-xs text-slate-500 mt-1">
                Formats supportés : PDF, DOCX, Markdown (.md), TXT, JSON, YAML.
              </p>

              {specDoc && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-700 border border-slate-200 flex items-center justify-between">
                  <span className="truncate">{specDoc.originalName}</span>
                  <span className="text-slate-400">
                    {specDoc.extractionStatus === 'COMPLETED' ? 'Extrait avec succès' : 'Échec d extraction'}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6">
              <label className="block w-full text-center px-4 py-2.5 border border-dashed border-indigo-300 hover:border-indigo-500 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50/50 cursor-pointer transition-colors">
                {uploadingRole === 'SPECIFICATION'
                  ? 'Analyse en cours...'
                  : specDoc
                    ? 'Remplacer le document'
                    : 'Sélectionner un fichier (Cahier des charges)'}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.md,.txt,.json,.yaml,.yml"
                  disabled={uploadingRole !== null}
                  onChange={(e) => handleFileUpload(e, 'SPECIFICATION')}
                />
              </label>
            </div>
          </div>

          {/* Document 2 : Design System */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Optionnel
                </span>
                {dsDoc && (
                  <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                    ✓ Extrait ({Math.round(dsDoc.sizeBytes / 1024)} Ko)
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-slate-900">Design System / Charte Graphique</h3>
              <p className="text-xs text-slate-500 mt-1">
                Couleurs, typographies, règles de composants et contraintes d accessibilité.
              </p>

              {dsDoc && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-700 border border-slate-200 flex items-center justify-between">
                  <span className="truncate">{dsDoc.originalName}</span>
                  <span className="text-slate-400">
                    {dsDoc.extractionStatus === 'COMPLETED' ? 'Extrait avec succès' : 'Échec d extraction'}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6">
              <label className="block w-full text-center px-4 py-2.5 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                {uploadingRole === 'DESIGN_SYSTEM'
                  ? 'Analyse en cours...'
                  : dsDoc
                    ? 'Remplacer la charte'
                    : 'Sélectionner un fichier (Design System)'}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.md,.txt,.json,.yaml,.yml"
                  disabled={uploadingRole !== null}
                  onChange={(e) => handleFileUpload(e, 'DESIGN_SYSTEM')}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Complémentaires */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-slate-900">Notes & Contraintes Opérationnelles</h3>
        <p className="text-xs text-slate-500">
          Précisez les exigences non écrites dans les documents (déploiement, sécurité, contraintes).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Contraintes de Déploiement & Environnement
            </label>
            <input
              type="text"
              value={notes.deploymentConstraints}
              onChange={(e) => setNotes({ ...notes, deploymentConstraints: e.target.value })}
              placeholder="Ex : Docker Alpine, hébergement souverain, node >= 22"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Exigences Réglementaires & Sécurité
            </label>
            <input
              type="text"
              value={notes.regulatoryRequirements}
              onChange={(e) => setNotes({ ...notes, regulatoryRequirements: e.target.value })}
              placeholder="Ex : RGPD, moindre privilège, sanitization Zod stricte"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Moteur d'Extraction & Clé IA Optionnelle */}
      {!isUpgradeMode && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Moteur d&apos;Analyse</h3>
            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${
              geminiApiKey.trim()
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {geminiApiKey.trim() ? `Gemini (${geminiModel})` : 'Extracteur Local Déterministe'}
            </span>
          </div>
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Clé API Google Gemini (Optionnelle — laisser vide pour le moteur local)
              </label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => {
                  setGeminiApiKey(e.target.value);
                  localStorage.setItem('ahb_gemini_api_key', e.target.value);
                }}
                placeholder="AIzaSy... (Optionnel)"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {geminiApiKey.trim() && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Modèle Google Gemini
                </label>
                <select
                  value={geminiModel}
                  onChange={(e) => {
                    setGeminiModel(e.target.value);
                    localStorage.setItem('ahb_gemini_model', e.target.value);
                  }}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-sans bg-white focus:ring-2 focus:ring-indigo-500 text-slate-800"
                >
                  <option value="gemini-3.8-flash">gemini-3.8-flash (Recommandé)</option>
                  <option value="gemini-3.5-flash">gemini-3.5-flash (Stable)</option>
                  <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Rapide)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Link
          href="/projects"
          className="text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          ← Retour aux projets
        </Link>

        {(!isUpgradeMode || specDoc) && (
          <button
            onClick={handleExtractProfile}
            disabled={extracting || (!specDoc && !auditDoc)}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 text-white font-medium rounded-lg text-xs shadow-xs transition-all flex items-center space-x-1.5"
          >
            {extracting ? (
              <span>Extraction en cours...</span>
            ) : (
              <span>Générer le Profil →</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
