'use client';

import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useEffect, useRef, useState, useMemo, type ReactNode } from 'react';
import { Luggage, EyeOff, Search } from 'lucide-react';
import type { AeropuertoEnMapa, VueloEnMapa } from '@/lib/types';
import type { UmbralesConfig } from './ConfigUmbrales';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';
import ControlZoom from './ControlZoom';

interface MapControllerProps {
  aeropuertos: AeropuertoEnMapa[];
  vuelos: VueloEnMapa[];
  seguidoVueloId?: string;
  seguidoAeropuertoId?: string;
  onSalirSeguimiento?: () => void;
  onSalirSeguimientoAeropuerto?: () => void;
}

function MapController({ aeropuertos, vuelos, seguidoVueloId, seguidoAeropuertoId, onSalirSeguimiento, onSalirSeguimientoAeropuerto }: MapControllerProps) {
  const map = useMap();
  const siguiendo = !!(seguidoVueloId || seguidoAeropuertoId);
  const previous = useRef<{ tipo: 'vuelo' | 'aero' | null; id: string | null }>({ tipo: null, id: null });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && siguiendo) {
        if (seguidoAeropuertoId) onSalirSeguimientoAeropuerto?.();
        if (seguidoVueloId) onSalirSeguimiento?.();
        map.flyTo(CENTRO, ZOOM, { duration: 0.8 });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [map, siguiendo, seguidoVueloId, seguidoAeropuertoId, onSalirSeguimiento, onSalirSeguimientoAeropuerto]);

  useEffect(() => {
    if (seguidoVueloId && seguidoVueloId !== previous.current.id && previous.current.tipo !== 'vuelo') {
      const v = vuelos.find(v => v.id === seguidoVueloId);
      if (v) {
        const mid: [number, number] = [(v.origen_lat + v.destino_lat) / 2, (v.origen_lon + v.destino_lon) / 2];
        map.flyTo(mid, 7, { duration: 1 });
      }
      previous.current = { tipo: 'vuelo', id: seguidoVueloId };
    }
  }, [seguidoVueloId, vuelos, map]);

  useEffect(() => {
    if (seguidoAeropuertoId && seguidoAeropuertoId !== previous.current.id && previous.current.tipo !== 'aero') {
      const a = aeropuertos.find(a => a.codigo_iata === seguidoAeropuertoId);
      if (a) {
        map.flyTo([a.latitud, a.longitud], 7, { duration: 1 });
      }
      previous.current = { tipo: 'aero', id: seguidoAeropuertoId };
    }
  }, [seguidoAeropuertoId, aeropuertos, map]);

  return null;
}

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
  children?: ReactNode;
  seguidoVueloId?: string;
  onSalirSeguimiento?: () => void;
  onSeguirVuelo?: (id: string) => void;
  seguidoAeropuertoId?: string;
  onSalirSeguimientoAeropuerto?: () => void;
}

const CENTRO: [number, number] = [-15, -60];
const ZOOM = 4;
// Gracia tras `cargando=false` para que los marcadores terminen de montarse
// antes de revelar el mapa (evita ver los aviones aparecer "de a poco").
const SETTLE_MS = 600;

type EquipajeFilter = 'todos' | 'con_equipaje' | 'sin_equipaje';

const EQUIPAJE_FILTER_OPTS: { value: EquipajeFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'con_equipaje', label: 'Con equipaje' },
  { value: 'sin_equipaje', label: 'Sin equipaje' },
];

