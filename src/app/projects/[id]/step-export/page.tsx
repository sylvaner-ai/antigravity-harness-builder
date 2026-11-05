'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import StepNavigation from '@/components/StepNavigation';
import ToastNotification from '@/components/ui/ToastNotification';
import {
  Zap,
  Copy,
  Check,
  Download,
  FileCode,
  FileText,
  Eye,
  X,
} from 'lucide-react';

// Utilitaire robuste de copie supportant HTTPS et HTTP non sécurisé
async function copyToClipboardSafe(text: string): Promise<boolean> {
  if (typeof window !== 'undefined' && navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback si rejeté par le navigateur
    }
  }
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
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
  const [copiedSha, setCopiedSha] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedCompact, setCopiedCompact] = useState(false);
  const [copiedLightweight, setCopiedLightweight] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const [promptPreviewOpen, setPromptPreviewOpen] = useState(false);
  const [promptPreviewText, setPromptPreviewText] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('Aperçu du script');
  const [error, setError] = useState<string | null>(null);
  const [originUrl, setOriginUrl] = useState('');
  const [customHost, setCustomHost] = useState('');
  const [showHostInput, setShowHostInput] = useState(false);
  const [deploymentToken, setDeploymentToken] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const orig = window.location.origin;
      setOriginUrl(orig);
      setCustomHost(orig);
    }
  }, []);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        setProject(d.project);
        setGenerations(d.generations || []);
        if (d.deploymentToken) {
          setDeploymentToken(d.deploymentToken);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const latestGen = generations[0];
  const isUpgradeMode = project?.mode === 'UPGRADE';

  const effectiveHost = (customHost || originUrl || 'http://localhost:3000').replace(/\/$/, '');
  const tokenQuery = deploymentToken ? `?token=${deploymentToken}` : '';
  const curlCommand = `curl -sSL "${effectiveHost}/api/projects/${projectId}/deploy.sh${tokenQuery}" | bash`;

  const handleCopyCurl = async () => {
    const success = await copyToClipboardSafe(curlCommand);
    if (success) {
      setCopiedCurl(true);
      setToast({ message: 'Commande Express 1-Ligne copiée !', type: 'success' });
      setTimeout(() => setCopiedCurl(false), 2500);
    }
  };

  const handleCopyCompact = async () => {
    try {
      setLoadingAction('compact');
      const res = await fetch(`/api/projects/${projectId}/download?target=compact_base64&disposition=inline`);
      if (!res.ok) throw new Error('Impossible de charger le script compact');
      const text = await res.text();
      const success = await copyToClipboardSafe(text);
      if (success) {
        setCopiedCompact(true);
        setToast({ message: 'Script Base64 auto-extractible copié !', type: 'success' });
        setTimeout(() => setCopiedCompact(false), 2500);
      }
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Erreur lors de la copie du script compact', type: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCopyLightweight = async () => {
    try {
      setLoadingAction('lightweight');
      const res = await fetch(`/api/projects/${projectId}/download?target=lightweight_markdown&disposition=inline`);
      if (!res.ok) throw new Error('Impossible de charger le prompt épuré');
      const text = await res.text();
      const success = await copyToClipboardSafe(text);
      if (success) {
        setCopiedLightweight(true);
        setToast({ message: 'Prompt texte brut copié !', type: 'success' });
        setTimeout(() => setCopiedLightweight(false), 2500);
      }
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Erreur lors de la copie', type: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePreviewTarget = async (target: string, title: string) => {
    setLoadingAction(target);
    try {
      const res = await fetch(`/api/projects/${projectId}/download?target=${target}&disposition=inline`);
      if (!res.ok) throw new Error('Impossible de charger l aperçu');
      const text = await res.text();
      setPromptPreviewText(text);
      setPreviewTitle(title);
      setPromptPreviewOpen(true);
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Erreur lors du chargement', type: 'error' });
    } finally {
      setLoadingAction(null);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-slate-500">Chargement des résultats d export...</div>;
  }

  if (error || !latestGen) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
        <p className="text-red-600 text-sm">{error || 'Aucun harnais généré'}</p>
        <Link
          href={`/projects/${projectId}/step-selection`}
          className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          ← Retourner à la sélection pour générer le paquet
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Navigation cliquable entre les étapes */}
      <StepNavigation
        projectId={projectId}
        currentStep={5}
        hasProfile={true}
        hasGeneration={true}
      />

      <div className="text-center space-y-1.5">
        <div className={`w-10 h-10 ${isUpgradeMode ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'} rounded-full flex items-center justify-center mx-auto text-lg font-bold shadow-xs`}>
          {isUpgradeMode ? '🔄' : '✓'}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Étape 5 — {isUpgradeMode ? 'Mise à Niveau & Déploiement' : 'Déploiement & Téléchargement'}
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Harnais prêt pour <strong>{project?.name}</strong> (Surface : {project?.targetSurface}).
        </p>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1 : Solutions idéales pour le Chat Web Antigravity (Anti-Blocage)  */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-indigo-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white mb-2">
              <Zap className="w-3.5 h-3.5" />
              <span>Optimisé pour le Chat Web & IDE Antigravity</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Déploiement direct dans la discussion Antigravity
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Évite la saturation du presse-papier et garantit zéro erreur de téléversement (Media upload).
            </p>
          </div>
        </div>

        {/* Option 1A : Commande One-Liner curl */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-100 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
              <strong className="text-slate-900 text-sm font-semibold">
                Méthode Express : Commande 1-Ligne
              </strong>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                Recommandée • Instantané
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Collez cette commande dans le chat de votre projet Antigravity. L'agent l'exécute dans son terminal : le script n'écrase jamais un fichier modifié ou non géré, sauvegarde ce qu'il remplace dans <code className="bg-white px-1.5 py-0.5 rounded text-indigo-700 font-mono border border-indigo-100">.agents/.harness-backup/</code> et vérifie l'installation :
          </p>

          {/* Terminal / Code Box avec bouton copier intégré */}
          <div className="w-full rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-sm">
            <div className="px-3.5 py-2 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80 inline-block" />
                <span className="ml-2 text-slate-400">terminal</span>
              </div>
              <button
                type="button"
                onClick={handleCopyCurl}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold rounded-md shadow-2xs transition-[background-color,transform] duration-120"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCurl ? 'Copié !' : 'Copier'}</span>
              </button>
            </div>
            <div className="p-3.5 overflow-x-auto text-emerald-400 font-mono text-xs whitespace-pre sm:whitespace-nowrap">
              <code>{curlCommand}</code>
            </div>
          </div>

          {/* Actions & Configuration d'hôte */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCurl}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs active:scale-[0.98] transition-[background-color,transform] duration-120"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCurl ? 'Commande copiée !' : 'Copier la commande curl'}</span>
              </button>
              <a
                href={`/api/projects/${projectId}/deploy.sh${tokenQuery}`}
                download="deploy.sh"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs active:scale-[0.98] transition-[background-color,transform] duration-120"
                title="Télécharger le fichier script shell directement"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Télécharger deploy.sh</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowHostInput(!showHostInput)}
              className="text-[11px] text-indigo-700 hover:text-indigo-900 font-medium inline-flex items-center gap-1 hover:underline"
            >
              <span>{showHostInput ? '▾ Masquer options IP / Domaine' : '▸ Déploiement sur un autre serveur ? (IP / Domaine)'}</span>
            </button>
          </div>

          {showHostInput && (
            <div className="p-3 bg-white rounded-lg border border-indigo-150 text-xs space-y-2 animate-in fade-in duration-150">
              <label className="block text-slate-700 font-semibold">
                Adresse IP ou Domaine du serveur Antigravity Harness Builder :
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={customHost}
                  onChange={(e) => setCustomHost(e.target.value)}
                  placeholder="http://187.126.13.93:3000 ou https://mon-domaine.com"
                  className="flex-1 min-w-[200px] px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setCustomHost('http://187.126.13.93:3000')}
                  className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded border border-slate-200"
                >
                  Utiliser IP Publique
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Par défaut, la commande utilise l'adresse de votre navigateur (<code className="bg-slate-100 px-1 py-0.5 rounded">{originUrl || 'localhost'}</code>). Si vous lancez le curl depuis un autre serveur, indiquez l'adresse IP accessible depuis ce serveur distant.
              </p>
            </div>
          )}
        </div>

        {/* Option 1B : Commande One-Liner Base64 (100% Autonome & Hors-Ligne) */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50/60 to-slate-50 border border-emerald-100 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
              <strong className="text-slate-900 text-sm font-semibold">
                Méthode Hors-Ligne : Fichier deploy.sh autonome
              </strong>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                Zéro réseau requis
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Téléchargez le fichier <code className="bg-white px-1.5 py-0.5 rounded text-emerald-800 font-mono border border-emerald-100">deploy.sh</code>, glissez-le dans votre projet sur le serveur cible, puis demandez à l'agent : <code className="bg-slate-900 text-emerald-400 px-1.5 py-0.5 rounded font-mono">bash deploy.sh</code>. Il s'exécute en 0,1 seconde et fonctionne sans aucune connexion internet.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <a
              href={`/api/projects/${projectId}/deploy.sh${tokenQuery}`}
              download="deploy.sh"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white text-xs font-bold rounded-lg shadow-xs transition-[background-color,transform] duration-120"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger deploy.sh</span>
            </a>
            <button
              type="button"
              onClick={handleCopyCompact}
              disabled={loadingAction === 'compact'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 active:scale-[0.98] text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-[background-color,transform] duration-120"
            >
              {copiedCompact ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedCompact ? 'Base64 copié !' : 'Copier script Base64'}</span>
            </button>
            <button
              type="button"
              onClick={() => handlePreviewTarget('compact_base64', 'Script Compact Base64')}
              className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 hover:underline font-medium ml-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Aperçu Base64</span>
            </button>
          </div>
        </div>

        {/* Option 1C : Prompt Allégé Texte Brut */}
        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-6 h-6 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center shrink-0">3</span>
              <strong className="text-slate-900 text-sm font-semibold">
                Méthode Texte Brut Allégé
              </strong>
              <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                Markdown Essentiel
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Contient exclusivement les règles, skills, sous-agents et <code className="bg-white px-1 py-0.5 rounded text-slate-800 border border-slate-200 font-mono">AGENTS.md</code> en excluant les volumineuses documentations théoriques (<code className="text-slate-600 font-mono">docs/ECC_SOURCES.md</code>) pour rester sous le seuil d'upload du chat.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCopyLightweight}
              disabled={loadingAction === 'lightweight'}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 active:scale-[0.98] text-white text-xs font-bold rounded-lg shadow-xs transition-[background-color,transform] duration-120"
            >
              {copiedLightweight ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLightweight ? 'Prompt copié !' : 'Copier le Prompt Allégé'}</span>
            </button>
            <button
              type="button"
              onClick={() => handlePreviewTarget('lightweight_markdown', 'Prompt Markdown Allégé')}
              className="inline-flex items-center gap-1 text-xs text-slate-700 hover:text-slate-900 hover:underline font-medium ml-1"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Aperçu du prompt allégé</span>
            </button>
          </div>
        </div>

        {/* Aperçu rétractable */}
        {promptPreviewOpen && (
          <div className="p-4 bg-slate-900 rounded-xl text-slate-200 text-xs font-mono max-h-72 overflow-y-auto space-y-2 border border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-200">{previewTitle}</span>
              <button
                type="button"
                aria-label="Fermer l'aperçu"
                onClick={() => setPromptPreviewOpen(false)}
                className="text-slate-400 hover:text-white flex items-center gap-1"
              >
                <span>Fermer</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <pre className="whitespace-pre-wrap">{promptPreviewText || 'Chargement...'}</pre>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2 : Téléchargement Hors-Ligne & Fichiers Complets                  */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Téléchargements Hors-Ligne & Archives Complètes
          </h3>
          <span className="text-xs text-slate-500">Pour intégration locale manuelle</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Empreinte Déterministe SHA-256 du Harnais
            </span>
            <code className="text-xs font-mono font-bold text-slate-800 break-all select-all">
              {latestGen.zipSha256}
            </code>
          </div>
          <button
            onClick={async () => {
              if (await copyToClipboardSafe(latestGen.zipSha256)) {
                setCopiedSha(true);
                setTimeout(() => setCopiedSha(false), 2000);
              }
            }}
            className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 rounded-lg text-xs font-medium text-slate-700 shrink-0"
          >
            {copiedSha ? 'Copié ✓' : 'Copier le hash'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href={`/api/projects/${projectId}/download?target=zip`}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-xs transition-colors text-center"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Télécharger l'Archive .zip</span>
          </a>

          <a
            href={`/api/projects/${projectId}/download?target=${isUpgradeMode ? 'upgrade_markdown' : 'deploy_markdown'}`}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-xs transition-colors text-center"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isUpgradeMode ? 'upgrade-harness.md' : 'deploy-harness.md'}</span>
          </a>

          <a
            href={`/api/projects/${projectId}/deploy.sh`}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-xs transition-colors text-center"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Script deploy.sh (Bash)</span>
          </a>
        </div>
      </div>

      {/* Guide d'installation rapide */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-slate-900">
          Protocole de sécurité exécuté par l'agent Antigravity
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <strong className="text-slate-900 block font-semibold mb-1">1. Sauvegarde automatique</strong>
            <span>Avant de remplacer ou retirer un fichier, une copie horodatée est créée dans <code className="bg-white px-1 py-0.5 rounded">.agents/.harness-backup/</code>. Un fichier modifié ou non géré n'est jamais écrasé.</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <strong className="text-slate-900 block font-semibold mb-1">2. Déploiement & Fusion</strong>
            <span>Les compétences, règles et sous-agents sont installés. Les directives propres à votre équipe dans AGENTS.md sont conservées.</span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <strong className="text-slate-900 block font-semibold mb-1">3. Nettoyage & Tests</strong>
            <span>Les anciens dossiers obsolètes (.agents/workflows/) sont archivés et le smoke test de validation du projet est exécuté.</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Link
          href={`/projects/${projectId}/step-preview`}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Retour à la prévisualisation
        </Link>

        <Link
          href="/projects"
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
        >
          Retour au tableau de bord des projets →
        </Link>
      </div>

      {/* Notification Toast */}
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
