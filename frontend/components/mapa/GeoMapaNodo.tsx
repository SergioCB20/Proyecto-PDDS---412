'use client';

import { CircleMarker, Tooltip } from 'react-leaflet';
import type { NodoEnMapa } from '@/lib/types';

interface GeoMapaNodoProps {
  nodo: NodoEnMapa;
}

export default function GeoMapaNodo({ nodo }: GeoMapaNodoProps) {
  const radius = 10;

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
      <Tooltip permanent direction="top" offset={[0, -10]}>
        <div className="text-center">
          <div className="font-bold text-sm">{nodo.codigo_iata}</div>
          <div className="text-xs text-slate-600">{nodo.ocupacionPorcentaje.toFixed(0)}%</div>
        </div>
      </Tooltip>
    </CircleMarker>
  );
}