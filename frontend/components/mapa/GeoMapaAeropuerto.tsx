'use client';

import { useMemo, useState } from 'react';
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
function crearIconoAeropuerto(color: string, size: number = 28, hover: boolean = false) {
  const half = Math.round(size / 2);
  const border = Math.max(1, Math.round(size * 0.09));
  const svgSize = Math.round(size * 0.6);
  // Icono de avion (lucide "plane") superpuesto al pasar el mouse, ligeramente
  // mas grande que la torre para que se note la superposicion.
  const planeSize = Math.round(size * 1.15);
  const planeHtml = hover
    ? `<svg viewBox="0 0 24 24" width="${planeSize}" height="${planeSize}" fill="none" stroke="#0f172a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(45deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5))" xmlns="http://www.w3.org/2000/svg"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-1 .1-1.3.5l-.7.7c-.4.4-.3 1.1.2 1.4l5.9 3.3-1.5 2.6-3.1-.5c-.3 0-.6.1-.8.3l-.5.5c-.4.4-.3 1 .1 1.4l3.3 2.9 2.9 3.3c.4.4 1.1.5 1.4.1l.5-.5c.2-.2.3-.5.3-.8l-.5-3.1 2.6-1.5 3.3 5.9c.3.5 1 .6 1.4.2l.7-.7c.4-.3.6-.8.5-1.3z" fill="white"/></svg>`
    : '';
  return L.divIcon({
    className: 'aeropuerto-icon',
    html: `<div style="position:relative;width:${size}px;height:${size}px"><div style="width:${size}px;height:${size}px;background:${color};border-radius:${Math.round(size * 0.27)}px;border:${border}px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="${svgSize}" height="${svgSize}" fill="white" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M11 2 L13 2 L13 5 L18 5 L18 8 L13 8 L13 10 L20 13 L20 16 L11 14 L2 16 L2 13 L11 10 Z M9 17 L15 17 L15 22 L9 22 Z"/></svg></div>${planeHtml}</div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

export default function GeoMapaAeropuerto({ aeropuerto, onClick }: GeoMapaAeropuertoProps) {
  const [hover, setHover] = useState(false);
  const icono = useMemo(
    () => crearIconoAeropuerto(aeropuerto.color, 28, hover),
    [aeropuerto.color, hover]
  );

  return (
    <Marker
      position={[aeropuerto.latitud, aeropuerto.longitud]}
      icon={icono}
      eventHandlers={{
        click: () => onClick?.(aeropuerto.codigo_iata),
        mouseover: () => setHover(true),
        mouseout: () => setHover(false),
      }}
    >
      <Tooltip direction="top" offset={[0, -16]} className="aeropuerto-label">
        <div className="text-center">
          <div className="font-bold text-[11px]">{ciudadDe(aeropuerto.codigo_iata)}</div>
          <div className="text-[9px] text-slate-500 font-mono">{aeropuerto.codigo_iata}</div>
          <span className="font-semibold text-[10px]" style={{ color: aeropuerto.color }}>
            {aeropuerto.ocupacionPorcentaje.toFixed(0)}%
          </span>
        </div>
      </Tooltip>
      <Popup>
        <div className="text-center min-w-[120px]">
          <div className="font-bold text-sm">{ciudadDe(aeropuerto.codigo_iata)}</div>
          <div className="text-[11px] text-slate-500">
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
