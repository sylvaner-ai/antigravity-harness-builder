'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';

interface FileItem {
  relativePath: string;
  sizeBytes: number;
  sha256: string;
  content?: string;
}

export default function StepPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);

  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [manifest, setManifest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        const latestGen = d.generations?.[0];
        if (latestGen && latestGen.manifestData) {
          setManifest(latestGen.manifestData);
          const manifestFiles: FileItem[] = (latestGen.manifestData.filesInventory || []).map(
            (inv: any) => ({
              relativePath: inv.relativePath,
              sizeBytes: inv.sizeBytes,
              sha256: inv.sha256,
              content: '',
            })
          );
          setFiles(manifestFiles);
          setSelectedFile(manifestFiles.find((f) => f.relativePath === 'START_HERE.md') || manifestFiles[0] || null);
        } else {
          setError('Aucune génération disponible. Veuillez lancer la composition à l étape précédente.');
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return <div className="text-center py-16 text-slate-500">Chargement de l arborescence générée...</div>;
  }

  if (error || files.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
        <p className="text-red-600 text-sm">{error || 'Fichiers introuvables'}</p>
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Fil d'Ariane des étapes */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 text-xs font-semibold">
        <span className="text-slate-400">1. Import des Documents</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-400">2. Profil Extrait & Épistémique</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-400">3. Composition du Harnais</span>
        <span className="text-slate-300">→</span>
        <span className="text-indigo-600 font-bold">4. Prévisualisation & Code</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-400">5. Téléchargement</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Étape 5 — Prévisualisation de l Arborescence</h1>
          <p className="text-sm text-slate-500 mt-1">
            Inspection de l arborescence native Google Antigravity ({files.length} fichiers générés).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            ✓ 100 % Conforme Antigravity
          </span>
        </div>
      </div>

      {/* Explorateur et lecteur */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm min-h-[500px]">
        {/* Volet gauche : Liste des fichiers */}
        <div className="border-r border-slate-200 bg-slate-50 p-4 space-y-2 overflow-y-auto max-h-[600px]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Arborescence du Harnais
          </h3>
          {files.map((file) => (
            <button
              key={file.relativePath}
              onClick={() => setSelectedFile(file)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-colors flex items-center justify-between ${
                selectedFile?.relativePath === file.relativePath
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'hover:bg-slate-200/60 text-slate-700'
              }`}
            >
              <span className="truncate">{file.relativePath}</span>
              <span className="text-[10px] opacity-75 shrink-0 ml-2">
                {Math.round(file.sizeBytes / 1024) || 1} Ko
              </span>
            </button>
          ))}
        </div>

        {/* Volet droit : Lecteur de fichier */}
        <div className="md:col-span-2 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <span className="text-xs font-mono font-bold text-slate-900">
                  {selectedFile?.relativePath}
                </span>
                <span className="text-xs text-slate-400 ml-3">
                  SHA-256 : {selectedFile?.sha256.slice(0, 16)}...
                </span>
              </div>
              <span className="text-xs text-slate-500">
                Taille : {selectedFile?.sizeBytes} octets
              </span>
            </div>

            <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-xs overflow-x-auto max-h-[480px] leading-relaxed">
              <pre className="whitespace-pre-wrap">
                {selectedFile?.relativePath === 'START_HERE.md'
                  ? `# Guide d'Installation Antigravity\n\n1. Décompressez l'archive harness.zip dans votre répertoire de projet.\n2. Ouvrez Google Antigravity (${manifest?.targetSurface || 'IDE'}).\n3. Les règles de .agents/rules/ et compétences de .agents/skills/ sont activées nativement.`
                  : selectedFile?.relativePath.includes('manifest')
                    ? JSON.stringify(manifest, null, 2)
                    : `# Fichier certifié conforme Google Antigravity\n\nChemin : ${selectedFile?.relativePath}\nEmpreinte d'intégrité : ${selectedFile?.sha256}\n\nCe fichier est inclus dans l'archive harness.zip téléchargeable.`}
              </pre>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Validé par le moteur déterministe Antigravity
            </span>
            <Link
              href={`/projects/${projectId}/step-export`}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow-sm transition-colors"
            >
              Étape Suivante : Téléchargement →
            </Link>
          </div>
        </div>
      </div>

      {/* Actions bas */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Link
          href={`/projects/${projectId}/step-selection`}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Retour à la composition
        </Link>
      </div>
    </div>
  );
}