export default function GeoMapa({
  aeropuertos,
  vuelos,
  mostrarAviones = true,
  animacionActiva = false,
  k = 120,
  className = '',
  umbralesConfig,
  cargando = false,
  children,
  seguidoVueloId,
  onSalirSeguimiento,
  onSeguirVuelo,
  seguidoAeropuertoId,
  onSalirSeguimientoAeropuerto,
}: GeoMapaProps) {
  const [equipajeFilter, setEquipajeFilter] = useState<EquipajeFilter>('todos');
  const [aeroFilter, setAeroFilter] = useState('');
  const [legendaVisible, setLegendaVisible] = useState(true);

  const aeropuertosFiltrados = useMemo(() => {
    let lista = aeropuertos;
    if (seguidoAeropuertoId) {
      lista = lista.filter(a => a.codigo_iata === seguidoAeropuertoId);
    } else if (seguidoVueloId) {
      const v = vuelos.find(v => v.id === seguidoVueloId);
      if (v) {
        const iatas = new Set([v.origen.codigo_iata, v.destino.codigo_iata]);
        lista = lista.filter(a => iatas.has(a.codigo_iata));
      }
    } else if (aeroFilter) {
      const q = aeroFilter.toLowerCase();
      lista = lista.filter(a =>
        a.codigo_iata.toLowerCase().includes(q) ||
        a.nombre.toLowerCase().includes(q)
      );
    }
    return lista;
  }, [aeropuertos, aeroFilter, seguidoVueloId, seguidoAeropuertoId, vuelos]);

  const vuelosFiltrados = useMemo(() => {
    let lista = vuelos;
    if (seguidoAeropuertoId) {
      lista = lista.filter(v => v.origen.codigo_iata === seguidoAeropuertoId || v.destino.codigo_iata === seguidoAeropuertoId);
    } else if (seguidoVueloId) {
      lista = lista.filter(v => v.id === seguidoVueloId);
    } else if (equipajeFilter !== 'todos') {
      lista = lista.filter(v => {
        const tieneEquipaje = v.carga_disponible < v.capacidad_carga;
        return equipajeFilter === 'con_equipaje' ? tieneEquipaje : !tieneEquipaje;
      });
    }
    return lista;
  }, [vuelos, equipajeFilter, seguidoVueloId, seguidoAeropuertoId]);

  // Mantiene el overlay un poco más tras cargar para que la flota se pinte completa.
  // `settling` solo cubre la ventana de gracia posterior a la carga; el estado durante
  // la carga se deriva de `cargando` en el render (sin setState síncrono en el efecto).
  const fueCargando = useRef(false);
  const [settling, setSettling] = useState(false);
  useEffect(() => {
    if (cargando) {
      fueCargando.current = true;
      return; // mientras carga, el overlay ya se muestra por `cargando`
    }
    if (!fueCargando.current) return; // nunca estuvo cargando: evita un flash en el montaje
    fueCargando.current = false;
    setSettling(true);
    const t = setTimeout(() => setSettling(false), SETTLE_MS);
    return () => clearTimeout(t);
  }, [cargando]);

  const showOverlay = cargando || settling;

  const siguiendo = !!(seguidoVueloId || seguidoAeropuertoId);

  return (
    <div className={`relative ${className}`} style={{ padding: '10px' }}>
      <MapContainer
        center={CENTRO}
        zoom={ZOOM}
        className="w-full h-full rounded-xl z-0"
        zoomControl={false}
        scrollWheelZoom={true}
        attributionControl={false}
        zoomSnap={0}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={120}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {aeropuertosFiltrados.map((aeropuerto) => (
          <GeoMapaAeropuerto key={aeropuerto.codigo_iata} aeropuerto={aeropuerto} />
        ))}
        {mostrarAviones && vuelosFiltrados.map((vuelo) => (
          <GeoMapaVuelo
            key={vuelo.id}
            vuelo={vuelo}
            animacionActiva={animacionActiva}
            k={k}
            umbralesConfig={umbralesConfig}
            seguido={vuelo.id === seguidoVueloId}
            onSalirSeguimiento={onSalirSeguimiento}
            onSeguirVuelo={onSeguirVuelo}
          />
        ))}
        <ControlZoom />
        <MapController
          aeropuertos={aeropuertos}
          vuelos={vuelos}
          seguidoVueloId={seguidoVueloId}
          seguidoAeropuertoId={seguidoAeropuertoId}
          onSalirSeguimiento={onSalirSeguimiento}
          onSalirSeguimientoAeropuerto={onSalirSeguimientoAeropuerto}
        />
        {legendaVisible && <GeoMapaLeyenda umbralesConfig={umbralesConfig} onClose={() => setLegendaVisible(false)} />}
        {children}
      </MapContainer>

      {/* Botón re-abrir leyenda cuando está oculta */}
      {!legendaVisible && (
        <button
          onClick={() => setLegendaVisible(true)}
          className="absolute bottom-4 right-4 z-40 p-2 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          title="Mostrar leyenda"
        >
          <EyeOff size={16} className="text-slate-500 dark:text-slate-400" />
        </button>
      )}

      {/* Filtros flotantes superiores (ocultos cuando se sigue un elemento) */}
      {!siguiendo && <div className="absolute top-4 left-4 z-40 flex flex-col gap-1.5">
        {/* Filtro de aeropuertos */}
        <div className="flex items-center gap-1 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5">
          <Search size={12} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Filtrar aeropuerto..."
            value={aeroFilter}
            onChange={e => setAeroFilter(e.target.value)}
            className="w-28 bg-transparent text-[11px] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 outline-none border-none"
          />
          {aeroFilter && (
            <button onClick={() => setAeroFilter('')} className="text-slate-400 hover:text-slate-600 text-[11px] font-medium ml-1">×</button>
          )}
        </div>

        {/* Filtro de equipaje */}
        <div className="flex items-center gap-1 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg border border-slate-200 dark:border-slate-700 px-2 py-1.5">
          <Luggage size={14} className="text-slate-500 dark:text-slate-400 mr-1" />
          {EQUIPAJE_FILTER_OPTS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setEquipajeFilter(opt.value)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors ${
                equipajeFilter === opt.value
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>}

      {showOverlay && (
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
