'use client';

import { useMemo } from 'react';
import type { VueloTelemetria } from '@/lib/types';
import { ciudadDe } from '@/lib/aeropuertos';

interface ResumenVuelosOperacionProps {
  vuelos: VueloTelemetria[];
}

export function ResumenVuelosOperacion({ vuelos }: ResumenVuelosOperacionProps) {
  const activos = vuelos.filter(v => v.estado === 'EN_RUTA').length;
  const programados = vuelos.filter(v => v.estado === 'PROGRAMADO').length;

  const porAeropuerto = useMemo(() => {
    const map = new Map<string, { activos: number; programados: number }>();
    for (const v of vuelos) {
      if (v.estado !== 'EN_RUTA' && v.estado !== 'PROGRAMADO') continue;
      const entry = map.get(v.origen_iata) ?? { activos: 0, programados: 0 };
      if (v.estado === 'EN_RUTA') entry.activos++;
      if (v.estado === 'PROGRAMADO') entry.programados++;
      map.set(v.origen_iata, entry);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].activos - a[1].activos);
  }, [vuelos]);

  return (
    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
        Resumen de Vuelos
      </h3>
      <div className="flex gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-slate-500">Activos</span>
          <span className="ml-auto text-lg font-bold text-green-600">{activos}</span>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs text-slate-500">Prog.</span>
          <span className="ml-auto text-lg font-bold text-blue-600">{programados}</span>
        </div>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto text-sm">
        {porAeropuerto.map(([iata, cnt]) => (
          <div key={iata} className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-800/50">
            <span className="font-medium text-slate-700 dark:text-slate-300 truncate flex items-center gap-1.5 min-w-0" title={iata}>
              <span className="truncate">{ciudadDe(iata)}</span>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">{iata}</span>
            </span>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-green-600 font-semibold">{cnt.activos}</span>
              </span>
              <span className="text-slate-300">/</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-blue-600 font-semibold">{cnt.programados}</span>
              </span>
            </div>
          </div>
        ))}
        {porAeropuerto.length === 0 && (
          <p className="text-xs text-slate-400 italic text-center py-2">Sin datos de vuelos</p>
        )}
      </div>
    </div>
  );
}
