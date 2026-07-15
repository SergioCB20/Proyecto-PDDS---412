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
      <div className={`grid transition-all duration-300 ease-in-out ${collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
        <div className="overflow-hidden flex flex-col items-center gap-1">
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
                    ? 'bg-info/10 text-info ring-1 ring-info/25 dark:bg-info/20 dark:text-info-soft'
                    : 'text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={seccion.label}
              >
                <Icon size={18} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
