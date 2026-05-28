'use client';

import { Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import type { VueloEnMapa } from '@/lib/types';

interface GeoMapaVueloProps {
  vuelo: VueloEnMapa;
  animacionActiva?: boolean;
}

function crearIconoAvion(color: string) {
  return L.divIcon({
    className: 'avion-icon',
    html: `<div style="
      width: 24px;
      height: 24px;
      background: ${color};
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    ">✈</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const COLORES: Record<string, string> = {
  PROGRAMADO: '#3b82f6',
  EN_RUTA: '#22c55e',
  CANCELADO: '#ef4444',
  COMPLETADO: '#6b7280',
};

export default function GeoMapaVuelo({ vuelo }: GeoMapaVueloProps) {
  const color = COLORES[vuelo.estado] || '#6b7280';

  const posicion: { lat: number; lon: number } = vuelo.posicionActual ?? {
    lat: vuelo.origen_lat || 0,
    lon: vuelo.origen_lon || 0,
  };

  const origenLat = vuelo.origen_lat || 0;
  const origenLon = vuelo.origen_lon || 0;
  const destinoLat = vuelo.destino_lat || 0;
  const destinoLon = vuelo.destino_lon || 0;

  if (!origenLat || !origenLon || !destinoLat || !destinoLon) return null;

  const origen: [number, number] = [origenLat, origenLon];
  const destino: [number, number] = [destinoLat, destinoLon];
  const polylinePositions: [number, number][] = [origen, destino];

  return (
    <>
      <Polyline
        positions={polylinePositions}
        pathOptions={{
          color,
          weight: 2,
          opacity: 0.5,
          dashArray: vuelo.estado === 'PROGRAMADO' ? '5,5' : undefined,
        }}
      />
      <Marker
        position={[posicion.lat, posicion.lon]}
        icon={crearIconoAvion(color)}
      />
    </>
  );
}