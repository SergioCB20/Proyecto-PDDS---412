'use client';

import React from 'react';
import { Polyline, Tooltip } from 'react-leaflet';
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

function OcupacionBar({ ocupada, total }: { ocupada: number; total: number }) {
  const pct = total > 0 ? ((total - ocupada) / total) * 100 : 0;
  const color = pct < 70 ? '#22c55e' : pct < 90 ? '#eab308' : '#ef4444';
  return (
    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default React.memo(function GeoMapaVuelo({ vuelo, animacionActiva = false }: GeoMapaVueloProps) {
  const color = COLORES[vuelo.estado] || '#6b7280';
  const opacidadMarcador = animacionActiva ? 1 : 0.4;
  const opacidadRuta = animacionActiva ? 0.5 : 0.2;

  const tieneRuta = vuelo.origen_lat && vuelo.origen_lon && vuelo.destino_lat && vuelo.destino_lon;
  const ocupada = vuelo.capacidad_carga - vuelo.carga_disponible;

  return (
    <>
      {vuelo.estado === 'EN_RUTA' && tieneRuta && (
        <Polyline
          positions={[[vuelo.origen_lat, vuelo.origen_lon], [vuelo.destino_lat, vuelo.destino_lon]]}
          pathOptions={{
            color,
            weight: 2,
            opacity: opacidadRuta,
          }}
        >
          <Tooltip permanent direction="center" className="vuelo-tooltip">
            <div className="text-center min-w-[120px]">
              <div className="font-bold text-sm">{vuelo.codigo_vuelo}</div>
              <div className="text-xs text-slate-600">
                {vuelo.origen.codigo_iata} → {vuelo.destino.codigo_iata}
              </div>
              <div className="text-xs mt-1">
                <span className="text-slate-500">Ocupado: </span>
                <span className="font-semibold">{ocupada}/{vuelo.capacidad_carga}</span>
              </div>
              <OcupacionBar ocupada={vuelo.carga_disponible} total={vuelo.capacidad_carga} />
            </div>
          </Tooltip>
        </Polyline>
      )}
      <AvionAnimado
        vuelo={vuelo}
        animacionActiva={animacionActiva}
      />
    </>
  );
});
