'use client';

import { Polyline } from 'react-leaflet';
import type { VueloEnMapa } from '@/lib/types';
import AvionAnimado from './AvionAnimado';

interface GeoMapaVueloProps {
  vuelo: VueloEnMapa;
  animacionActiva?: boolean;
}

const COLORES: Record<string, string> = {
  PROGRAMADO: '#3b82f6',
  EN_RUTA: '#22c55e',
  CANCELADO: '#ef4444',
  COMPLETADO: '#6b7280',
};

export default function GeoMapaVuelo({ vuelo, animacionActiva = false }: GeoMapaVueloProps) {
  const color = COLORES[vuelo.estado] || '#6b7280';

  const tieneRuta = vuelo.origen_lat && vuelo.origen_lon && vuelo.destino_lat && vuelo.destino_lon;

  return (
    <>
      {tieneRuta && (
        <Polyline
          positions={[[vuelo.origen_lat, vuelo.origen_lon], [vuelo.destino_lat, vuelo.destino_lon]]}
          pathOptions={{
            color,
            weight: 2,
            opacity: 0.5,
            dashArray: vuelo.estado === 'PROGRAMADO' ? '5,5' : undefined,
          }}
        />
      )}
      <AvionAnimado
        vuelo={vuelo}
        animacionActiva={animacionActiva}
      />
    </>
  );
}
