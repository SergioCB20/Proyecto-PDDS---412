'use client';

import { useMemo } from 'react';
import { Marker, Tooltip, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { AeropuertoEnMapa } from '@/lib/types';
import { ciudadDe, paisDe } from '@/lib/aeropuertos';

interface GeoMapaAeropuertoProps {
  aeropuerto: AeropuertoEnMapa;
  onClick?: (codigoIata: string) => void;
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
function crearIconoAeropuerto(color: string, size: number = 28) {
  const half = Math.round(size / 2);
  const svgSize = Math.round(size * 0.75);
  return L.divIcon({
    className: 'aeropuerto-icon',
    html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.35))"><svg viewBox="0 0 15 15" width="${svgSize}" height="${svgSize}" fill="${color}" xmlns="http://www.w3.org/2000/svg"><path d="M7.20938 0.0931333C7.38323 -0.0310444 7.61677 -0.0310444 7.79062 0.0931333L14.7906 5.09313C14.922 5.18699 15 5.33852 15 5.5V14.5C15 14.7761 14.7761 15 14.5 15H13V7H2V15H0.5C0.223858 15 0 14.7761 0 14.5V5.5C0 5.33852 0.0779828 5.18699 0.209381 5.09313L7.20938 0.0931333Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M3 15H12V11H3V15ZM9 13H6V12H9V13Z"/><path d="M12 10V8H3V10H12Z"/></svg></div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

export default function GeoMapaAeropuerto({ aeropuerto, onClick }: GeoMapaAeropuertoProps) {
  const icono = useMemo(
    () => crearIconoAeropuerto(aeropuerto.color, 56),
    [aeropuerto.color]
  );

  return (
    <Marker
      position={[aeropuerto.latitud, aeropuerto.longitud]}
      icon={icono}
      eventHandlers={{
        click: () => onClick?.(aeropuerto.codigo_iata),
      }}
    >
      <Tooltip direction="top" offset={[0, -16]} className="aeropuerto-label">
        <div className="text-center">
          <div className="font-bold text-sm">{ciudadDe(aeropuerto.codigo_iata)}</div>
          <div className="text-xs text-slate-600 font-mono">{aeropuerto.codigo_iata}</div>
          <span className="font-semibold text-xs" style={{ color: aeropuerto.color }}>
            {aeropuerto.ocupacionPorcentaje.toFixed(0)}%
          </span>
        </div>
      </Tooltip>
      <Popup>
        <div className="text-center min-w-[120px]">
          <div className="font-bold text-sm">{ciudadDe(aeropuerto.codigo_iata)}</div>
          <div className="text-sm text-slate-600">
            {[paisDe(aeropuerto.codigo_iata), aeropuerto.codigo_iata].filter(Boolean).join(' · ')}
          </div>
          <div className="text-xs text-slate-600 mt-1">
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
