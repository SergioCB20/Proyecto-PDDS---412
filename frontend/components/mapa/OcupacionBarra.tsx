'use client';

import { colorVueloPorOcupacion } from '@/lib/colors';
import type { UmbralesConfig } from './ConfigUmbrales';

interface OcupacionBarraProps {
  /** Unidades ocupadas (capacidad − disponible). */
  ocupada: number;
  /** Capacidad total. */
  total: number;
  umbralesConfig?: UmbralesConfig;
  className?: string;
}

/**
 * Barra de ocupación reutilizable para tooltips/popups de vuelos. Usa la MISMA
 * función de color que los marcadores del mapa (colorVueloPorOcupacion), para que
 * el color de la barra coincida siempre con el semáforo del avión/aeropuerto.
 * Antes esta barra estaba duplicada en AvionAnimado y GeoMapaVuelo con lógicas de
 * color ligeramente distintas.
 */
export default function OcupacionBarra({
  ocupada,
  total,
  umbralesConfig,
  className = '',
}: OcupacionBarraProps) {
  const pct = total > 0 ? (ocupada / total) * 100 : 0;
  const color = colorVueloPorOcupacion(pct, umbralesConfig);
  return (
    <div
      className={`w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden ${className}`}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}
