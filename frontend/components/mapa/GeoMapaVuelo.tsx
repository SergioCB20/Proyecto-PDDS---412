'use client';

import { Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import type { VueloEnMapa } from '@/lib/types';
import { useAnimacionVuelo } from '@/lib/useAnimacionVuelo';

interface GeoMapaVueloProps {
  vuelo: VueloEnMapa;
}

function calcularAngulo(origen: { lat: number; lon: number }, destino: { lat: number; lon: number }): number {
  const dLon = ((destino.lon - origen.lon) * Math.PI) / 180;
  const lat1 = (origen.lat * Math.PI) / 180;
  const lat2 = (destino.lat * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 90) % 360;
}

function crearIconoAvion(color: string, angulo: number) {
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
      transform: rotate(${angulo}deg);
      transition: transform 0.3s ease;
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

  const posAnimada = useAnimacionVuelo(posicion);

  const destino = { lat: vuelo.destino_lat, lon: vuelo.destino_lon };
  const angulo = calcularAngulo(posAnimada, destino);

  return (
    <>
      <Polyline
        positions={[[vuelo.origen_lat, vuelo.origen_lon], [vuelo.destino_lat, vuelo.destino_lon]]}
        pathOptions={{
          color: '#ef4444',
          weight: 4,
          opacity: 0.8,
        }}
      />
      <Marker
        position={[posAnimada.lat, posAnimada.lon]}
        icon={crearIconoAvion(color, angulo)}
      />
    </>
  );
}