'use client';

import { MapContainer, TileLayer } from 'react-leaflet';
import { useEffect, useState } from 'react';
import type { AeropuertoEnMapa, VueloEnMapa } from '@/lib/types';
import type { UmbralesConfig } from './ConfigUmbrales';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';
import ControlZoom from './ControlZoom';

const GeoMapaAeropuerto = dynamic(() => import('./GeoMapaAeropuerto'), { ssr: false });
const GeoMapaVuelo = dynamic(() => import('./GeoMapaVuelo'), { ssr: false });
const GeoMapaLeyenda = dynamic(() => import('./GeoMapaLeyenda'), { ssr: false });

interface GeoMapaProps {
  aeropuertos: AeropuertoEnMapa[];
  vuelos: VueloEnMapa[];
  mostrarAviones?: boolean;
  animacionActiva?: boolean;
  k?: number;
  className?: string;
  umbralesConfig?: UmbralesConfig;
  /** Muestra una pantalla de carga sobre el mapa hasta que los datos estén listos. */
  cargando?: boolean;
}

const CENTRO: [number, number] = [-15, -60];
const ZOOM = 4;
// Gracia tras `cargando=false` para que los marcadores terminen de montarse
// antes de revelar el mapa (evita ver los aviones aparecer "de a poco").
const SETTLE_MS = 600;

export default function GeoMapa({
  aeropuertos,
  vuelos,
  mostrarAviones = true,
  animacionActiva = false,
  k = 120,
  className = '',
  umbralesConfig,
  cargando = false,
}: GeoMapaProps) {
  // Mantiene el overlay un poco más tras cargar para que la flota se pinte completa.
  const [overlayVisible, setOverlayVisible] = useState(cargando);
  useEffect(() => {
    if (cargando) {
      setOverlayVisible(true);
      return;
    }
    const t = setTimeout(() => setOverlayVisible(false), SETTLE_MS);
    return () => clearTimeout(t);
  }, [cargando]);

  return (
    <div className={`relative ${className}`} style={{ padding: '10px' }}>
      <MapContainer
        center={CENTRO}
        zoom={ZOOM}
        className="w-full h-full rounded-xl z-0"
        zoomControl={false}
        scrollWheelZoom={true}
        attributionControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {aeropuertos.map((aeropuerto) => (
          <GeoMapaAeropuerto key={aeropuerto.codigo_iata} aeropuerto={aeropuerto} />
        ))}
        {mostrarAviones && vuelos.map((vuelo) => (
          <GeoMapaVuelo
            key={vuelo.id}
            vuelo={vuelo}
            animacionActiva={animacionActiva}
            k={k}
            umbralesConfig={umbralesConfig}
          />
        ))}
        <ControlZoom />
        <GeoMapaLeyenda umbralesConfig={umbralesConfig} />
      </MapContainer>

      {overlayVisible && (
        <div
          className="absolute inset-0 z-[1200] flex flex-col items-center justify-center gap-3 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm transition-opacity"
          role="status"
          aria-live="polite"
        >
          <div className="w-10 h-10 border-4 border-slate-300 dark:border-slate-600 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Cargando mapa…
          </span>
        </div>
      )}
    </div>
  );
}
