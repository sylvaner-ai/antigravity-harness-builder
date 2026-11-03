'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  id?: string;
  type?: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
  durationMs?: number;
}

export default function ToastNotification({
  type = 'info',
  message,
  onClose,
  durationMs = 4000,
}: ToastProps) {
  useEffect(() => {
    if (!durationMs) return;
    const timer = setTimeout(() => {
      onClose();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onClose]);

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />,
    info: <Info className="w-4 h-4 text-indigo-600 shrink-0" />,
  };

  const bgStyles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    error: 'bg-red-50 border-red-200 text-red-900',
    info: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-3.5 py-2.5 bg-white rounded-xl shadow-lg shadow-slate-900/8 border border-slate-200/90 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150 ease-out max-w-sm"
    >
      <div className={`p-1 rounded-lg ${bgStyles[type]}`}>
        {icons[type]}
      </div>
      <p className="flex-1 pr-1 text-slate-800 leading-tight">{message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer la notification"
        className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-95 transition-[color,background-color,transform] duration-120"
        title="Fermer la notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
