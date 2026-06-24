'use client';

import { MapContainer, TileLayer } from 'react-leaflet';
import type { NodoEnMapa, VueloEnMapa } from '@/lib/types';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';

const GeoMapaNodo = dynamic(() => import('./GeoMapaNodo'), { ssr: false });
const GeoMapaVuelo = dynamic(() => import('./GeoMapaVuelo'), { ssr: false });
const GeoMapaLeyenda = dynamic(() => import('./GeoMapaLeyenda'), { ssr: false });

interface GeoMapaProps {
  nodos: NodoEnMapa[];
  vuelos: VueloEnMapa[];
  mostrarAviones?: boolean;
  animacionActiva?: boolean;
  k?: number;
  className?: string;
}

const CENTRO: [number, number] = [-15, -60];
const ZOOM = 4;

export default function GeoMapa({
  nodos,
  vuelos,
  mostrarAviones = true,
  animacionActiva = false,
  k = 120,
  className = '',
}: GeoMapaProps) {
  if (typeof window === 'undefined') {
    return (
      <div className={`bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center ${className}`}>
        <span className="text-slate-400 text-sm">Cargando mapa...</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={CENTRO}
        zoom={ZOOM}
        className="w-full h-full rounded-xl z-0"
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {nodos.map((nodo) => (
          <GeoMapaNodo key={nodo.codigo_iata} nodo={nodo} />
        ))}
        {mostrarAviones && vuelos.map((vuelo) => (
          <GeoMapaVuelo
            key={vuelo.id}
            vuelo={vuelo}
            animacionActiva={animacionActiva}
            k={k}
          />
        ))}
      </MapContainer>
      <GeoMapaLeyenda />
    </div>
  );
}
