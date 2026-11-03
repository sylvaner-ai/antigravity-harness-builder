'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ToastNotification from '@/components/ui/ToastNotification';
import {
  Plus,
  Search,
  Copy,
  Archive,
  Trash2,
  FolderArchive,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface ProjectItem {
  id: string;
  name: string;
  description: string;
  targetSurface: 'APP' | 'IDE' | 'CLI';
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  hasProfile?: boolean;
  hasGeneration?: boolean;
}

export default function ProjectsDashboardPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [surfaceFilter, setSurfaceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  // État de la modale de confirmation accessible
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'primary';
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects?status=${statusFilter}`);
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      setProjects(data.projects || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  const handleDuplicate = (project: ProjectItem) => {
    setModalConfig({
      isOpen: true,
      title: `Dupliquer "${project.name}" ?`,
      message: 'Un nouveau projet identique sera créé avec une copie de tous les documents et profils.',
      confirmText: 'Dupliquer',
      variant: 'primary',
      action: async () => {
        try {
          setActionLoading(true);
          const res = await fetch(`/api/projects/${project.id}/duplicate`, { method: 'POST' });
          if (!res.ok) throw new Error('Échec de la duplication');
          setToast({ message: `Projet "${project.name}" dupliqué avec succès.`, type: 'success' });
          await fetchProjects();
        } catch (err: unknown) {
          setToast({ message: err instanceof Error ? err.message : 'Erreur', type: 'error' });
        } finally {
          setActionLoading(false);
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleArchive = async (id: string, currentStatus: string, name: string) => {
    try {
      const nextStatus = currentStatus === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Échec de la modification');
      setToast({
        message: nextStatus === 'ARCHIVED' ? `Projet "${name}" archivé.` : `Projet "${name}" restauré.`,
        type: 'info',
      });
      await fetchProjects();
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : 'Erreur', type: 'error' });
    }
  };

  const handleDelete = (project: ProjectItem) => {
    setModalConfig({
      isOpen: true,
      title: `Supprimer définitivement "${project.name}" ?`,
      message: 'Attention : cette action est irréversible. Tous les documents sources, profils et artefacts générés seront définitivement supprimés.',
      confirmText: 'Supprimer définitivement',
      variant: 'danger',
      action: async () => {
        try {
          setActionLoading(true);
          const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Échec de la suppression');
          setToast({ message: `Projet "${project.name}" supprimé.`, type: 'info' });
          await fetchProjects();
        } catch (err: unknown) {
          setToast({ message: err instanceof Error ? err.message : 'Erreur', type: 'error' });
        } finally {
          setActionLoading(false);
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesSurface = surfaceFilter === 'ALL' || p.targetSurface === surfaceFilter;
    return matchesSearch && matchesSurface;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Projets</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Générez et déployez vos harnais de développement pour Google Antigravity.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-medium rounded-lg text-sm shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Projet</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            aria-label="Rechercher un projet"
            placeholder="Rechercher un projet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={surfaceFilter}
            onChange={(e) => setSurfaceFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-700"
          >
            <option value="ALL">Toutes les surfaces</option>
            <option value="APP">Antigravity App</option>
            <option value="IDE">Antigravity IDE</option>
            <option value="CLI">Antigravity CLI (agy)</option>
          </select>

          <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50 p-0.5">
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Actifs
            </button>
            <button
              onClick={() => setStatusFilter('ARCHIVED')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                statusFilter === 'ARCHIVED'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Archivés
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Chargement des projets...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 p-8">
          <p className="text-slate-500 text-sm">Aucun projet trouvé.</p>
          <Link
            href="/projects/new"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            <span>Créer un premier projet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((proj) => (
            <div
              key={proj.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      proj.targetSurface === 'APP'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : proj.targetSurface === 'IDE'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    Antigravity {proj.targetSurface}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(proj.updatedAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>

                <h3 className="font-semibold text-slate-900 text-sm">{proj.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {proj.description || 'Aucune description.'}
                </p>

                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  {proj.hasGeneration ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Harnais prêt
                    </span>
                  ) : proj.hasProfile ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-purple-600" />
                      Profil extrait
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      Import requis
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={
                      proj.hasGeneration
                        ? `/projects/${proj.id}/step-export`
                        : proj.hasProfile
                          ? `/projects/${proj.id}/step-selection`
                          : `/projects/${proj.id}/step-import`
                    }
                    className={`font-semibold px-3 py-1.5 rounded-lg text-center transition-all truncate text-xs ${
                      proj.hasGeneration
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {proj.hasGeneration
                      ? 'Déployer →'
                      : proj.hasProfile
                        ? 'Composer →'
                        : 'Démarrer →'}
                  </Link>

                  <div className="flex items-center space-x-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(proj)}
                      aria-label={`Dupliquer le projet ${proj.name}`}
                      title="Dupliquer le projet"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 active:scale-95 rounded-lg transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchive(proj.id, proj.status, proj.name)}
                      aria-label={proj.status === 'ACTIVE' ? `Archiver ${proj.name}` : `Restaurer ${proj.name}`}
                      title={proj.status === 'ACTIVE' ? 'Archiver' : 'Restaurer'}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 active:scale-95 rounded-lg transition-all"
                    >
                      {proj.status === 'ACTIVE' ? (
                        <Archive className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <FolderArchive className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(proj)}
                      aria-label={`Supprimer définitivement ${proj.name}`}
                      title="Supprimer définitivement"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Étapes cliquables */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 pt-1 border-t border-slate-50">
                  <span className="shrink-0 text-slate-400">Étapes :</span>
                  <Link href={`/projects/${proj.id}/step-import`} className="hover:text-indigo-600 hover:underline">1. Import</Link>
                  <span>·</span>
                  <Link href={`/projects/${proj.id}/step-profile`} className="hover:text-indigo-600 hover:underline">2. Profil</Link>
                  <span>·</span>
                  <Link href={`/projects/${proj.id}/step-selection`} className="hover:text-indigo-600 hover:underline">3. Composition</Link>
                  <span>·</span>
                  <Link href={`/projects/${proj.id}/step-preview`} className="hover:text-indigo-600 hover:underline">4. Code</Link>
                  <span>·</span>
                  <Link href={`/projects/${proj.id}/step-export`} className="hover:text-indigo-600 hover:underline">5. Export</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale de confirmation accessible */}
      <ConfirmModal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        variant={modalConfig.variant}
        loading={actionLoading}
        onConfirm={modalConfig.action}
        onCancel={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />

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
