'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DocumentItem {
  id: string;
  role: 'SPECIFICATION' | 'DESIGN_SYSTEM' | 'SUPPLEMENTARY';
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
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [uploadingRole, setUploadingRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('ahb_gemini_api_key');
    if (saved) setGeminiApiKey(saved);
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

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
    const hasSpec = documents.some((d) => d.role === 'SPECIFICATION' && d.extractionStatus === 'COMPLETED');
    if (!hasSpec) {
      setError('Veuillez importer et vérifier au moins un document de cahier des charges valide avant l extraction.');
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

  const specDoc = documents.find((d) => d.role === 'SPECIFICATION');
  const dsDoc = documents.find((d) => d.role === 'DESIGN_SYSTEM');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Fil d'Ariane des étapes */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 text-xs font-semibold">
        <span className="text-indigo-600 font-bold">1. Import des Documents</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-400">2. Profil Extrait & Épistémique</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-400">3. Composition du Harnais</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-400">4. Prévisualisation & Code</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-400">5. Téléchargement</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Étape 1 — Import des Documents Sources ({project?.name})
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Surface cible : <strong className="text-slate-700">Antigravity {project?.targetSurface}</strong>.
          Importez vos documents d architecture, cahiers des charges et règles graphiques.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Cartes d'upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Document 1 : Spécification */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                Obligatoire
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
                Recommandé
              </span>
              {dsDoc && (
                <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                  ✓ Extrait ({Math.round(dsDoc.sizeBytes / 1024)} Ko)
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-slate-900">Design System & Tokens Graphiques</h3>
            <p className="text-xs text-slate-500 mt-1">
              CSS/SCSS, JSON de tokens, Markdown de charte graphique, maquette PNG/JPEG ou SVG sanitisé.
            </p>

            {dsDoc && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-700 border border-slate-200 flex items-center justify-between">
                <span className="truncate">{dsDoc.originalName}</span>
                <span className="text-slate-400">
                  {dsDoc.extractionStatus === 'COMPLETED' ? 'Extrait avec succès' : 'Échec'}
                </span>
              </div>
            )}
          </div>

          <div className="mt-6">
            <label className="block w-full text-center px-4 py-2.5 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
              {uploadingRole === 'DESIGN_SYSTEM'
                ? 'Analyse en cours...'
                : dsDoc
                  ? 'Remplacer le Design System'
                  : 'Sélectionner un fichier (Design System)'}
              <input
                type="file"
                className="hidden"
                accept=".css,.scss,.json,.md,.txt,.svg,.png,.jpg,.jpeg"
                disabled={uploadingRole !== null}
                onChange={(e) => handleFileUpload(e, 'DESIGN_SYSTEM')}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Formulaire des notes complémentaires */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-slate-900">Notes & Directives Complémentaires</h3>
        <p className="text-xs text-slate-500">
          Ces notes permettent de préciser des règles métier, des contraintes d infrastructure ou de sécurité qui ne figurent pas explicitement dans les documents.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Contraintes de Déploiement & Hébergement
            </label>
            <input
              type="text"
              value={notes.deploymentConstraints}
              onChange={(e) => setNotes({ ...notes, deploymentConstraints: e.target.value })}
              placeholder="Ex : Docker, Coolify, VPS Ubuntu, pas de dépendance cloud externe"
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
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Moteur d&apos;Extraction & Analyse IA</h3>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
            geminiApiKey.trim()
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {geminiApiKey.trim() ? 'Google Gemini Configuré' : 'Mode Autonome / Heuristique Déterministe'}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Par défaut, l&apos;application analyse vos documents et extrait un profil épistémique complet de manière autonome et sans surcoût. Si vous disposez d&apos;une clé API Google Gemini et souhaitez déléguer l&apos;analyse au modèle en ligne, vous pouvez la renseigner ici :
        </p>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Clé API Google Gemini (Optionnel)
          </label>
          <input
            type="password"
            value={geminiApiKey}
            onChange={(e) => {
              setGeminiApiKey(e.target.value);
              localStorage.setItem('ahb_gemini_api_key', e.target.value);
            }}
            placeholder="AIzaSy... (Laisser vide pour utiliser l'extracteur déterministe autonome)"
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Link
          href="/projects"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Retour aux projets
        </Link>

        <button
          onClick={handleExtractProfile}
          disabled={extracting || !specDoc}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm shadow-sm transition-colors flex items-center space-x-2"
        >
          {extracting ? (
            <span>Extraction et Structuration IA en cours...</span>
          ) : (
            <span>Analyser et Générer le Profil Épistémique →</span>
          )}
        </button>
      </div>
    </div>
  );
}
