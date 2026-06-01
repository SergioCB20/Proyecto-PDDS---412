'use client';

import { Marker } from 'react-leaflet';
import L from 'leaflet';
import type { VueloEnMapa } from '@/lib/types';

interface GeoMapaVueloProps {
  vuelo: VueloEnMapa;
}

function crearIconoAvion(color: string) {
  return L.divIcon({
    className: 'avion-icon',
    html: `<div style="
      width: 40px;
      height: 40px;
      background: ${color};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 4px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      transform: rotate(45deg);
    ">✈</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

const COLORES: Record<string, string> = {
  EN_RUTA: '#22c55e',
};

export default function GeoMapaVuelo({ vuelo }: GeoMapaVueloProps) {
  const color = COLORES[vuelo.estado] || '#6b7280';

  const posicion: { lat: number; lon: number } = vuelo.posicionActual ?? {
    lat: vuelo.origen_lat,
    lon: vuelo.origen_lon,
  };

  return (
    <Marker
      position={[posicion.lat, posicion.lon]}
      icon={crearIconoAvion(color)}
    />
  );
}