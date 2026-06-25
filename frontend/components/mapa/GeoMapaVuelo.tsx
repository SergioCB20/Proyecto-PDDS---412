'use client';

import React, { useMemo } from 'react';
import { Polyline, Tooltip } from 'react-leaflet';
import { COLOR_VUELO, COLOR_AEROPUERTO } from '@/lib/colors';
import type { VueloEnMapa } from '@/lib/types';
import { bezierCurvePoints } from '@/lib/bezier';
import AvionAnimado from './AvionAnimado';

interface GeoMapaVueloProps {
  vuelo: VueloEnMapa;
  animacionActiva?: boolean;
  k?: number;
}

const COLORES: Record<string, string> = {
  PROGRAMADO: COLOR_VUELO.PROGRAMADO,
  EN_RUTA: COLOR_VUELO.EN_RUTA,
  CANCELADO: COLOR_VUELO.CANCELADO,
  COMPLETADO: COLOR_VUELO.COMPLETADO,
};

function OcupacionBar({ ocupada, total }: { ocupada: number; total: number }) {
  const pct = total > 0 ? ((total - ocupada) / total) * 100 : 0;
  const color = pct < 70 ? COLOR_AEROPUERTO.VERDE : pct < 90 ? COLOR_AEROPUERTO.AMBAR : COLOR_AEROPUERTO.ROJO;
  return (
    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}


function areEqual(prevProps: GeoMapaVueloProps, nextProps: GeoMapaVueloProps): boolean {
  if (prevProps.animacionActiva !== nextProps.animacionActiva) return false;
  if (prevProps.k !== nextProps.k) return false;
  const a = prevProps.vuelo;
  const b = nextProps.vuelo;
  if (a.id !== b.id || a.estado !== b.estado) return false;
  if (a.carga_disponible !== b.carga_disponible) return false;
  if (a.estado === 'EN_RUTA') {
    const pa = a.posicionActual;
    const pb = b.posicionActual;
    if (pa?.lat !== pb?.lat || pa?.lon !== pb?.lon) return false;
  }
  return true;
}

export default React.memo(function GeoMapaVuelo({ vuelo, animacionActiva = false, k = 120 }: GeoMapaVueloProps) {
  const color = COLORES[vuelo.estado] || '#6b7280';
  const opacidadRuta = animacionActiva ? 0.5 : 0.2;

  const tieneRuta = vuelo.origen_lat && vuelo.origen_lon && vuelo.destino_lat && vuelo.destino_lon;
  const ocupada = vuelo.capacidad_carga - vuelo.carga_disponible;

  const puntosCurva = useMemo(() => {
    if (!tieneRuta) return [];
    return bezierCurvePoints(
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
      {(vuelo.estado === 'EN_RUTA' || vuelo.estado === 'PROGRAMADO') && (
        <AvionAnimado
          vuelo={vuelo}
          animacionActiva={animacionActiva && vuelo.estado === 'EN_RUTA'}
          k={k}
        />
      )}
    </>
  );
}, areEqual);
