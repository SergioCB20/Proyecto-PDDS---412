'use client';

import { X } from 'lucide-react';
import { formatearFechaHora, formatearFechaHoraSinSeg, formatearDiaYHora } from '@/lib/formatearHora';

interface TiemposInfoProps {
  inicioRealMs: number;
  inicioSimuladoISO: string;
  actualSimulado?: string | null;
  onClose?: () => void;
}

/** Duración legible (Xd Yh Zm) a partir de milisegundos. */
function formatearDuracion(ms: number): string {
  if (!isFinite(ms) || ms < 0) return '-';
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function Fila({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[9px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</span>
      <span className="font-mono text-[11px] font-medium text-slate-700 dark:text-slate-200 text-right truncate">{value}</span>
    </div>
  );
}

function Recuadro({ titulo, color, inicio, actual, duracion }: {
  titulo: string; color: string; inicio: string; actual: string; duracion: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/40 px-2.5 py-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{titulo}</span>
      </div>
      <div className="space-y-0.5">
        <Fila label="Inicio" value={inicio} />
        <Fila label="Actual" value={actual} />
        <Fila label="Duración" value={duracion} />
      </div>
    </div>
  );
}

/**
 * Panel de tiempos agrupado por TIPO en recuadros verticales: "Simulada" (virtual) y "Real",
 * cada uno con Inicio, Actual y Duración.
 */
export default function TiemposInfo({ inicioRealMs, inicioSimuladoISO, actualSimulado, onClose }: TiemposInfoProps) {
  const nowMs = new Date().getTime();

  const inicioRealStr = inicioRealMs > 0 ? formatearFechaHoraSinSeg(new Date(inicioRealMs).toISOString()) : '-';
  const actualRealStr = formatearFechaHora(new Date().toISOString());
  const duracionReal = inicioRealMs > 0 ? formatearDuracion(nowMs - inicioRealMs) : '-';

  const inicioSimuladoStr = formatearFechaHoraSinSeg(inicioSimuladoISO);
  const actualSimuladoStr = formatearDiaYHora(inicioSimuladoISO, actualSimulado);
  const inicioSimMs = new Date(inicioSimuladoISO).getTime();
  const actualSimMs = actualSimulado ? new Date(actualSimulado).getTime() : inicioSimMs;
  const duracionSim = isFinite(inicioSimMs) && isFinite(actualSimMs)
    ? formatearDuracion(actualSimMs - inicioSimMs) : '-';

  return (
    <div className="pointer-events-auto relative w-44 p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-700">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 shadow-sm z-10"
        >
          <X size={10} />
        </button>
      )}
      <div className="space-y-1.5">
        <Recuadro titulo="Simulada" color="bg-blue-500" inicio={inicioSimuladoStr} actual={actualSimuladoStr} duracion={duracionSim} />
        <Recuadro titulo="Real" color="bg-emerald-500" inicio={inicioRealStr} actual={actualRealStr} duracion={duracionReal} />
      </div>
    </div>
  );
}
