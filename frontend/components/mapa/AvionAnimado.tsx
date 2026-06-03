'use client';

import { useEffect, useRef, useState } from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import type { VueloEnMapa } from '@/lib/types';

const COLORES: Record<string, string> = {
  PROGRAMADO: '#3b82f6',
  EN_RUTA: '#22c55e',
  CANCELADO: '#ef4444',
  COMPLETADO: '#6b7280',
};

function calcBearing(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
): number {
  const dLon = ((to.lon - from.lon) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function esCoordenadaValida(v: number): boolean {
  return Number.isFinite(v) && Math.abs(v) <= 180;
}

function calcPosicionEnRuta(
  origen: L.LatLng,
  destino: L.LatLng,
  progreso: number
): [number, number] {
  return [
    origen.lat + (destino.lat - origen.lat) * progreso,
    origen.lng + (destino.lng - origen.lng) * progreso,
  ];
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
}

export default function AvionAnimado({ vuelo, animacionActiva = false }: AvionAnimadoProps) {
  const markerRef = useRef<L.Marker>(null);
  const animRef = useRef<number>(0);
  const progresoRef = useRef(0);
  const prevEstadoRef = useRef(vuelo.estado);

  const origenLL = L.latLng(vuelo.origen_lat, vuelo.origen_lon);
  const destinoLL = L.latLng(vuelo.destino_lat, vuelo.destino_lon);
  const distTotal = origenLL.distanceTo(destinoLL);
  const bearing = calcBearing(
    { lat: vuelo.origen_lat, lon: vuelo.origen_lon },
    { lat: vuelo.destino_lat, lon: vuelo.destino_lon }
  );

  const [frozenPos] = useState<[number, number]>(() => {
    const p = vuelo.posicionActual;
    if (p && esCoordenadaValida(p.lat) && esCoordenadaValida(p.lon)) {
      return [p.lat, p.lon];
    }
    return [vuelo.origen_lat, vuelo.origen_lon];
  });
  const [icono, setIcono] = useState(() =>
    crearIconoAvion(COLORES[vuelo.estado] || '#6b7280', bearing)
  );

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;

    const p = vuelo.posicionActual;
    if (!p || !esCoordenadaValida(p.lat) || !esCoordenadaValida(p.lon)) {
      return;
    }

    const actual = L.latLng(p.lat, p.lon);
    const distRecorrida = origenLL.distanceTo(actual);
    const progresoObjetivo = distTotal > 0 ? Math.min(distRecorrida / distTotal, 1) : 0;

    if (vuelo.estado !== prevEstadoRef.current) {
      prevEstadoRef.current = vuelo.estado;
    }

    setIcono(crearIconoAvion(COLORES[vuelo.estado] || '#6b7280', bearing));

    if (!animacionActiva || distTotal === 0) {
      const [lat, lng] = calcPosicionEnRuta(origenLL, destinoLL, progresoObjetivo);
      marker.setLatLng([lat, lng]);
      progresoRef.current = progresoObjetivo;
      return;
    }

    const progInicio = progresoRef.current;
    const duracion = 2000;
    const tiempoInicio = performance.now();

    function animar(tiempo: number) {
      const t = Math.min((tiempo - tiempoInicio) / duracion, 1);
      const suavizado = easeInOutQuad(t);
      const progActual = progInicio + (progresoObjetivo - progInicio) * suavizado;
      const [lat, lng] = calcPosicionEnRuta(origenLL, destinoLL, progActual);
      marker.setLatLng([lat, lng]);
      if (t < 1) {
        animRef.current = requestAnimationFrame(animar);
      } else {
        progresoRef.current = progresoObjetivo;
      }
    }

    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(animar);

    return () => cancelAnimationFrame(animRef.current);
  }, [
    vuelo.posicionActual?.lat,
    vuelo.posicionActual?.lon,
    vuelo.estado,
    animacionActiva,
  ]);

  return (
    <Marker
      ref={markerRef}
      position={frozenPos}
      icon={icono}
    />
  );
}
