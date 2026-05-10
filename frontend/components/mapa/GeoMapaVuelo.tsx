'use client';

import { useEffect, useState } from 'react';
import { Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import type { Vuelo } from '@/lib/types';
import { calcularPosicionAvion } from '@/lib/mock';

interface GeoMapaVueloProps {
  vuelo: Vuelo;
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

export default function GeoMapaVuelo({ vuelo, animacionActiva = false }: GeoMapaVueloProps) {
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    if (!animacionActiva || vuelo.estado !== 'EN_RUTA') return;

    const ahora = Date.now();
    const salida = new Date(vuelo.hora_salida).getTime();
    const llegada = new Date(vuelo.hora_llegada).getTime();
    const total = llegada - salida;
    const transcurrido = ahora - salida;
    const prog = Math.max(0, Math.min(1, transcurrido / total));

    setProgreso(prog);

    const interval = setInterval(() => {
      const t = Date.now();
      const p = Math.max(0, Math.min(1, (t - salida) / total));
      setProgreso(p);
    }, 2000);

    return () => clearInterval(interval);
  }, [vuelo, animacionActiva]);

  const origen: [number, number] = [vuelo.origen_lat, vuelo.origen_lon];
  const destino: [number, number] = [vuelo.destino_lat, vuelo.destino_lon];
  const color = COLORES[vuelo.estado] || '#6b7280';
  const posicion = calcularPosicionAvion(vuelo, progreso);

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