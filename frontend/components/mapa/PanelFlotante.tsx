'use client';

import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface PanelFlotanteProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export default function PanelFlotante({
  title,
  onClose,
  children,
  className = '',
}: PanelFlotanteProps) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg flex flex-col overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
          {title}
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
