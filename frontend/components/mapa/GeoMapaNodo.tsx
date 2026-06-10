'use client';

import { CircleMarker, Tooltip } from 'react-leaflet';
import type { NodoEnMapa } from '@/lib/types';

interface GeoMapaNodoProps {
  nodo: NodoEnMapa;
}

export default function GeoMapaNodo({ nodo }: GeoMapaNodoProps) {
  const radius = Math.max(8, Math.min(18, nodo.ocupacionPorcentaje / 10 + 6));

  return (
    <CircleMarker
      center={[nodo.latitud, nodo.longitud]}
      radius={radius}
      pathOptions={{
        color: nodo.color,
        fillColor: nodo.color,
        fillOpacity: 0.8,
        weight: 2,
      }}
    >
      <Tooltip permanent direction="top" offset={[0, -radius - 6]}>
        <div className="text-center min-w-[80px]">
          <div className="font-bold text-sm">{nodo.codigo_iata}</div>
          <div className="text-xs text-slate-600">
            {nodo.ocupacion_actual}/{nodo.capacidad_almacen}
          </div>
          <div className="text-xs font-semibold" style={{ color: nodo.color }}>
            {nodo.ocupacionPorcentaje.toFixed(0)}%
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(nodo.ocupacionPorcentaje, 100)}%`,
                backgroundColor: nodo.color,
              }}
            />
          </div>
        </div>
      </Tooltip>
    </CircleMarker>
  );
}
