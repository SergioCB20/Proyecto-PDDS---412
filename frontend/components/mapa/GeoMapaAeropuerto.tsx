'use client';

import { useEffect, useRef } from 'react';
import { CircleMarker, Tooltip, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { AeropuertoEnMapa } from '@/lib/types';

interface GeoMapaAeropuertoProps {
  aeropuerto: AeropuertoEnMapa;
}

export default function GeoMapaAeropuerto({ aeropuerto }: GeoMapaAeropuertoProps) {
  const radius = Math.max(5, Math.min(11, aeropuerto.ocupacionPorcentaje / 12 + 4));
  const circleRef = useRef<L.CircleMarker>(null);

  // react-leaflet does not reactively update `radius` or `pathOptions` on re-render
  // for CircleMarker — we drive updates imperatively so every tick is reflected.
  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;
    circle.setRadius(radius);
    circle.setStyle({ color: aeropuerto.color, fillColor: aeropuerto.color });
  }, [radius, aeropuerto.color]);

  return (
    <CircleMarker
      ref={circleRef}
      center={[aeropuerto.latitud, aeropuerto.longitud]}
      radius={radius}
      pathOptions={{
        color: aeropuerto.color,
        fillColor: aeropuerto.color,
        fillOpacity: 0.8,
        weight: 2,
      }}
    >
      {/* Etiqueta compacta permanente: solo IATA + % en una línea, para que
          no se solapen con tantos aeropuertos. El detalle va en el popup. */}
      <Tooltip permanent direction="top" offset={[0, -radius - 2]} className="aeropuerto-label">
        <span className="font-bold">{aeropuerto.codigo_iata}</span>
        <span className="ml-1 font-semibold" style={{ color: aeropuerto.color }}>
          {aeropuerto.ocupacionPorcentaje.toFixed(0)}%
        </span>
      </Tooltip>
      <Popup>
        <div className="text-center min-w-[120px]">
          <div className="font-bold text-sm">{aeropuerto.codigo_iata}</div>
          <div className="text-xs text-slate-600">
            {aeropuerto.ocupacion_actual}/{aeropuerto.capacidad_almacen}
          </div>
          <div className="text-xs font-semibold" style={{ color: aeropuerto.color }}>
            {aeropuerto.ocupacionPorcentaje.toFixed(0)}% ocupado
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(aeropuerto.ocupacionPorcentaje, 100)}%`,
                backgroundColor: aeropuerto.color,
              }}
            />
          </div>
        </div>
      </Popup>
    </CircleMarker>
  );
}
