'use client';

import React, { useMemo } from 'react';
import { Polyline, Tooltip } from 'react-leaflet';
import { COLOR_VUELO, COLOR_NODO } from '@/lib/colors';
import type { VueloEnMapa } from '@/lib/types';
import AvionAnimado from './AvionAnimado';

interface GeoMapaVueloProps {
  vuelo: VueloEnMapa;
  animacionActiva?: boolean;
}

const COLORES: Record<string, string> = {
  PROGRAMADO: COLOR_VUELO.PROGRAMADO,
  EN_RUTA: COLOR_VUELO.EN_RUTA,
  CANCELADO: COLOR_VUELO.CANCELADO,
  COMPLETADO: COLOR_VUELO.COMPLETADO,
};

function OcupacionBar({ ocupada, total }: { ocupada: number; total: number }) {
  const pct = total > 0 ? ((total - ocupada) / total) * 100 : 0;
  const color = pct < 70 ? COLOR_NODO.VERDE : pct < 90 ? COLOR_NODO.AMBAR : COLOR_NODO.ROJO;
  return (
    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

function calcularCurvaBezier(
  origen: [number, number],
  destino: [number, number],
  puntos: number = 50
): [number, number][] {
  const [lat1, lon1] = origen;
  const [lat2, lon2] = destino;

  const midLat = (lat1 + lat2) / 2;
  const midLon = (lon1 + lon2) / 2;

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const dist = Math.sqrt(dLat * dLat + dLon * dLon);

  const offset = Math.max(dist * 0.3, 0.5);
  const perpLon = -dLat / dist * offset;
  const perpLat = dLon / dist * offset;

  const ctrlLat = midLat + perpLat;
  const ctrlLon = midLon + perpLon;

  const result: [number, number][] = [];
  for (let i = 0; i <= puntos; i++) {
    const t = i / puntos;
    const t1 = 1 - t;
    const lat = t1 * t1 * lat1 + 2 * t1 * t * ctrlLat + t * t * lat2;
    const lon = t1 * t1 * lon1 + 2 * t1 * t * ctrlLon + t * t * lon2;
    result.push([lat, lon]);
  }
  return result;
}

export default React.memo(function GeoMapaVuelo({ vuelo, animacionActiva = false }: GeoMapaVueloProps) {
  const color = COLORES[vuelo.estado] || '#6b7280';
  const opacidadMarcador = animacionActiva ? 1 : 0.4;
  const opacidadRuta = animacionActiva ? 0.5 : 0.2;

  const tieneRuta = vuelo.origen_lat && vuelo.origen_lon && vuelo.destino_lat && vuelo.destino_lon;
  const ocupada = vuelo.capacidad_carga - vuelo.carga_disponible;

  const puntosCurva = useMemo(() => {
    if (!tieneRuta) return [];
    return calcularCurvaBezier(
      [vuelo.origen_lat, vuelo.origen_lon],
      [vuelo.destino_lat, vuelo.destino_lon]
    );
  }, [vuelo.origen_lat, vuelo.origen_lon, vuelo.destino_lat, vuelo.destino_lon, tieneRuta]);

  return (
    <>
      {vuelo.estado === 'EN_RUTA' && tieneRuta && (
        <Polyline
          positions={puntosCurva}
          pathOptions={{
            color,
            weight: 2,
            opacity: opacidadRuta,
          }}
        >
          <Tooltip direction="center" className="vuelo-tooltip">
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
