'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Marker, Tooltip, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { AeropuertoEnMapa } from '@/lib/types';

interface GeoMapaAeropuertoProps {
  aeropuerto: AeropuertoEnMapa;
}

/**
 * Icono de aeropuerto: torre de control estilizada dentro de un cuadro redondeado
 * cuyo relleno cambia al color de ocupacion actual. Tamano objetivo 2x el icono
 * de vuelo (~11 px a zoom mundial) para que se distinga sin saturar el mapa.
 *
 *   v0.1 — antes era un cuadrado 48px con el codigo IATA en texto gigante; eso
 *   obligaba a reducir el zoom para ver el mundo entero y los iconos de vuelo
 *   quedaban diminutos frente a cada aeropuerto. Ahora el tamano es 22 px y la
 *   meta visual se cumple con un simbolo reconocible + color.
 */
function crearIconoAeropuerto(color: string, size: number = 22) {
  const half = Math.round(size / 2);
  const border = Math.max(1, Math.round(size * 0.09));
  const svgSize = Math.round(size * 0.6);
  return L.divIcon({
    className: 'aeropuerto-icon',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:${Math.round(size * 0.27)}px;border:${border}px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="${svgSize}" height="${svgSize}" fill="white" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M11 2 L13 2 L13 5 L18 5 L18 8 L13 8 L13 10 L20 13 L20 16 L11 14 L2 16 L2 13 L11 10 Z M9 17 L15 17 L15 22 L9 22 Z"/></svg></div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

export default function GeoMapaAeropuerto({ aeropuerto }: GeoMapaAeropuertoProps) {
  const icono = useMemo(
    () => crearIconoAeropuerto(aeropuerto.color),
    [aeropuerto.color]
  );

  return (
    <Marker
      position={[aeropuerto.latitud, aeropuerto.longitud]}
      icon={icono}
    >
      <Tooltip direction="top" offset={[0, -16]} className="aeropuerto-label">
        <div className="text-center">
          <div className="font-bold text-[11px]">{aeropuerto.codigo_iata}</div>
          <span className="font-semibold text-[10px]" style={{ color: aeropuerto.color }}>
            {aeropuerto.ocupacionPorcentaje.toFixed(0)}%
          </span>
        </div>
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
    </Marker>
  );
}
