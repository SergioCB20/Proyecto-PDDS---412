'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Marker, Polyline, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { colorVueloPorEstado } from '@/lib/colors';
import { bezierControlPoint, bezierPoint, bezierBearing, bezierSamples } from '@/lib/bezier';
import type { VueloEnMapa } from '@/lib/types';
import type { UmbralesConfig } from './ConfigUmbrales';

function esCoordenadaValida(v: number): boolean {
  return Number.isFinite(v) && Math.abs(v) <= 180;
}

// Scales icon size with zoom level (smaller on zoom-out to reduce saturation)
function calcularTamaño(zoom: number): number {
  return Math.max(10, Math.min(32, Math.round(zoom * 1.8 + 6)));
}

// Tope de velocidad visual: un avión nunca recorre su ruta completa en menos de
// este tiempo real (ms). Evita los "meteoros" cuando un vuelo tiene una duración
// programada minúscula (datos cruzando medianoche) o cuando k es muy alto.
const MIN_TRAVESIA_MS = 8000;
const MAX_VEL = 1 / MIN_TRAVESIA_MS; // progreso por ms real

// SVG airplane pointing NORTH (up). rotacion = geographic bearing (0=N, 90=E …)
function crearIconoAvion(color: string, rotacion: number = 0, size: number = 22) {
  const half = Math.round(size / 2);
  const border = Math.max(1, Math.round(size * 0.09));
  const svgSize = Math.round(size * 0.62);
  return L.divIcon({
    className: 'avion-icon',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:${border}px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;transform:rotate(${rotacion}deg)"><svg viewBox="0 0 24 24" width="${svgSize}" height="${svgSize}" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 2 L8 10 L3 12 L3 13.5 L8 12 L9.5 11.5 L9.5 19 L10 19 L8.5 22 L9.5 22.5 L12 21.5 L14.5 22.5 L15.5 22 L14 19 L14.5 19 L14.5 11.5 L16 12 L21 13.5 L21 12 L16 10 Z"/></svg></div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

interface AvionAnimadoProps {
  vuelo: VueloEnMapa;
  animacionActiva?: boolean;
  k?: number;
  umbralesConfig?: UmbralesConfig;
}

const AvionAnimado = React.memo(function AvionAnimado({
  vuelo,
  animacionActiva = false,
  k = 120,
  umbralesConfig,
}: AvionAnimadoProps) {
  const markerRef = useRef<L.Marker>(null);
  const polylineRef = useRef<L.Polyline>(null);
  const rafRef = useRef<number>(0);
  const map = useMap();

  // Zoom-reactive icon size
  const [iconSize, setIconSize] = useState(() => calcularTamaño(map.getZoom()));
  const iconSizeRef = useRef(iconSize);
  const bearingRef = useRef(0);
  // Durante la animación de zoom, Leaflet reproyecta el pane; mover el marcador o
  // redibujar la estela en esos frames lo descuadra y aparenta cambiar de rumbo.
  const zoomingRef = useRef(false);

  useEffect(() => { iconSizeRef.current = iconSize; }, [iconSize]);

  useEffect(() => {
    const onZoomStart = () => { zoomingRef.current = true; };
    const onZoomEnd = () => {
      zoomingRef.current = false;
      setIconSize(calcularTamaño(map.getZoom()));
    };
    map.on('zoomstart', onZoomStart);
    map.on('zoomend', onZoomEnd);
    return () => {
      map.off('zoomstart', onZoomStart);
      map.off('zoomend', onZoomEnd);
    };
  }, [map]);

  const { ctrlLat, ctrlLon } = useMemo(
    () => bezierControlPoint(vuelo.origen_lat, vuelo.origen_lon, vuelo.destino_lat, vuelo.destino_lon),
    [vuelo.origen_lat, vuelo.origen_lon, vuelo.destino_lat, vuelo.destino_lon]
  );

  // Curva pre-muestreada para la estela; en cada frame se conservan solo los
  // puntos por delante del avión (la ruta transcurrida desaparece).
  const samples = useMemo(
    () => bezierSamples(
      vuelo.origen_lat, vuelo.origen_lon,
      ctrlLat, ctrlLon,
      vuelo.destino_lat, vuelo.destino_lon
    ),
    [vuelo.origen_lat, vuelo.origen_lon, vuelo.destino_lat, vuelo.destino_lon, ctrlLat, ctrlLon]
  );

  // Recorta la polilínea a la porción aún no recorrida (cabeza pegada al avión).
  const dibujarEstela = (t: number) => {
    const poly = polylineRef.current;
    if (!poly) return;
    const [hLat, hLon] = bezierPoint(
      vuelo.origen_lat, vuelo.origen_lon,
      ctrlLat, ctrlLon,
      vuelo.destino_lat, vuelo.destino_lon, t
    );
    const tail: L.LatLngTuple[] = [[hLat, hLon]];
    for (const s of samples) {
      if (s.t > t) tail.push([s.lat, s.lon]);
    }
    poly.setLatLngs(tail);
  };

  const [icono, setIcono] = useState(() =>
    crearIconoAvion(colorVueloPorEstado(vuelo.estado), 0, iconSize)
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
    displayed: vuelo.progreso ?? 0,   // progreso realmente pintado (velocidad acotada)
    lastTickTime: performance.now(),  // real time of last server confirmation
    lastFrameTime: performance.now(), // real time of last rendered frame (for dt)
    horaSalidaMs: vuelo.hora_salida ? new Date(vuelo.hora_salida).getTime() : 0,
    horaLlegadaMs: vuelo.hora_llegada ? new Date(vuelo.hora_llegada).getTime() : 0,
    k,
    lastBearingT: -1,                 // last t at which we updated the bearing icon
    lastEstelaT: -1,                  // last t at which we redrew the fading trail
  });

  // Sync flight metadata; never move the plane backward when a server tick arrives
  useEffect(() => {
    const ref = flightRef.current;

    // En tierra (PROGRAMADO/COMPLETADO/CANCELADO): posición exacta del servidor
    // (PROGRAMADO = 0). Sin extrapolar ni "no retroceso", para que un vuelo que
    // se reinicia a PROGRAMADO no quede congelado a mitad de ruta.
    if (vuelo.estado !== 'EN_RUTA') {
      ref.progreso = Math.min(Math.max(vuelo.progreso ?? 0, 0), 1);
      ref.lastTickTime = performance.now();
      ref.horaSalidaMs = vuelo.hora_salida ? new Date(vuelo.hora_salida).getTime() : 0;
      ref.horaLlegadaMs = vuelo.hora_llegada ? new Date(vuelo.hora_llegada).getTime() : 0;
      ref.k = k;
      return;
    }

    const now = performance.now();
    const elapsed = now - ref.lastTickTime;
    const durVirtual = ref.horaLlegadaMs - ref.horaSalidaMs;
    const velocity = durVirtual > 0 && ref.k > 0 ? ref.k / durVirtual : 0;
    const currentPos = Math.min(ref.progreso + velocity * elapsed, 1);
    // Take the max: never allow the plane to jump backward on a new server tick
    ref.progreso = Math.max(vuelo.progreso ?? 0, currentPos);
    ref.lastTickTime = now;
    ref.horaSalidaMs = vuelo.hora_salida ? new Date(vuelo.hora_salida).getTime() : 0;
    ref.horaLlegadaMs = vuelo.hora_llegada ? new Date(vuelo.hora_llegada).getTime() : 0;
    ref.k = k;
  }, [vuelo.progreso, vuelo.estado, vuelo.hora_salida, vuelo.hora_llegada, k]);

  // Update icon color on state change (preserve current bearing & size)
  useEffect(() => {
    setIcono(crearIconoAvion(colorVueloPorEstado(vuelo.estado), bearingRef.current, iconSizeRef.current));
    flightRef.current.lastBearingT = -1; // force bearing refresh
  }, [vuelo.estado]);

  // Recreate icon when zoom changes (keeps current bearing)
  useEffect(() => {
    setIcono(crearIconoAvion(colorVueloPorEstado(vuelo.estado), bearingRef.current, iconSize));
  }, [iconSize, vuelo.estado]);

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
      flightRef.current.displayed = t; // posición estática: sincroniza con la verdad
      const [lat, lng] = bezierPoint(
        vuelo.origen_lat, vuelo.origen_lon,
        ctrlLat, ctrlLon,
        vuelo.destino_lat, vuelo.destino_lon,
        t
      );
      marker.setLatLng([lat, lng]);
      flightRef.current.lastEstelaT = t;
      dibujarEstela(t);
      const bearing = bezierBearing(
        vuelo.origen_lat, vuelo.origen_lon,
        ctrlLat, ctrlLon,
        vuelo.destino_lat, vuelo.destino_lon,
        t
      );
      bearingRef.current = bearing;
      setIcono(crearIconoAvion(colorVueloPorEstado(vuelo.estado), bearing, iconSizeRef.current));
      return;
    }

    let running = true;

    function frame() {
      if (!running || !marker) return;

      const ref = flightRef.current;
      const now = performance.now();

      // Mientras Leaflet anima el zoom, no tocar el marcador/estela: dejar que el
      // propio zoom reproyecte. Se reanuda en zoomend sin saltos (lastFrameTime al día).
      if (zoomingRef.current) {
        ref.lastFrameTime = now;
        rafRef.current = requestAnimationFrame(frame);
        return;
      }

      const elapsed = now - ref.lastTickTime;  // ms since last server confirmation
      const frameDt = Math.max(0, now - ref.lastFrameTime); // ms since last frame
      ref.lastFrameTime = now;

      // Theoretical velocity: progreso/ms in real time
      // progreso spans [0,1] over the virtual flight duration.
      // In real time that same span takes durVirtual/k ms.
      const durVirtual = ref.horaLlegadaMs - ref.horaSalidaMs;
      const velocity = durVirtual > 0 && ref.k > 0 ? ref.k / durVirtual : 0;

      // Posición "verdad": progreso del servidor extrapolado a tiempo real.
      const target = Math.min(Math.max(ref.progreso + velocity * elapsed, 0), 1);

      // El avión avanza hacia la verdad pero con paso acotado por MAX_VEL, de modo
      // que ningún vuelo cruce más rápido que MIN_TRAVESIA_MS. Para vuelos normales
      // target≈displayed y el tope no tiene efecto; para datos degenerados (duración
      // minúscula → "meteoro") el avance se suaviza en vez de teletransportarse.
      const maxStep = MAX_VEL * frameDt;
      let displayed = ref.displayed;
      const delta = target - displayed;
      displayed = delta > 0 ? displayed + Math.min(delta, maxStep) : target;
      displayed = Math.min(Math.max(displayed, 0), 1);
      ref.displayed = displayed;
      const t = displayed;

      const [lat, lng] = bezierPoint(
        vuelo.origen_lat, vuelo.origen_lon,
        ctrlLat, ctrlLon,
        vuelo.destino_lat, vuelo.destino_lon,
        t
      );
      marker.setLatLng([lat, lng]);

      // Redibuja la estela solo cuando el progreso avanza ≥1% (evita un redraw
      // SVG por frame en cada avion; el desfase de la cola es imperceptible).
      if (Math.abs(t - ref.lastEstelaT) >= 0.01) {
        ref.lastEstelaT = t;
        dibujarEstela(t);
      }

      // Refresh bearing icon only when progreso shifts by ≥3% (avoids per-frame setState)
      if (Math.abs(t - ref.lastBearingT) >= 0.03) {
        ref.lastBearingT = t;
        const bearing = bezierBearing(
          vuelo.origen_lat, vuelo.origen_lon,
          ctrlLat, ctrlLon,
          vuelo.destino_lat, vuelo.destino_lon,
          t
        );
        bearingRef.current = bearing;
        setIcono(crearIconoAvion(colorVueloPorEstado(vuelo.estado), bearing, iconSizeRef.current));
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    cancelAnimationFrame(rafRef.current);
    flightRef.current.lastFrameTime = performance.now(); // evita un dt enorme en el primer frame
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
    samples,
    // NOTE: vuelo.progreso / k intentionally excluded — handled via flightRef
  ]);

  const ocupada = vuelo.capacidad_carga - vuelo.carga_disponible;

  // Estela inicial: ruta por delante del avión desde su progreso actual
  // (evita un parpadeo con la ruta completa antes del primer frame).
  const estelaInicial = useMemo<L.LatLngTuple[]>(() => {
    const t0 = Math.min(Math.max(vuelo.progreso ?? 0, 0), 1);
    const [hLat, hLon] = bezierPoint(
      vuelo.origen_lat, vuelo.origen_lon,
      ctrlLat, ctrlLon,
      vuelo.destino_lat, vuelo.destino_lon, t0
    );
    const tail: L.LatLngTuple[] = [[hLat, hLon]];
    for (const s of samples) if (s.t > t0) tail.push([s.lat, s.lon]);
    return tail;
  }, [samples, ctrlLat, ctrlLon, vuelo.origen_lat, vuelo.origen_lon, vuelo.destino_lat, vuelo.destino_lon, vuelo.progreso]);

  return (
    <>
      {vuelo.estado === 'EN_RUTA' && (
        <Polyline
          ref={polylineRef}
          positions={estelaInicial}
          pathOptions={{ color: colorVueloPorEstado('EN_RUTA'), weight: 1, opacity: 0.6 }}
        />
      )}
      <Marker ref={markerRef} position={frozenPos} icon={icono}>
      {/* Etiqueta de carga: visible solo al pasar el cursor sobre el avión */}
      <Tooltip direction="top" offset={[0, -14]} className="avion-carga-tooltip">
        <div className="text-center min-w-[90px]">
          <div className="font-bold text-xs">{vuelo.codigo_vuelo}</div>
          <div className="text-[10px] text-slate-600">
            {vuelo.origen.codigo_iata} → {vuelo.destino.codigo_iata}
          </div>
          <div className="text-[11px] mt-0.5">
            <span className="text-slate-500">Carga: </span>
            <span className="font-bold">{ocupada}/{vuelo.capacidad_carga}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-0.5">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${vuelo.capacidad_carga > 0 ? (ocupada / vuelo.capacidad_carga) * 100 : 0}%`,
                backgroundColor: colorVueloPorEstado(vuelo.estado),
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
              backgroundColor: (() => {
                const pct = vuelo.capacidad_carga > 0 ? (ocupada / vuelo.capacidad_carga) * 100 : 0;
                const vm = umbralesConfig?.verdeMax ?? 70;
                const am = umbralesConfig?.ambarMax ?? 90;
                if (pct < vm) return '#22c55e';
                if (pct < am) return '#eab308';
                return '#ef4444';
              })(),
            }}
          >
            {vuelo.capacidad_carga > 0
              ? ((ocupada / vuelo.capacidad_carga) * 100).toFixed(0)
              : 0}% ocupado
          </div>
        </div>
      </Popup>
    </Marker>
    </>
  );
});

export default AvionAnimado;
