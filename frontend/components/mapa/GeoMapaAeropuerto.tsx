'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Marker, Tooltip, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { AeropuertoEnMapa } from '@/lib/types';

interface GeoMapaAeropuertoProps {
  aeropuerto: AeropuertoEnMapa;
}

/** Icono fijo de aeropuerto — al menos 4× mayor que el icono de vuelo (~13 px a zoom 4). */
function crearIconoAeropuerto(iata: string, color: string, size: number = 48) {
  const half = Math.round(size / 2);
  const fontSize = Math.max(9, Math.round(size * 0.3));
  return L.divIcon({
    className: 'aeropuerto-icon',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:14px;border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.35);display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${fontSize}px;line-height:1.2;text-shadow:0 1px 2px rgba(0,0,0,0.4)"><span>${iata}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

export default function GeoMapaAeropuerto({ aeropuerto }: GeoMapaAeropuertoProps) {
  const icono = useMemo(
    () => crearIconoAeropuerto(aeropuerto.codigo_iata, aeropuerto.color),
    [aeropuerto.codigo_iata, aeropuerto.color]
  );

  return (
    <Marker
      position={[aeropuerto.latitud, aeropuerto.longitud]}
      icon={icono}
    >
      <Tooltip direction="top" offset={[0, -28]} className="aeropuerto-label">
        <span className="font-semibold" style={{ color: aeropuerto.color }}>
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
    </Marker>
  );
}
