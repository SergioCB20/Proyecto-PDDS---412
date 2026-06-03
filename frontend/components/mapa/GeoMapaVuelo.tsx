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

export default function GeoMapaVuelo({ vuelo, animacionActiva = true }: GeoMapaVueloProps) {
  const color = COLORES[vuelo.estado] || '#6b7280';
  const opacidadMarcador = animacionActiva ? 1 : 0.4;
  const opacidadRuta = animacionActiva ? 0.5 : 0.2;

  const posicion: { lat: number; lon: number } = vuelo.posicionActual ?? {
    lat: vuelo.origen_lat,
    lon: vuelo.origen_lon,
  };

  const tieneRuta = vuelo.origen_lat && vuelo.origen_lon && vuelo.destino_lat && vuelo.destino_lon;

  return (
    <>
      {tieneRuta && (
        <Polyline
          positions={[[vuelo.origen_lat, vuelo.origen_lon], [vuelo.destino_lat, vuelo.destino_lon]]}
          pathOptions={{
            color,
            weight: 2,
            opacity: opacidadRuta,
            dashArray: vuelo.estado === 'PROGRAMADO' ? '5,5' : undefined,
          }}
        />
      )}
      <Marker
        position={[posicion.lat, posicion.lon]}
        icon={crearIconoAvion(color)}
        opacity={opacidadMarcador}
      />
    </>
  );
}