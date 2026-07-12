'use client';

import { X } from 'lucide-react';
import { formatearFechaHora, formatearFechaHoraSinSeg, formatearDiaYHora } from '@/lib/formatearHora';

interface TiemposInfoProps {
  inicioRealMs: number;
  inicioSimuladoISO: string;
  actualSimulado?: string | null;
  onClose?: () => void;
}

export default function TiemposInfo({ inicioRealMs, inicioSimuladoISO, actualSimulado, onClose }: TiemposInfoProps) {
  const inicioRealStr = inicioRealMs > 0
    ? formatearFechaHoraSinSeg(new Date(inicioRealMs).toISOString())
    : '-';
  const inicioSimuladoStr = formatearFechaHoraSinSeg(inicioSimuladoISO);
  const actualRealStr = formatearFechaHora(new Date().toISOString());
  const actualSimuladoStr = formatearDiaYHora(inicioSimuladoISO, actualSimulado);

  return (
    <div className="pointer-events-auto relative p-2 rounded-lg bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm shadow border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 shadow-sm z-10"
        >
          <X size={10} />
        </button>
      )}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="whitespace-nowrap">
          <span className="font-medium text-slate-700 dark:text-slate-300">Inicio R:</span> {inicioRealStr}
        </span>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <span className="whitespace-nowrap">
          <span className="font-medium text-slate-700 dark:text-slate-300">Inicio S:</span> {inicioSimuladoStr}
        </span>

        <span className="w-px h-3 bg-slate-300 dark:bg-slate-600 mx-0.5" />

        <span className="whitespace-nowrap">
          <span className="font-medium text-slate-700 dark:text-slate-300">Actual R:</span> {actualRealStr}
        </span>

        <span className="w-px h-3 bg-slate-300 dark:bg-slate-600 mx-0.5" />

        <span className="whitespace-nowrap">
          <span className="font-medium text-slate-700 dark:text-slate-300">Actual S:</span> {actualSimuladoStr}
        </span>
      </div>
    </div>
  );
}
