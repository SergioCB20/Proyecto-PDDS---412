'use client';

import { Activity, XCircle, RefreshCw, Luggage, X } from 'lucide-react';

interface BarraMetricasCompactaProps {
  sla: number;
  cancelados: number;
  replanificadas: number;
  ocupacionGlobal: number;
  verdeMax: number;
  ambarMax: number;
  vuelosActivos: number;
  vuelosProgramados: number;
  maletasEntregadas?: number;
  equipajeFilter: 'todos' | 'con_equipaje' | 'sin_equipaje';
  onEquipajeFilterChange: (v: 'todos' | 'con_equipaje' | 'sin_equipaje') => void;
  onClose?: () => void;
}

export default function BarraMetricasCompacta({
  sla,
  cancelados,
  replanificadas,
  ocupacionGlobal,
  verdeMax,
  ambarMax,
  vuelosActivos,
  vuelosProgramados,
  maletasEntregadas,
  equipajeFilter,
  onEquipajeFilterChange,
  onClose,
}: BarraMetricasCompactaProps) {
  const colorOcup =
    ocupacionGlobal < verdeMax
      ? '#22c55e'
      : ocupacionGlobal < ambarMax
        ? '#eab308'
        : '#ef4444';

  return (
    <div className="absolute top-4 left-4 z-[1001] pointer-events-none flex flex-col gap-1">
      <div className="pointer-events-auto relative flex items-center gap-1 p-1.5 rounded-lg bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm shadow border border-slate-200 dark:border-slate-700">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 shadow-sm z-10"
          >
            <X size={10} />
          </button>
        )}
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/50">
          <Activity size={11} className="text-blue-600" />
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
            {(sla ?? 0).toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/50">
          <XCircle size={11} className="text-red-600" />
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
            {cancelados}
          </span>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/50">
          <RefreshCw size={11} className="text-amber-600" />
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
            {replanificadas}
          </span>
        </div>
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
        <div className="flex items-center gap-1.5 px-1.5 py-0.5">
          <div className="w-10 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(ocupacionGlobal, 100)}%`,
                backgroundColor: colorOcup,
              }}
            />
          </div>
          <span className="text-xs font-bold" style={{ color: colorOcup }}>
            {ocupacionGlobal.toFixed(1)}%
          </span>
        </div>
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
        <span className="text-xs text-slate-600 px-1">
          {vuelosActivos} act · {vuelosProgramados} prog
        </span>
        {maletasEntregadas !== undefined && (
          <>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />
            <span className="text-xs text-slate-600 px-1">
              {maletasEntregadas} mal
            </span>
          </>
        )}
      </div>
      <div className="pointer-events-auto flex items-center gap-1 p-1.5 rounded-lg bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm shadow border border-slate-200 dark:border-slate-700">
        <Luggage size={12} className="text-slate-600" />
        {(['todos', 'con_equipaje', 'sin_equipaje'] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => onEquipajeFilterChange(opt)}
            className={`px-1.5 py-0.5 text-xs font-medium rounded-md transition-colors ${
              equipajeFilter === opt
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                : 'text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200'
            }`}
          >
            {opt === 'todos'
              ? 'Todos'
              : opt === 'con_equipaje'
                ? 'Con eq'
                : 'Sin eq'}
          </button>
        ))}
      </div>
    </div>
  );
}
