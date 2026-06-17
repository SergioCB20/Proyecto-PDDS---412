'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Marker, Tooltip, Popup } from 'react-leaflet';
import L from 'leaflet';
import { COLOR_VUELO } from '@/lib/colors';
import { bezierControlPoint, bezierPoint, bezierBearing } from '@/lib/bezier';
import type { VueloEnMapa } from '@/lib/types';

const COLORES: Record<string, string> = {
  PROGRAMADO: COLOR_VUELO.PROGRAMADO,
  EN_RUTA: COLOR_VUELO.EN_RUTA,
  CANCELADO: COLOR_VUELO.CANCELADO,
  COMPLETADO: COLOR_VUELO.COMPLETADO,
};

function esCoordenadaValida(v: number): boolean {
  return Number.isFinite(v) && Math.abs(v) <= 180;
}

function crearIconoAvion(color: string, rotacion: number = 0) {
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
      transform: rotate(${rotacion}deg);
    ">✈</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

interface AvionAnimadoProps {
  vuelo: VueloEnMapa;
  animacionActiva?: boolean;
  k?: number;
}

const AvionAnimado = React.memo(function AvionAnimado({
  vuelo,
  animacionActiva = false,
  k = 120,
}: AvionAnimadoProps) {
  const markerRef = useRef<L.Marker>(null);
  const rafRef = useRef<number>(0);

  const { ctrlLat, ctrlLon } = useMemo(
    () => bezierControlPoint(vuelo.origen_lat, vuelo.origen_lon, vuelo.destino_lat, vuelo.destino_lon),
    [vuelo.origen_lat, vuelo.origen_lon, vuelo.destino_lat, vuelo.destino_lon]
  );

  const [icono, setIcono] = useState(() =>
    crearIconoAvion(COLORES[vuelo.estado] || '#6b7280', 0)
  );

  const [frozenPos] = useState<[number, number]>(() => {
    const p = vuelo.posicionActual;
    if (p && esCoordenadaValida(p.lat) && esCoordenadaValida(p.lon)) {
      return [p.lat, p.lon];
    }
    return [vuelo.origen_lat, vuelo.origen_lon];
  });

  /**
   * Single ref that holds all animation state so the rAF closure never goes stale.
   * Updated from effects; never causes re-renders.
   */
  const flightRef = useRef({
    progreso: vuelo.progreso ?? 0,    // server-confirmed progreso at lastTickTime
    lastTickTime: performance.now(),  // real time of last server confirmation
    horaSalidaMs: vuelo.hora_salida ? new Date(vuelo.hora_salida).getTime() : 0,
    horaLlegadaMs: vuelo.hora_llegada ? new Date(vuelo.hora_llegada).getTime() : 0,
    k,
    lastBearingT: -1,                 // last t at which we updated the bearing icon
  });

  // Keep flight metadata in sync (no rAF restart needed — ref is always fresh)
  useEffect(() => {
    const ref = flightRef.current;
    ref.progreso = vuelo.progreso ?? 0;
    ref.lastTickTime = performance.now();
    ref.horaSalidaMs = vuelo.hora_salida ? new Date(vuelo.hora_salida).getTime() : 0;
    ref.horaLlegadaMs = vuelo.hora_llegada ? new Date(vuelo.hora_llegada).getTime() : 0;
    ref.k = k;
  }, [vuelo.progreso, vuelo.hora_salida, vuelo.hora_llegada, k]);

  // Update icon color on state change
  useEffect(() => {
    setIcono(crearIconoAvion(COLORES[vuelo.estado] || '#6b7280', 0));
    flightRef.current.lastBearingT = -1; // force bearing refresh
  }, [vuelo.estado]);

  /**
   * Continuous rAF loop.
   * Only restarts when the flight identity / route changes — NOT on every tick.
   * All live data (progreso, k, timestamps) is read from flightRef.current.
   */
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    if (!animacionActiva || vuelo.estado !== 'EN_RUTA') {
      const t = Math.min(Math.max(flightRef.current.progreso, 0), 1);
      const [lat, lng] = bezierPoint(
        vuelo.origen_lat, vuelo.origen_lon,
        ctrlLat, ctrlLon,
        vuelo.destino_lat, vuelo.destino_lon,
        t
      );
      marker.setLatLng([lat, lng]);
      const bearing = bezierBearing(
        vuelo.origen_lat, vuelo.origen_lon,
        ctrlLat, ctrlLon,
        vuelo.destino_lat, vuelo.destino_lon,
        t
      );
      setIcono(crearIconoAvion(COLORES[vuelo.estado] || '#6b7280', bearing));
      return;
    }

    let running = true;

    function frame() {
      if (!running || !marker) return;

      const ref = flightRef.current;
      const now = performance.now();
      const elapsed = now - ref.lastTickTime; // ms since last server confirmation

      // Theoretical velocity: progreso/ms in real time
      // progreso spans [0,1] over the virtual flight duration.
      // In real time that same span takes durVirtual/k ms.
      const durVirtual = ref.horaLlegadaMs - ref.horaSalidaMs;
      const velocity = durVirtual > 0 && ref.k > 0 ? ref.k / durVirtual : 0;

      // Extrapolate from last server position at constant velocity
      const extrapolated = ref.progreso + velocity * elapsed;
      const t = Math.min(Math.max(extrapolated, 0), 1);

      const [lat, lng] = bezierPoint(
        vuelo.origen_lat, vuelo.origen_lon,
        ctrlLat, ctrlLon,
        vuelo.destino_lat, vuelo.destino_lon,
        t
      );
      marker.setLatLng([lat, lng]);

      // Refresh bearing icon only when progreso shifts by ≥3% (avoids per-frame setState)
      if (Math.abs(t - ref.lastBearingT) >= 0.03) {
        ref.lastBearingT = t;
        const bearing = bezierBearing(
          vuelo.origen_lat, vuelo.origen_lon,
          ctrlLat, ctrlLon,
          vuelo.destino_lat, vuelo.destino_lon,
          t
        );
        setIcono(crearIconoAvion(COLORES[vuelo.estado] || '#6b7280', bearing));
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [
    // Only restart the loop when the flight route/identity changes
    animacionActiva,
    vuelo.estado,
    vuelo.id,
    vuelo.origen_lat, vuelo.origen_lon,
    vuelo.destino_lat, vuelo.destino_lon,
    ctrlLat, ctrlLon,
    // NOTE: vuelo.progreso / k intentionally excluded — handled via flightRef
  ]);

  const ocupada = vuelo.capacidad_carga - vuelo.carga_disponible;

  return (
    <Marker ref={markerRef} position={frozenPos} icon={icono}>
      <Tooltip direction="top" offset={[0, -14]}>
        <div className="text-center min-w-[100px]">
          <div className="font-bold text-sm">{vuelo.codigo_vuelo}</div>
          <div className="text-xs text-slate-600">
            {vuelo.origen.codigo_iata} → {vuelo.destino.codigo_iata}
          </div>
          <div className="text-xs mt-1">
            <span className="text-slate-500">Ocupado: </span>
            <span className="font-semibold">{ocupada}/{vuelo.capacidad_carga}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${vuelo.capacidad_carga > 0 ? (ocupada / vuelo.capacidad_carga) * 100 : 0}%`,
                backgroundColor: COLORES[vuelo.estado] || '#6b7280',
              }}
            />
          </div>
        </div>
      </Tooltip>
      <Popup>
        <div className="text-center min-w-[150px]">
          <div className="font-bold text-base mb-1">{vuelo.codigo_vuelo}</div>
          <div className="text-xs text-slate-600 mb-2">
            {vuelo.origen.codigo_iata} → {vuelo.destino.codigo_iata}
          </div>
          <div className="text-sm mb-1">
            <span className="text-slate-500">Capacidad: </span>
            <span className="font-semibold">{vuelo.capacidad_carga}</span>
          </div>
          <div className="text-sm mb-1">
            <span className="text-slate-500">Ocupado: </span>
            <span className="font-semibold">{ocupada}</span>
          </div>
          <div className="text-sm mb-2">
            <span className="text-slate-500">Disponible: </span>
            <span className="font-semibold">{vuelo.carga_disponible}</span>
          </div>
          <div
            className="px-2 py-1 rounded text-white text-xs font-bold"
            style={{
              backgroundColor:
                ocupada === 0 ? '#22c55e' :
                (ocupada / vuelo.capacidad_carga) < 0.7 ? '#22c55e' :
                (ocupada / vuelo.capacidad_carga) < 0.9 ? '#eab308' : '#ef4444',
            }}
          >
            {vuelo.capacidad_carga > 0
              ? ((ocupada / vuelo.capacidad_carga) * 100).toFixed(0)
              : 0}% ocupado
          </div>
        </div>
      </Popup>
    </Marker>
  );
});

export default AvionAnimado;
