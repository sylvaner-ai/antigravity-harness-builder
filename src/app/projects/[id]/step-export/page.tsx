'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';

export default function StepExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);

  const [project, setProject] = useState<any>(null);
  const [generations, setGenerations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleCopySha = (sha: string) => {
    navigator.clipboard.writeText(sha);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      {/* Fil d'Ariane des étapes */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 text-xs font-semibold">
        <span className="text-slate-400">1. Import des Documents</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-400">2. Profil Extrait & Épistémique</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-400">3. Composition du Harnais</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-400">4. Prévisualisation & Code</span>
        <span className="text-slate-300">→</span>
        <span className="text-indigo-600 font-bold">5. Téléchargement</span>
      </div>

      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold shadow-sm">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          Votre Harnais Antigravity est Prêt !
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Le harnais déterministe pour <strong>{project?.name}</strong> (Antigravity {project?.targetSurface}) a été assemblé et validé avec succès.
        </p>
      </div>

      {/* Carte principale de téléchargement */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Empreinte d Intégrité Déterministe (SHA-256)
            </span>
            <code className="text-xs font-mono font-bold text-slate-800 break-all select-all">
              {latestGen.zipSha256}
            </code>
          </div>
          <button
            onClick={() => handleCopySha(latestGen.zipSha256)}
            className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 rounded-lg text-xs font-medium text-slate-700 shrink-0"
          >
            {copied ? 'Copié ✓' : 'Copier le hash'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href={`/api/projects/${projectId}/download?target=zip`}
            className="flex items-center justify-center px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-colors text-center"
          >
            📦 Télécharger l archive complète (.zip)
          </a>

          <a
            href={`/api/projects/${projectId}/download?target=start_here`}
            className="flex items-center justify-center px-6 py-3.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-sm transition-colors text-center"
          >
            📄 Télécharger uniquement START_HERE.md
          </a>
        </div>
      </div>

      {/* Guide d'installation rapide */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-slate-900">
          Comment utiliser votre harnais dans Google Antigravity ?
        </h3>

        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <strong>1. Extraction :</strong>
            <p className="mt-1 font-mono text-[11px] text-slate-800">
              unzip -o {project?.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.zip -d /chemin/vers/votre/projet
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <strong>2. Ouverture dans Antigravity :</strong>
            <p className="mt-1">
              Ouvrez le dossier dans <strong>Google Antigravity ({project?.targetSurface})</strong>. Les règles d ingénierie de <code>.agents/rules/</code> et compétences de <code>.agents/skills/</code> sont reconnues immédiatement.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <strong>3. Slash Commands Recommandées :</strong>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>
                <code className="font-bold">/teamwork</code> : Lancer la collaboration multi-agents en suivant le plan défini dans <code>docs/ORCHESTRATION.md</code>.
              </li>
              <li>
                <code className="font-bold">/goal</code> : Lancer une session au long cours autonome pour exécuter une tâche critique sans arrêt intermédiaire.
              </li>
              <li>
                <code className="font-bold">/plan</code> : Consulter et affiner la décomposition atomique des tâches.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Historique des générations */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-slate-900">Historique des Générations</h3>

        <div className="space-y-2">
          {generations.map((g, idx) => (
            <div
              key={g.id}
              className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
            >
              <div>
                <span className="font-semibold text-slate-800">Génération #{generations.length - idx}</span>
                <span className="text-slate-500 ml-2">Mode : {g.presetMode}</span>
                <span className="text-slate-400 ml-2">
                  ({new Date(g.createdAt).toLocaleString('fr-FR')})
                </span>
              </div>
              <code className="font-mono text-slate-600 text-[11px]">
                {g.zipSha256?.slice(0, 12)}...
              </code>
            </div>
          ))}
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
    </div>
  );
}
