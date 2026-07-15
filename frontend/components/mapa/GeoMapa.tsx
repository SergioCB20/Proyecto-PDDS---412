'use client';

import { MapContainer, TileLayer, useMap, Polyline } from 'react-leaflet';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EyeOff, X } from 'lucide-react';
import type { AeropuertoEnMapa, VueloEnMapa, RutaDestacada } from '@/lib/types';
import type { UmbralesConfig } from './ConfigUmbrales';
import { determinarColorSemaforo } from '@/lib/colors';
import 'leaflet/dist/leaflet.css';
import dynamic from 'next/dynamic';
import ControlZoom from './ControlZoom';
import { CENTRO, ZOOM } from './mapaConfig';

interface MapControllerProps {
  aeropuertos: AeropuertoEnMapa[];
  vuelos: VueloEnMapa[];
  seguidoVueloId?: string;
  seguidoAeropuertoId?: string;
  onSalirSeguimiento?: () => void;
  onSalirSeguimientoAeropuerto?: () => void;
  rutaDestacada?: RutaDestacada | null;
  onLimpiarRuta?: () => void;
  /** Si no es vacio, hace fitBounds a los aeropuerts cuyo continente coincida. */
  continenteFiltro?: string;
}

function MapController({
  aeropuertos,
  vuelos,
  seguidoVueloId,
  seguidoAeropuertoId,
  onSalirSeguimiento,
  onSalirSeguimientoAeropuerto,
  rutaDestacada,
  onLimpiarRuta,
  continenteFiltro,
}: MapControllerProps) {
  const map = useMap();
  const siguiendo = !!(seguidoVueloId || seguidoAeropuertoId);
  const previous = useRef<{ tipo: 'vuelo' | 'aero' | null; id: string | null }>({ tipo: null, id: null });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (rutaDestacada) {
          onLimpiarRuta?.();
          map.flyTo(CENTRO, ZOOM, { duration: 0.8 });
          return;
        }
        if (siguiendo) {
          if (seguidoAeropuertoId) onSalirSeguimientoAeropuerto?.();
          if (seguidoVueloId) onSalirSeguimiento?.();
          map.flyTo(CENTRO, ZOOM, { duration: 0.8 });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [map, siguiendo, seguidoVueloId, seguidoAeropuertoId, onSalirSeguimiento, onSalirSeguimientoAeropuerto, rutaDestacada, onLimpiarRuta]);

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

  useEffect(() => {
    if (rutaDestacada && rutaDestacada.coordenadas.length > 1) {
      map.fitBounds(rutaDestacada.coordenadas, { padding: [50, 50], duration: 1 });
    }
  }, [rutaDestacada, map]);

  // Filtro por continente: mueve la camara para encuadrar todos los aeropuerts del
  // continente seleccionado. Si el filtro queda vacio y antes habia uno aplicado,
  // vuelve al centro del mundo (mismo destino al que ESC lleva cuando se sale del
  // seguimiento). Gana siempre sobre el seguimiento activo: la accion del usuario
  // al elegir continente debe reubicar la camara.
  const previousContinente = useRef<string | null>(null);
  useEffect(() => {
    const previo = previousContinente.current;
    if (previo === continenteFiltro) return;

    if (continenteFiltro) {
      const coords = aeropuertos
        .filter(
          (a) => (a.continente || a.zona_horaria) === continenteFiltro,
        )
        .map<[number, number]>((a) => [a.latitud, a.longitud]);
      if (coords.length === 1) {
        // Un solo aeropuert: fitBounds sobre-zoomea hasta maxZoom=18. Fallback a
        // flyTo con zoom 7, mismo nivel que el click-marker (Precedent en L63).
        map.flyTo(coords[0], 7, { duration: 1 });
      } else if (coords.length > 1) {
        map.fitBounds(coords, { padding: [50, 50], duration: 1 });
      }
    } else if (previo) {
      // Filtro limpiado: volver a la vista global del mundo (mismo flyTo que ESC).
      map.flyTo(CENTRO, ZOOM, { duration: 0.8 });
    }

    previousContinente.current = continenteFiltro ?? null;
  }, [continenteFiltro, aeropuertos, map]);

  return null;
}

