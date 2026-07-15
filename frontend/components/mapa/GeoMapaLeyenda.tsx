'use client';

import { X } from 'lucide-react';
import type { UmbralesConfig } from './ConfigUmbrales';
import { COLOR_AEROPUERTO } from '@/lib/colors';

interface Props {
  umbralesConfig?: UmbralesConfig;
  onClose?: () => void;
}

/** Punto de color reutilizable — usa los MISMOS colores que los marcadores del
 *  mapa (COLOR_AEROPUERTO), garantizando que la leyenda coincida con el semáforo
 *  de ocupación (aplica tanto a aeropuertos como a aviones). */
function Swatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block shrink-0 w-3 h-3 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

/** Muestra de estela: los rastros de vuelo se dibujan como líneas oscuras
 *  (sólida = en ruta, punteada = completado). Color slate-500 visible en claro y
 *  oscuro. */
function LineSwatch({ dashed = false }: { dashed?: boolean }) {
  return (
    <span
      className="inline-block shrink-0 w-3.5"
      style={{ borderTop: `2px ${dashed ? 'dashed' : 'solid'} #64748b` }}
    />
  );
}

export default function GeoMapaLeyenda({ umbralesConfig, onClose }: Props) {
  const vm = umbralesConfig?.verdeMax ?? 70;
  const am = umbralesConfig?.ambarMax ?? 90;

  return (
    <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold uppercase tracking-wide text-[0.7rem] text-slate-500 dark:text-slate-400">
          Ocupación
        </span>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Ocultar leyenda"
            className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Swatch color={COLOR_AEROPUERTO.VERDE} />
          <span className="text-slate-600 dark:text-slate-300">&lt; {vm}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Swatch color={COLOR_AEROPUERTO.AMBAR} />
          <span className="text-slate-600 dark:text-slate-300">{vm}–{am}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Swatch color={COLOR_AEROPUERTO.ROJO} />
          <span className="text-slate-600 dark:text-slate-300">&gt; {am}%</span>
        </div>
      </div>
      <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
        <div className="font-semibold uppercase tracking-wide text-[0.7rem] text-slate-500 dark:text-slate-400 mb-2">
          Rutas
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <LineSwatch />
            <span className="text-slate-600 dark:text-slate-300">En ruta</span>
          </div>
          <div className="flex items-center gap-2">
            <LineSwatch dashed />
            <span className="text-slate-600 dark:text-slate-300">Completado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
