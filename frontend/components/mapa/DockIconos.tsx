'use client';

import { ChevronLeft, Menu } from 'lucide-react';

export interface SeccionDock {
  id: string;
  icon: React.ElementType;
  label: string;
}

interface DockIconosProps {
  secciones: SeccionDock[];
  abiertas: Set<string>;
  onToggle: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function DockIconos({
  secciones,
  abiertas,
  onToggle,
  collapsed,
  onToggleCollapse,
}: DockIconosProps) {
  return (
    <div className="flex flex-col items-center gap-1 py-2 px-1">
      <button
        onClick={onToggleCollapse}
        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 hover:text-slate-600 dark:hover:text-slate-300"
        title={collapsed ? 'Expandir dock' : 'Colapsar dock'}
      >
        {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
      </button>
      <div className="w-8 border-t border-slate-200 dark:border-slate-700 my-1" />
      {secciones.map((seccion) => {
        const Icon = seccion.icon;
        const activa = abiertas.has(seccion.id);
        return (
          <button
            key={seccion.id}
            onClick={() => onToggle(seccion.id)}
            className={`p-2 rounded-lg transition-colors ${
              activa
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                : 'text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title={seccion.label}
          >
            <Icon size={18} />
          </button>
        );
      })}
    </div>
  );
}
