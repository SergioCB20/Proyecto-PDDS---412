'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Marker, Polyline, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { colorVueloPorOcupacion } from '@/lib/colors';
import { bezierControlPoint, bezierPoint, bezierBearing, bezierSamples } from '@/lib/bezier';
import type { VueloEnMapa } from '@/lib/types';
import type { UmbralesConfig } from './ConfigUmbrales';
import { CENTRO, ZOOM } from './mapaConfig';
import { formatearFechaHoraSeparado } from '@/lib/formatearHora';
import { ciudadDe } from '@/lib/aeropuertos';
import OcupacionBarra from './OcupacionBarra';

function esCoordenadaValida(v: number): boolean {
  return Number.isFinite(v) && Math.abs(v) <= 180;
}

// Scales icon size with zoom level (smaller on zoom-out to reduce saturation)
function calcularTamaño(zoom: number): number {
  return Math.max(20, Math.min(64, Math.round((zoom * 1.8 + 6) * 2)));
}

// No artificial speed cap — each flight moves at its own virtual velocity
// (k / virtual_duration). target is computed from the server extrapolation.

// SVG airplane pointing NORTH (up). rotacion = geographic bearing (0=N, 90=E …)
// `seguido`: vuelo en modo "seguir" -> borde dorado brillante para ubicarlo facil.
// `destacado`: vuelo en ruta destacada -> borde azul con glow.
function crearIconoAvion(color: string, rotacion: number = 0, size: number = 22, seguido: boolean = false, destacado: boolean = false) {
  const half = Math.round(size / 2);
  const svgSize = Math.round(size * 0.62);
  let estilo: string;
  let stroke: string;
  let strokeWidth: number;
  if (seguido) {
    estilo = 'filter:drop-shadow(0 0 6px rgba(245,197,24,0.7)) drop-shadow(0 0 14px rgba(245,197,24,0.4))';
    stroke = '#f5c518';
    strokeWidth = 2;
  } else if (destacado) {
    estilo = 'filter:drop-shadow(0 0 6px rgba(37,99,235,0.7)) drop-shadow(0 0 14px rgba(37,99,235,0.4))';
    stroke = '#2563eb';
    strokeWidth = 2;
  } else {
    estilo = 'filter:drop-shadow(0 1px 2px rgba(0,0,0,0.35))';
    stroke = 'none';
    strokeWidth = 0;
  }
  return L.divIcon({
    className: 'avion-icon',
    html: `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;transform:rotate(${rotacion - 45}deg);${estilo}"><svg viewBox="0 0 344.851 344.851" width="${svgSize}" height="${svgSize}" fill="${color}" stroke="${stroke}" stroke-width="${strokeWidth}" xmlns="http://www.w3.org/2000/svg"><path d="M335.091,9.768c-13.015-13.015-34.115-13.014-47.13,0l-70.51,70.509L103.332,41.452c-1.577-0.537-3.293-0.5-4.846,0.104l-52.2,20.283c-1.066,0.328-2.07,0.916-2.915,1.759c-2.748,2.748-2.765,7.191-0.054,9.961c0.021,0.022,0.044,0.044,0.066,0.066c0.33,0.33,0.695,0.63,1.094,0.895l107.464,71.266L79.17,218.558l-45.602-15.514c-0.853-0.29-1.781-0.271-2.622,0.056L2.785,214.042c-0.752,0.342-1.184,0.598-1.663,1.078c-1.493,1.492-1.497,3.812-0.01,5.309c0.007,0.008,0.015,0.016,0.022,0.021c0.178,0.18,0.376,0.342,0.592,0.483l54.014,35.821c0.231,8.211,3.471,16.354,9.739,22.622c6.267,6.267,14.41,9.507,22.621,9.737l35.821,54.015c0.791,1.19,2.181,1.845,3.604,1.691c1.423-0.153,2.642-1.088,3.16-2.422l11.07-28.489c0.327-0.84,0.346-1.77,0.056-2.623l-15.514-45.602l72.771-72.771l71.268,107.464c1.463,2.204,4.031,3.411,6.662,3.127c2.63-0.284,4.883-2.011,5.841-4.476l20.461-52.66c0.603-1.553,0.64-3.269,0.103-4.846l-38.824-114.12l70.509-70.509C348.104,43.884,348.104,22.783,335.091,9.768z"/></svg></div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
  });
}

// Zoom al que se acerca la camara al entrar en modo "seguir vuelo".
const FOLLOW_ZOOM = 7;

interface AvionAnimadoProps {
  vuelo: VueloEnMapa;
  animacionActiva?: boolean;
  k?: number;
  umbralesConfig?: UmbralesConfig;
  seguido?: boolean;
  destacado?: boolean;
  onSalir?: () => void;
  onSeguirVuelo?: (id: string) => void;
  onVueloSeleccionado?: (id: string) => void;
}

const AvionAnimado = React.memo(function AvionAnimado({
  vuelo,
  animacionActiva = false,
  k = 120,
  umbralesConfig,
  seguido = false,
  destacado = false,
  onSalir,
  onSeguirVuelo,
  onVueloSeleccionado,
}: AvionAnimadoProps) {
  const markerRef = useRef<L.Marker>(null);
  const polylineRef = useRef<L.Polyline>(null);
  const rafRef = useRef<number>(0);
  const map = useMap();

  // Zoom-reactive icon size
  const [iconSize, setIconSize] = useState(() => calcularTamaño(map.getZoom()));
  const iconSizeRef = useRef(iconSize);
  const bearingRef = useRef(0);
  const seguidoRef = useRef(seguido);
  useEffect(() => { seguidoRef.current = seguido; }, [seguido]);
  const lastFollowPosRef = useRef<L.LatLng | null>(null);
  // Durante la animación de zoom, Leaflet reproyecta el pane; mover el marcador o
  // redibujar la estela en esos frames lo descuadra y aparenta cambiar de rumbo.
  const zoomingRef = useRef(false);

  // Cuando se activa el modo seguir, vuela la cámara al vuelo y aplica zoom.
  useEffect(() => {
    if (seguido && markerRef.current) {
      const pos = markerRef.current.getLatLng();
      map.flyTo(pos, FOLLOW_ZOOM, { duration: 0.8 });
      lastFollowPosRef.current = pos;
    }
  }, [seguido, map]);

  // ESC lo maneja MapController (GeoMapa): sale del seguimiento y aleja la cámara.

  // Salir del seguimiento: exit + alejar zoom y centrar en el Atlántico.
  const salirYAlejar = () => {
    onSalir?.();
    map.flyTo(CENTRO, ZOOM, { duration: 0.8 });
  };

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

  const ocupada = vuelo.capacidad_carga - vuelo.carga_disponible;
  const pctOcup = vuelo.capacidad_carga > 0 ? (ocupada / vuelo.capacidad_carga) * 100 : 0;
  const colorAvion = vuelo.carga_disponible >= vuelo.capacidad_carga ? '#9ca3af' : colorVueloPorOcupacion(pctOcup, umbralesConfig);

  const [icono, setIcono] = useState(() =>
    crearIconoAvion(colorAvion, 0, iconSize, false, destacado)
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
    /** Tiempo real de sincronización para modo tiempo-real (k≤1). */
    syncProgreso: vuelo.progreso ?? 0,
    syncTime: 0, // 0 = no sync yet; set on first EN_RUTA server tick
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
      ref.syncProgreso = ref.progreso;
      ref.syncTime = performance.now();
      ref.horaSalidaMs = vuelo.hora_salida ? new Date(vuelo.hora_salida).getTime() : 0;
      ref.horaLlegadaMs = vuelo.hora_llegada ? new Date(vuelo.hora_llegada).getTime() : 0;
      ref.k = k;
      return;
    }

    const now = performance.now();
    const durVirtual = ref.horaLlegadaMs - ref.horaSalidaMs;

    if (ref.k <= 1) {
      // Tiempo real: sincronizar referencia para interpolación fluida por reloj de pared.
      ref.syncProgreso = Math.max(vuelo.progreso ?? 0, ref.syncProgreso);
      ref.syncTime = now;
      ref.progreso = ref.syncProgreso;
    } else {
      const elapsed = now - ref.lastTickTime;
      const velocity = durVirtual > 0 && ref.k > 0 ? ref.k / durVirtual : 0;
      const currentPos = Math.min(ref.progreso + velocity * elapsed, 1);
      // Take the max: never allow the plane to jump backward on a new server tick
      ref.progreso = Math.max(vuelo.progreso ?? 0, currentPos);
    }
    ref.lastTickTime = now;
    ref.horaSalidaMs = vuelo.hora_salida ? new Date(vuelo.hora_salida).getTime() : 0;
    ref.horaLlegadaMs = vuelo.hora_llegada ? new Date(vuelo.hora_llegada).getTime() : 0;
    ref.k = k;
  }, [vuelo.progreso, vuelo.estado, vuelo.hora_salida, vuelo.hora_llegada, k]);

  // Update icon color on state change (preserve current bearing & size)
  useEffect(() => {
    setIcono(crearIconoAvion(colorAvion, bearingRef.current, iconSizeRef.current, seguidoRef.current, destacado));
    flightRef.current.lastBearingT = -1; // force bearing refresh
  }, [vuelo.estado, vuelo.carga_disponible, vuelo.capacidad_carga]);

  // Recreate icon when zoom changes (keeps current bearing)
  useEffect(() => {
    setIcono(crearIconoAvion(colorAvion, bearingRef.current, iconSize, seguido, destacado));
  }, [iconSize, vuelo.estado, seguido, destacado, vuelo.carga_disponible, vuelo.capacidad_carga]);

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
      if (seguidoRef.current) {
        const np = L.latLng(lat, lng);
        if (!lastFollowPosRef.current || np.distanceTo(lastFollowPosRef.current) > 500) {
          lastFollowPosRef.current = np;
          map.panTo(np, { animate: false });
        }
      }
      flightRef.current.lastBearingT = t;
      dibujarEstela(t);
      const bearing = bezierBearing(
        vuelo.origen_lat, vuelo.origen_lon,
        ctrlLat, ctrlLon,
        vuelo.destino_lat, vuelo.destino_lon,
        t
      );
      bearingRef.current = bearing;
      setIcono(crearIconoAvion(colorAvion, bearing, iconSizeRef.current, seguidoRef.current, destacado));
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

      const frameDt = Math.max(0, now - ref.lastFrameTime); // ms since last frame
      ref.lastFrameTime = now;

      const durVirtual = ref.horaLlegadaMs - ref.horaSalidaMs;

      // Posición "verdad": progreso del servidor extrapolado a tiempo real.
      let target: number;
      if (ref.k > 1) {
        // Modo acelerado (simulación): extrapolación clásica con k.
        const elapsed = now - ref.lastTickTime;
        const velocity = durVirtual > 0 && ref.k > 0 ? ref.k / durVirtual : 0;
        target = Math.min(Math.max(ref.progreso + velocity * elapsed, 0), 1);
      } else if (ref.syncTime === 0) {
        // Sin sincronización aún: usar progreso estático (esperar primer tick).
        target = Math.min(Math.max(ref.progreso, 0), 1);
      } else {
        // Modo tiempo real (operación): interpolación por reloj de pared.
        // Entre ticks del servidor, se avanza suavemente usando el tiempo
        // real transcurrido desde la última confirmación.
        const realElapsed = Math.max(0, now - ref.syncTime);
        target = Math.min(
          Math.max(ref.syncProgreso + (durVirtual > 0 ? realElapsed / durVirtual : 0), 0), 1
        );
      }

      // Display exact virtual position — each flight moves at its own speed
      // (k / virtual_duration). No artificial smoothing cap.
      let displayed = target;
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
      if (seguidoRef.current) {
        const np = L.latLng(lat, lng);
        if (!lastFollowPosRef.current || np.distanceTo(lastFollowPosRef.current) > 500) {
          lastFollowPosRef.current = np;
          map.panTo(np, { animate: false });
        }
      }

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
        setIcono(crearIconoAvion(colorAvion, bearing, iconSizeRef.current, seguidoRef.current, destacado));
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
    vuelo.carga_disponible, vuelo.capacidad_carga,
    ctrlLat, ctrlLon,
    samples,
    // NOTE: vuelo.progreso / k intentionally excluded — handled via flightRef
  ]);

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

  useEffect(() => () => { polylineRef.current = null; }, []);

  return (
    <>
      <Polyline
        ref={polylineRef}
        positions={estelaInicial}
        pathOptions={{
          color: '#000',
          weight: destacado ? 6 : 1,
          opacity: vuelo.estado === 'EN_RUTA' ? (destacado ? 0.9 : 0.6) : 0,
        }}
      />
      <Marker ref={markerRef} position={frozenPos} icon={icono}
        eventHandlers={{ click: () => { onSeguirVuelo?.(vuelo.id); onVueloSeleccionado?.(vuelo.id); } }}>
      {seguido && onSalir && (
        <Tooltip permanent direction="bottom" offset={[0, 10]} className="salir-vuelo-tooltip">
          <button
            onClick={e => { e.stopPropagation(); salirYAlejar(); }}
            className="px-2 py-0.5 text-xs font-medium bg-amber-400 text-amber-900 rounded-full shadow-md whitespace-nowrap hover:bg-amber-500 transition-colors"
          >
            Salir del vuelo [ESC]
          </button>
        </Tooltip>
      )}
      {/* Etiqueta de carga: visible solo al pasar el cursor sobre el avión */}
      <Tooltip direction="top" offset={[0, -14]} className="avion-carga-tooltip">
        <div className="text-center min-w-[120px]">
          <div className="font-bold text-xs">{vuelo.codigo_vuelo}</div>
          <div className="text-xs text-slate-600">
            {ciudadDe(vuelo.origen.codigo_iata)} → {ciudadDe(vuelo.destino.codigo_iata)}
          </div>
          <div className="text-xs text-slate-600 mt-0.5 font-mono leading-tight">
            {(() => {
              const s = formatearFechaHoraSeparado(vuelo.hora_salida);
              const l = formatearFechaHoraSeparado(vuelo.hora_llegada);
              return (
                <>
                  <div>Sale <span className="font-semibold text-slate-700">{s.hora}</span> · {s.fecha}</div>
                  <div>Llega <span className="font-semibold text-slate-700">{l.hora}</span> · {l.fecha}</div>
                </>
              );
            })()}
          </div>
          <div className="text-sm mt-0.5">
            <span className="text-slate-600">Carga: </span>
            <span className="font-bold">{ocupada}/{vuelo.capacidad_carga}</span>
          </div>
          <OcupacionBarra
            ocupada={ocupada}
            total={vuelo.capacidad_carga}
            umbralesConfig={umbralesConfig}
            className="mt-0.5"
          />
        </div>
      </Tooltip>
      <Popup>
        <div className="text-center min-w-[170px]">
          <div className="font-bold text-base mb-1">{vuelo.codigo_vuelo}</div>
          <div className="text-xs text-slate-600 mb-2">
            {ciudadDe(vuelo.origen.codigo_iata)} → {ciudadDe(vuelo.destino.codigo_iata)}
          </div>
          <div className="text-sm text-slate-600 mb-2 font-mono leading-tight">
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
          <div className="text-sm mb-1">
            <span className="text-slate-600">Capacidad: </span>
            <span className="font-semibold">{vuelo.capacidad_carga}</span>
          </div>
          <div className="text-sm mb-1">
            <span className="text-slate-600">Ocupado: </span>
            <span className="font-semibold">{ocupada}</span>
          </div>
          <div className="text-sm mb-2">
            <span className="text-slate-600">Disponible: </span>
            <span className="font-semibold">{vuelo.carga_disponible}</span>
          </div>
          <div
            className="px-2 py-1 rounded text-white text-xs font-bold"
            style={{ backgroundColor: colorVueloPorOcupacion(pctOcup, umbralesConfig) }}
          >
            {pctOcup.toFixed(0)}% ocupado
          </div>
        </div>
      </Popup>
    </Marker>
    </>
  );
});

export default AvionAnimado;
