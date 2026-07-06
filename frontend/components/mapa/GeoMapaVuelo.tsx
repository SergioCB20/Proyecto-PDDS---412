'use client';

import React, { useMemo } from 'react';
import { Polyline, Tooltip } from 'react-leaflet';
import { colorVueloPorEstado, COLOR_AEROPUERTO } from '@/lib/colors';
import type { VueloEnMapa } from '@/lib/types';
import type { UmbralesConfig } from './ConfigUmbrales';
import { bezierCurvePoints } from '@/lib/bezier';
import { formatearFechaHoraSeparado } from '@/lib/formatearHora';
import { ciudadDe } from '@/lib/aeropuertos';
import AvionAnimado from './AvionAnimado';

interface GeoMapaVueloProps {
  vuelo: VueloEnMapa;
  animacionActiva?: boolean;
  k?: number;
  umbralesConfig?: UmbralesConfig;
  seguido?: boolean;
  onSalirSeguimiento?: () => void;
  onSeguirVuelo?: (id: string) => void;
  destacado?: boolean;
}

function OcupacionBar({ ocupada, total, verdeMax, ambarMax }: { ocupada: number; total: number; verdeMax: number; ambarMax: number }) {
  const pct = total > 0 ? ((total - ocupada) / total) * 100 : 0;
  const color = pct <= 0 ? COLOR_AEROPUERTO.VACIO : pct < verdeMax ? COLOR_AEROPUERTO.VERDE : pct < ambarMax ? COLOR_AEROPUERTO.AMBAR : COLOR_AEROPUERTO.ROJO;
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
  if (prevProps.seguido !== nextProps.seguido) return false;
  if (prevProps.destacado !== nextProps.destacado) return false;
  if (prevProps.umbralesConfig?.verdeMax !== nextProps.umbralesConfig?.verdeMax) return false;
  if (prevProps.umbralesConfig?.ambarMax !== nextProps.umbralesConfig?.ambarMax) return false;
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

export default React.memo(function GeoMapaVuelo({ vuelo, animacionActiva = false, k = 120, umbralesConfig, seguido = false, onSalirSeguimiento, onSeguirVuelo, destacado = false }: GeoMapaVueloProps) {
  const color = colorVueloPorEstado(vuelo.estado);
  const opacidadRuta = animacionActiva ? 0.5 : 0.2;
  const verdeMax = umbralesConfig?.verdeMax ?? 70;
  const ambarMax = umbralesConfig?.ambarMax ?? 90;

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
      {/* La ruta de un vuelo EN_RUTA la dibuja AvionAnimado como estela que se
          desvanece a medida que avanza. Aquí solo se traza la huella tenue de
          los vuelos ya COMPLETADOS. */}
      {vuelo.estado === 'COMPLETADO' && tieneRuta && (
        <Polyline
          positions={puntosCurva}
          pathOptions={{
            color,
            weight: destacado ? 6 : 1,
            opacity: destacado ? 0.8 : 0.25,
            dashArray: '6, 4',
          }}
        >
          <Tooltip direction="center" className="vuelo-tooltip">
            <div className="text-center min-w-[150px]">
              <div className="font-bold text-sm">{vuelo.codigo_vuelo}</div>
              <div className="text-xs text-slate-600" title={`${vuelo.origen.codigo_iata} → ${vuelo.destino.codigo_iata}`}>
                {ciudadDe(vuelo.origen.codigo_iata)} → {ciudadDe(vuelo.destino.codigo_iata)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                {(() => {
                  const s = formatearFechaHoraSeparado(vuelo.hora_salida);
                  const l = formatearFechaHoraSeparado(vuelo.hora_llegada);
                  return (
                    <>
                      <div>Salida: <span className="font-semibold text-slate-700">{s.hora}</span> · {s.fecha}</div>
                      <div>Llegada: <span className="font-semibold text-slate-700">{l.hora}</span> · {l.fecha}</div>
                    </>
                  );
                })()}
              </div>
              <div className="text-xs mt-1">
                <span className="text-slate-500">Ocupado: </span>
                <span className="font-semibold">{ocupada}/{vuelo.capacidad_carga}</span>
              </div>
              <OcupacionBar ocupada={vuelo.carga_disponible} total={vuelo.capacidad_carga} verdeMax={verdeMax} ambarMax={ambarMax} />
            </div>
          </Tooltip>
        </Polyline>
      )}
      {(vuelo.estado === 'EN_RUTA' || vuelo.estado === 'PROGRAMADO') && (
        <AvionAnimado
          vuelo={vuelo}
          animacionActiva={animacionActiva && vuelo.estado === 'EN_RUTA'}
          k={k}
          umbralesConfig={umbralesConfig}
          seguido={seguido}
          destacado={destacado}
          onSalir={onSalirSeguimiento}
          onSeguirVuelo={onSeguirVuelo}
        />
      )}
    </>
  );
}, areEqual);
