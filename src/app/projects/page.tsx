'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface ProjectItem {
  id: string;
  name: string;
  description: string;
  targetSurface: 'APP' | 'IDE' | 'CLI';
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export default function ProjectsDashboardPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [surfaceFilter, setSurfaceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

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

  const handleDuplicate = async (id: string) => {
    if (!confirm('Dupliquer ce projet ?')) return;
    await fetch(`/api/projects/${id}/duplicate`, { method: 'POST' });
    fetchProjects();
  };

  const handleArchive = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    fetchProjects();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer définitivement ce projet et ses documents ?')) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    fetchProjects();
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
          <h1 className="text-2xl font-bold text-slate-900">Tableau de bord des Projets</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérez vos spécifications et générez des harnais certifiés pour Google Antigravity.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow-sm transition-colors"
        >
          + Nouveau Projet
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Rechercher un projet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={surfaceFilter}
            onChange={(e) => setSurfaceFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="ALL">Toutes les surfaces</option>
            <option value="APP">Antigravity App</option>
            <option value="IDE">Antigravity IDE</option>
            <option value="CLI">Antigravity CLI (agy)</option>
          </select>

          <div className="flex rounded-lg border border-slate-300 overflow-hidden">
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 text-xs font-medium ${
                statusFilter === 'ACTIVE'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Actifs
            </button>
            <button
              onClick={() => setStatusFilter('ARCHIVED')}
              className={`px-3 py-1 text-xs font-medium ${
                statusFilter === 'ARCHIVED'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Archivés
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Chargement des projets...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300 p-8">
          <p className="text-slate-500 text-sm">Aucun projet ne correspond à vos critères.</p>
          <Link
            href="/projects/new"
            className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Créer votre premier projet →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((proj) => (
            <div
              key={proj.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      proj.targetSurface === 'APP'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : proj.targetSurface === 'IDE'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    Antigravity {proj.targetSurface}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(proj.updatedAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>

                <h3 className="font-semibold text-slate-900 text-base">{proj.name}</h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                  {proj.description || 'Aucune description.'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link
                  href={`/projects/${proj.id}/step-import`}
                  className="font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Continuer l assistant →
                </Link>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDuplicate(proj.id)}
                    title="Dupliquer"
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    📋
                  </button>
                  <button
                    onClick={() => handleArchive(proj.id, proj.status)}
                    title={proj.status === 'ACTIVE' ? 'Archiver' : 'Restaurer'}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    📦
                  </button>
                  <button
                    onClick={() => handleDelete(proj.id)}
                    title="Supprimer"
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
