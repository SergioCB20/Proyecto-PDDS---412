'use client';

import { X } from 'lucide-react';
import type { UmbralesConfig } from './ConfigUmbrales';
import { COLOR_AEROPUERTO, type ColorSemaforo } from '@/lib/colors';

interface Props {
  umbralesConfig?: UmbralesConfig;
  onClose?: () => void;
  /** Colores de ocupación actualmente visibles en el mapa (aeropuertos/almacenes). */
  coloresVisibles?: Set<ColorSemaforo>;
  /** Si se provee, la sección "Ocupación" se vuelve un filtro de checkboxes. */
  onToggleColor?: (color: ColorSemaforo) => void;
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
      style={{ borderTop: `2px ${dashed ? 'dashed' : 'solid'} #94a3b8` }}
    />
  );
}

export default function GeoMapaLeyenda({ umbralesConfig, onClose, coloresVisibles, onToggleColor }: Props) {
  const vm = umbralesConfig?.verdeMax ?? 70;
  const am = umbralesConfig?.ambarMax ?? 90;

  const bandas: { color: ColorSemaforo; swatch: string; label: string }[] = [
    { color: 'VACIO', swatch: COLOR_AEROPUERTO.VACIO, label: 'Vacío (0%)' },
    { color: 'VERDE', swatch: COLOR_AEROPUERTO.VERDE, label: `< ${vm}%` },
    { color: 'AMBAR', swatch: COLOR_AEROPUERTO.AMBAR, label: `${vm}–${am}%` },
    { color: 'ROJO', swatch: COLOR_AEROPUERTO.ROJO, label: `> ${am}%` },
  ];

  const interactivo = !!onToggleColor && !!coloresVisibles;

  return (
    <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg p-3 text-xs">
      <div className="flex items-center justify-between mb-2 gap-3">
        <span className="font-semibold uppercase tracking-wide text-[0.7rem] text-slate-500 dark:text-slate-400">
          Ocupación{interactivo ? ' · almacenes' : ''}
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
        {bandas.map((b) =>
          interactivo ? (
            <label key={b.color} className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={coloresVisibles!.has(b.color)}
                onChange={() => onToggleColor!(b.color)}
                className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
              />
              <Swatch color={b.swatch} />
              <span className="text-slate-600 dark:text-slate-300">{b.label}</span>
            </label>
          ) : (
            <div key={b.color} className="flex items-center gap-2">
              <Swatch color={b.swatch} />
              <span className="text-slate-600 dark:text-slate-300">{b.label}</span>
            </div>
          ),
        )}
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
