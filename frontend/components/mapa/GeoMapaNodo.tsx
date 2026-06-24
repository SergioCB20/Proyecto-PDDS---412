'use client';

import { useEffect, useRef } from 'react';
import { CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { NodoEnMapa } from '@/lib/types';

interface GeoMapaNodoProps {
  nodo: NodoEnMapa;
}

export default function GeoMapaNodo({ nodo }: GeoMapaNodoProps) {
  const radius = Math.max(8, Math.min(18, nodo.ocupacionPorcentaje / 10 + 6));
  const circleRef = useRef<L.CircleMarker>(null);

  // react-leaflet does not reactively update `radius` or `pathOptions` on re-render
  // for CircleMarker — we drive updates imperatively so every tick is reflected.
  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;
    circle.setRadius(radius);
    circle.setStyle({ color: nodo.color, fillColor: nodo.color });
  }, [radius, nodo.color]);

  return (
    <CircleMarker
      ref={circleRef}
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
              className="h-full rounded-full transition-all duration-300"
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
