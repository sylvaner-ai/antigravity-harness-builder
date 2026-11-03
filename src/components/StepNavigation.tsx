'use client';

import React from 'react';
import Link from 'next/link';

export interface StepNavigationProps {
  projectId: string;
  currentStep: 1 | 2 | 3 | 4 | 5;
  hasProfile?: boolean;
  hasGeneration?: boolean;
}

const STEPS = [
  { step: 1, label: '1. Import', path: 'step-import' },
  { step: 2, label: '2. Profil & Stack', path: 'step-profile' },
  { step: 3, label: '3. Composition', path: 'step-selection' },
  { step: 4, label: '4. Prévisualisation', path: 'step-preview' },
  { step: 5, label: '5. Déploiement', path: 'step-export' },
] as const;

export default function StepNavigation({
  projectId,
  currentStep,
  hasProfile = true,
  hasGeneration = false,
}: StepNavigationProps) {
  const isAccessible = (step: number) => {
    if (step === 1) return true;
    if (step === 2) return hasProfile || hasGeneration;
    return hasGeneration || (hasProfile && step <= 3);
  };

  return (
    <div className="space-y-3">
      {/* Barre de navigation principale cliquable */}
      <nav aria-label="Étapes du projet" className="bg-white rounded-xl border border-slate-200 p-2 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2 text-xs font-medium">
          {STEPS.map((s, idx) => {
            const isCurrent = s.step === currentStep;
            const accessible = isAccessible(s.step);

            return (
              <React.Fragment key={s.step}>
                {accessible ? (
                  <Link
                    href={`/projects/${projectId}/${s.path}`}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg active:scale-[0.98] transition-[background-color,color,box-shadow,transform] duration-120 ease-out ${
                      isCurrent
                        ? 'bg-indigo-600 text-white font-bold shadow-xs'
                        : 'text-slate-600 hover:text-indigo-600 hover:bg-slate-50'
                    }`}
                    title={`Naviguer vers l'étape ${s.step}`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCurrent
                          ? 'bg-white text-indigo-600'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {s.step}
                    </span>
                    <span className="hidden sm:inline">{s.label.replace(/^\d+\.\s*/, '')}</span>
                    <span className="sm:hidden">{s.label.split(' ')[1] || s.label}</span>
                  </Link>
                ) : (
                  <span
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-400 cursor-not-allowed opacity-60"
                    title="Cette étape sera débloquée après l'extraction du profil"
                  >
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-100 text-slate-400">
                      {s.step}
                    </span>
                    <span className="hidden sm:inline">{s.label.replace(/^\d+\.\s*/, '')}</span>
                    <span className="sm:hidden">{s.label.split(' ')[1] || s.label}</span>
                  </span>
                )}

                {idx < STEPS.length - 1 && (
                  <span className="text-slate-300 font-normal select-none">→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </nav>

      {/* Raccourci rapide si le harnais est déjà généré et qu'on n'est pas sur l'étape 5 */}
      {hasGeneration && currentStep !== 5 && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-medium">Harnais prêt au déploiement</span>
          </div>
          <Link
            href={`/projects/${projectId}/step-export`}
            className="font-semibold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1"
          >
            <span>Aller à l'Étape 5 →</span>
          </Link>
        </div>
      )}
    </div>
  );
}
