'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import StepNavigation from '@/components/StepNavigation';
import ToastNotification from '@/components/ui/ToastNotification';
import { Copy, Check, Download, Eye, X } from 'lucide-react';

// Copie robuste, y compris hors HTTPS (repli sur execCommand)
async function copyToClipboardSafe(text: string): Promise<boolean> {
  if (typeof window !== 'undefined' && navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Repli ci-dessous si le navigateur refuse
    }
  }
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textArea);
    return ok;
  } catch {
    return false;
  }
}

export default function StepExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);

  const [project, setProject] = useState<any>(null);
  const [generations, setGenerations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        setProject(d.project);
        setGenerations(d.generations || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const latestGen = generations[0];
  const isUpgradeMode = project?.mode === 'UPGRADE';
  const target = isUpgradeMode ? 'upgrade_markdown' : 'deploy_markdown';
  const fileName = isUpgradeMode ? 'upgrade-harness.md' : 'deploy-harness.md';

  const fetchPrompt = async (): Promise<string> => {
    const res = await fetch(`/api/projects/${projectId}/download?target=${target}&disposition=inline`);
    if (!res.ok) throw new Error('Impossible de charger le prompt.');
    return res.text();
  };

  const handleCopy = async () => {
    setBusy(true);
    try {
      const text = await fetchPrompt();
      if (await copyToClipboardSafe(text)) {
        setCopied(true);
        setToast({ message: 'Prompt copié : collez-le dans la conversation Antigravity du projet.', type: 'success' });
        setTimeout(() => setCopied(false), 2500);
      } else {
        setToast({ message: 'Copie refusée par le navigateur : téléchargez le fichier à la place.', type: 'error' });
      }
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Erreur lors de la copie.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handlePreview = async () => {
    setBusy(true);
    try {
      setPreviewText(await fetchPrompt());
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Erreur lors du chargement.', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-slate-500">Chargement des résultats d&apos;export...</div>;
  }

  if (error || !latestGen) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
        <p className="text-red-600 text-sm">{error || 'Aucun harnais généré.'}</p>
        <Link
          href={`/projects/${projectId}/step-selection`}
          className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Retourner à la sélection pour générer le harnais
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <StepNavigation projectId={projectId} currentStep={5} hasProfile={true} hasGeneration={true} />

      <div className="text-center space-y-1.5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Étape 5 — {isUpgradeMode ? 'Mise à niveau du harnais' : 'Déploiement du harnais'}
        </h1>
        <p className="text-xs text-slate-500">
          Harnais prêt pour <strong>{project?.name}</strong> (surface : {project?.targetSurface}).
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-indigo-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          {isUpgradeMode ? 'Prompt de mise à niveau' : 'Prompt de déploiement'}
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Copiez ce prompt et collez-le dans une nouvelle conversation Antigravity ouverte sur le dossier du projet.
          Il est léger : il contient un lien de téléchargement valable 24 heures, et l&apos;agent récupère lui-même les
          fichiers puis vérifie leurs empreintes. Recopiez le prompt après ce délai.
          {isUpgradeMode
            ? " L'agent sauvegarde chaque fichier qu'il modifie dans .agents/.harness-backup/, présente le plan et attend votre confirmation avant d'écrire."
            : " L'agent installe les règles, skills, sous-agents et AGENTS.md, sans supprimer aucun fichier applicatif."}
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopy}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg shadow-xs active:scale-[0.98] transition-[background-color,transform] duration-120"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Prompt copié' : 'Copier le prompt'}</span>
          </button>
          <a
            href={`/api/projects/${projectId}/download?target=${target}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg border border-slate-200 shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Télécharger {fileName}</span>
          </a>
          <button
            type="button"
            onClick={handlePreview}
            disabled={busy}
            className="inline-flex items-center gap-1 text-sm text-indigo-700 hover:text-indigo-900 hover:underline font-medium"
          >
            <Eye className="w-4 h-4" />
            <span>Aperçu</span>
          </button>
        </div>

        {previewText !== null && (
          <div className="p-4 bg-slate-900 rounded-xl text-slate-200 text-xs font-mono max-h-80 overflow-y-auto border border-slate-800">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-200">{fileName}</span>
              <button
                type="button"
                aria-label="Fermer l'aperçu"
                onClick={() => setPreviewText(null)}
                className="text-slate-400 hover:text-white flex items-center gap-1"
              >
                <span>Fermer</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <pre className="whitespace-pre-wrap">{previewText}</pre>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Archive pour consultation</h3>
        <p className="text-xs text-slate-500">
          Le ZIP contient les mêmes fichiers que le prompt. Il sert à relire ou à archiver le harnais, pas à l&apos;installer.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <a
            href={`/api/projects/${projectId}/download?target=zip`}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Télécharger le ZIP</span>
          </a>
          <code className="text-[11px] font-mono text-slate-600 break-all select-all">SHA-256 : {latestGen.zipSha256}</code>
          <button
            type="button"
            onClick={async () => {
              if (await copyToClipboardSafe(latestGen.zipSha256)) {
                setCopiedSha(true);
                setTimeout(() => setCopiedSha(false), 2000);
              }
            }}
            className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 rounded-lg text-xs font-medium text-slate-700 shrink-0"
          >
            {copiedSha ? 'Copié ✓' : "Copier l'empreinte"}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Link href={`/projects/${projectId}/step-preview`} className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← Retour à la prévisualisation
        </Link>
        <Link href="/projects" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
          Retour aux projets →
        </Link>
      </div>

      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
