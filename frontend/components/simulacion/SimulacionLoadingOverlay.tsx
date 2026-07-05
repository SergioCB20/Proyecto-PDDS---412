'use client';

import { Clock, Package, Plane, Loader2 } from 'lucide-react';

interface Props {
  visible: boolean;
}

export function SimulacionLoadingOverlay({ visible }: Props) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-[1300] flex flex-col items-center justify-center gap-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-opacity duration-300">
      <div className="flex items-center gap-3">
        <Loader2 size={32} className="text-blue-600 animate-spin" />
        <span className="text-base font-semibold text-slate-700 dark:text-slate-300">
          Inicializando simulación…
        </span>
      </div>

      <div className="flex items-center gap-6 text-xs text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-1.5">
          <Package size={14} />
          <span>Clonando equipajes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Plane size={14} />
          <span>Preparando vuelos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={14} />
          <span>Iniciando tick</span>
        </div>
      </div>

      <div className="w-48 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }} />
      </div>
    </div>
  );
}
