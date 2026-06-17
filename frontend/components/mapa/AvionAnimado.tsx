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

/** ms between WebSocket ticks — used as the animation stride */
const TICK_MS = 5000;

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
  /** k factor (virtual/real); used for velocity extrapolation between ticks */
  k?: number;
}

const AvionAnimado = React.memo(function AvionAnimado({
  vuelo,
  animacionActiva = false,
  k = 120,
}: AvionAnimadoProps) {
  const markerRef = useRef<L.Marker>(null);
  const rafRef = useRef<number>(0);

  // Bezier control point — stable as long as origin/dest don't change
  const { ctrlLat, ctrlLon } = useMemo(
    () => bezierControlPoint(vuelo.origen_lat, vuelo.origen_lon, vuelo.destino_lat, vuelo.destino_lon),
    [vuelo.origen_lat, vuelo.origen_lon, vuelo.destino_lat, vuelo.destino_lon]
  );

  // State for icon (bearing updates when progress changes substantially)
  const [icono, setIcono] = useState(() =>
    crearIconoAvion(COLORES[vuelo.estado] || '#6b7280', 0)
  );

  // Frozen initial position for React-Leaflet Marker mount
  const [frozenPos] = useState<[number, number]>(() => {
    const p = vuelo.posicionActual;
    if (p && esCoordenadaValida(p.lat) && esCoordenadaValida(p.lon)) {
      return [p.lat, p.lon];
    }
    return [vuelo.origen_lat, vuelo.origen_lon];
  });

  // Animation state in refs to avoid stale closures in rAF
  const animRef = useRef({
    progresoBase: vuelo.progreso ?? 0,   // progreso at last tick
    progresoTarget: vuelo.progreso ?? 0, // progreso at current tick
    velocidad: 0,                         // progreso/ms extrapolation rate
    tickTime: performance.now(),          // real time of last tick
    progresoCurrent: vuelo.progreso ?? 0, // last rendered progreso
  });

  // Update animation target when telemetry delivers a new progreso
  useEffect(() => {
    const newProgreso = vuelo.progreso ?? 0;
    const anim = animRef.current;
    const now = performance.now();
    const elapsed = now - anim.tickTime;

    // Velocity = how much progreso changed per ms over the last tick interval
    const delta = newProgreso - anim.progresoBase;
    anim.velocidad = elapsed > 0 ? delta / elapsed : 0;

    anim.progresoBase = anim.progresoCurrent; // start from where we visually are
    anim.progresoTarget = newProgreso;
    anim.tickTime = now;
  }, [vuelo.progreso]);

  // Also update icon color when state changes
  useEffect(() => {
    setIcono(crearIconoAvion(COLORES[vuelo.estado] || '#6b7280', 0));
  }, [vuelo.estado]);

  // Continuous rAF loop — runs when animacionActiva and vuelo is EN_RUTA
  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    if (!animacionActiva || vuelo.estado !== 'EN_RUTA') {
      // Snap to current progreso without animation
      const t = Math.min(Math.max(animRef.current.progresoTarget, 0), 1);
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
      const anim = animRef.current;
      const now = performance.now();
      const elapsed = now - anim.tickTime;

      // Extrapolate: continue at the measured velocity beyond the last known target
      const extrapolated = anim.progresoTarget + anim.velocidad * elapsed;
      // Interpolate smoothly from base toward extrapolated over TICK_MS
      const tAnim = Math.min(elapsed / TICK_MS, 1);
      const progreso = anim.progresoBase + (extrapolated - anim.progresoBase) * tAnim;
      const t = Math.min(Math.max(progreso, 0), 1);

      anim.progresoCurrent = t;

      const [lat, lng] = bezierPoint(
        vuelo.origen_lat, vuelo.origen_lon,
        ctrlLat, ctrlLon,
        vuelo.destino_lat, vuelo.destino_lon,
        t
      );
      marker.setLatLng([lat, lng]);

      // Update bearing every ~10% of Bezier to avoid per-frame icon recreation
      const prevT = anim.progresoCurrent;
      if (Math.abs(t - prevT) > 0.05 || prevT === 0) {
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
    animacionActiva,
    vuelo.estado,
    vuelo.origen_lat, vuelo.origen_lon,
    vuelo.destino_lat, vuelo.destino_lon,
    ctrlLat, ctrlLon,
    // progreso change re-triggers via the separate useEffect above (animRef update)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    vuelo.progreso,
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