const GeoMapaAeropuerto = dynamic(() => import('./GeoMapaAeropuerto'), { ssr: false });
const GeoMapaVuelo = dynamic(() => import('./GeoMapaVuelo'), { ssr: false });
const GeoMapaLeyenda = dynamic(() => import('./GeoMapaLeyenda'), { ssr: false });
const GeoMapaEtiquetasPaises = dynamic(() => import('./GeoMapaEtiquetasPaises'), { ssr: false });

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
  onVueloSeleccionado?: (id: string) => void;
  seguidoAeropuertoId?: string;
  onSalirSeguimientoAeropuerto?: () => void;
  rutaDestacada?: RutaDestacada | null;
  onLimpiarRuta?: () => void;
  /** Filtro por semáforo de almacenes, sincronizado con el panel. */
  filtroColorAeropuerto?: string;
  /** Filtro por semáforo de unidades de transporte, sincronizado con el panel. */
  filtroColorVuelo?: string;
  onAeropuertoClick?: (codigoIata: string) => void;
  /** Filtro por continente que se representa en el mapa con fitBounds. */
  continenteFiltro?: string;
  mostrarZoom?: boolean;
  onCerrarZoom?: () => void;
}

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
  children,
  seguidoVueloId,
  onSalirSeguimiento,
  onSeguirVuelo,
  onVueloSeleccionado,
  seguidoAeropuertoId,
  onSalirSeguimientoAeropuerto,
  rutaDestacada,
  onLimpiarRuta,
  filtroColorAeropuerto,
  filtroColorVuelo,
  onAeropuertoClick,
  continenteFiltro,
  mostrarZoom = true,
  onCerrarZoom,
}: GeoMapaProps) {
  const [legendaVisible, setLegendaVisible] = useState(true);

  const aeropuertosFiltrados = (seguidoAeropuertoId
    ? aeropuertos.filter(a => a.codigo_iata === seguidoAeropuertoId)
    : seguidoVueloId
      ? (() => {
          const v = vuelos.find(v => v.id === seguidoVueloId);
          if (v) {
            const iatas = new Set([v.origen.codigo_iata, v.destino.codigo_iata]);
            return aeropuertos.filter(a => iatas.has(a.codigo_iata));
          }
          return aeropuertos;
        })()
      : aeropuertos
  ).filter(a => {
    if (!filtroColorAeropuerto) return true;
    return determinarColorSemaforo(a.ocupacionPorcentaje, umbralesConfig) === filtroColorAeropuerto;
  });

  const vuelosFiltrados = (seguidoAeropuertoId
    ? vuelos.filter(v => v.origen.codigo_iata === seguidoAeropuertoId || v.destino.codigo_iata === seguidoAeropuertoId)
    : seguidoVueloId
      ? vuelos.filter(v => v.id === seguidoVueloId)
      : vuelos
  ).filter(v => {
    if (!filtroColorVuelo) return true;
    const pct = v.capacidad_carga > 0
      ? ((v.capacidad_carga - v.carga_disponible) / v.capacidad_carga) * 100
      : 0;
    return determinarColorSemaforo(pct, umbralesConfig) === filtroColorVuelo;
  });

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
    <div className={`relative ${className}`}>
      <MapContainer
        center={CENTRO}
        zoom={ZOOM}
        className="w-full h-full z-0"
        zoomControl={false}
        scrollWheelZoom={true}
        attributionControl={false}
        zoomSnap={0}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={120}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
        />
        <GeoMapaEtiquetasPaises />
        {aeropuertosFiltrados.map((aeropuerto) => (
          <GeoMapaAeropuerto key={aeropuerto.codigo_iata} aeropuerto={aeropuerto} onClick={onAeropuertoClick} />
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
            onVueloSeleccionado={onVueloSeleccionado}
            destacado={rutaDestacada?.vueloIds.includes(vuelo.codigo_vuelo) ?? false}
          />
        ))}
        {rutaDestacada && rutaDestacada.coordenadas.length > 1 && (
          <Polyline
            positions={rutaDestacada.coordenadas}
            pathOptions={{ color: '#2563eb', weight: 5, opacity: 0.8 }}
          />
        )}
        {mostrarZoom && <ControlZoom onClose={onCerrarZoom} />}
        <MapController
          aeropuertos={aeropuertos}
          vuelos={vuelos}
          seguidoVueloId={seguidoVueloId}
          seguidoAeropuertoId={seguidoAeropuertoId}
          onSalirSeguimiento={onSalirSeguimiento}
          onSalirSeguimientoAeropuerto={onSalirSeguimientoAeropuerto}
          rutaDestacada={rutaDestacada}
          onLimpiarRuta={onLimpiarRuta}
          continenteFiltro={continenteFiltro}
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
          <EyeOff size={16} className="text-slate-600 dark:text-slate-300" />
        </button>
      )}

      {/* Contenido flotante (filtros desde el padre via children + seguido overlay) */}
      {rutaDestacada && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="pointer-events-auto inline-flex items-center gap-2 rounded-xl bg-blue-600/90 backdrop-blur-sm px-3 py-1.5 text-sm font-medium text-white shadow-lg">
            <span>Ruta destacada</span>
            <button
              onClick={() => onLimpiarRuta?.()}
              className="p-0.5 rounded-full hover:bg-blue-500 transition-colors"
              title="Cerrar ruta [ESC]"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}
      {siguiendo && (
        <div className="absolute top-4 left-4 z-40 pointer-events-none">
          <div className="pointer-events-auto rounded-xl bg-blue-100/90 dark:bg-blue-900/40 backdrop-blur-sm px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 shadow-lg border border-blue-200 dark:border-blue-800">
            Siguiendo elemento — ESC para salir
          </div>
        </div>
      )}

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
