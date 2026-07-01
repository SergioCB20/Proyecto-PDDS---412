'use client';

import { useState, useMemo } from 'react';
import { Upload, XCircle, Map as MapIcon } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { colorVueloPorEstado } from '@/lib/colors';
import type { VueloTelemetria } from '@/lib/types';
import { formatearHoraLocalCorta } from '@/lib/formatearHora';

interface PanelVuelosOperacionProps {
  vuelos: VueloTelemetria[];
  onVueloClick?: (id: string, codigo: string) => void;
  onDownloadManifiesto?: (id: string, codigo: string) => void;
  onCancelVuelo?: (id: string, codigo: string) => void;
  onVerEnMapa?: (id: string) => void;
  seguidoId?: string;
  origenFilter?: string;
  destinoFilter?: string;
  onFilterChange?: (filters: { origen: string; destino: string }) => void;
}

// Tope de tarjetas montadas en el DOM. El filtrado opera sobre la lista
// completa; solo se acota cuántas se renderizan a la vez para no saturar la
// pestaña cuando la telemetría trae muchos vuelos.
const MAX_RENDER = 100;

export function PanelVuelosOperacion({ vuelos, onVueloClick, onDownloadManifiesto, onCancelVuelo, onVerEnMapa, seguidoId, origenFilter = '', destinoFilter = '', onFilterChange }: PanelVuelosOperacionProps) {
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [orden, setOrden] = useState('');

  const opcionesOrigen = useMemo(() => {
    const set = new Set(vuelos.map(v => v.origen_iata));
    return Array.from(set).sort().map(iata => ({ value: iata, label: iata }));
  }, [vuelos]);

  const opcionesDestino = useMemo(() => {
    const set = new Set(vuelos.map(v => v.destino_iata));
    return Array.from(set).sort().map(iata => ({ value: iata, label: iata }));
  }, [vuelos]);

  const vuelosFiltrados = useMemo(() => {
    return vuelos.filter(v => {
      if (filtroCodigo && !v.codigo_vuelo.toLowerCase().includes(filtroCodigo.toLowerCase())) return false;
      if (origenFilter && v.origen_iata !== origenFilter) return false;
      if (destinoFilter && v.destino_iata !== destinoFilter) return false;
      return true;
    });
  }, [vuelos, filtroCodigo, origenFilter, destinoFilter]);

  const opcionesOrden = [
    { value: '', label: 'Sin orden' },
    { value: 'ocupacion-asc', label: 'Ocupación ↑' },
    { value: 'ocupacion-desc', label: 'Ocupación ↓' },
    { value: 'hora-salida', label: 'Hora salida' },
    { value: 'hora-llegada', label: 'Hora llegada' },
    { value: 'origen-az', label: 'Origen (A-Z)' },
    { value: 'destino-az', label: 'Destino (A-Z)' },
  ];

  const vuelosOrdenados = useMemo(() => {
    const lista = [...vuelosFiltrados];
    switch (orden) {
      case 'ocupacion-asc':
        lista.sort((a, b) => (a.capacidad_carga - a.carga_disponible) - (b.capacidad_carga - b.carga_disponible));
        break;
      case 'ocupacion-desc':
        lista.sort((a, b) => (b.capacidad_carga - b.carga_disponible) - (a.capacidad_carga - a.carga_disponible));
        break;
      case 'hora-salida':
        lista.sort((a, b) => a.hora_salida.localeCompare(b.hora_salida));
        break;
      case 'hora-llegada':
        lista.sort((a, b) => a.hora_llegada.localeCompare(b.hora_llegada));
        break;
      case 'origen-az':
        lista.sort((a, b) => a.origen_iata.localeCompare(b.origen_iata));
        break;
      case 'destino-az':
        lista.sort((a, b) => a.destino_iata.localeCompare(b.destino_iata));
        break;
    }
    return lista;
  }, [vuelosFiltrados, orden]);

  const vuelosVisibles = useMemo(
    () => vuelosOrdenados.slice(0, MAX_RENDER),
    [vuelosOrdenados]
  );

  const hayFiltrosActivos = filtroCodigo || origenFilter || destinoFilter;

  const limpiarFiltros = () => {
    setFiltroCodigo('');
    onFilterChange?.({ origen: '', destino: '' });
  };

  if (vuelos.length === 0) {
    return (
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Vuelos</h3>
        <p className="text-xs text-slate-400 italic text-center py-2">Sin datos de vuelos</p>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Vuelos</h3>
        <span className="text-xs text-slate-400">
          Mostrando {vuelosFiltrados.length} de {vuelos.length} vuelos
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <div className="flex-1 min-w-[100px]">
          <Input
            placeholder="Código..."
            value={filtroCodigo}
            onChange={e => setFiltroCodigo(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[100px]">
          <Select
            placeholder="Origen"
            options={opcionesOrigen}
            value={origenFilter}
            onChange={e => onFilterChange?.({ origen: e.target.value, destino: destinoFilter })}
          />
        </div>
        <div className="flex-1 min-w-[100px]">
          <Select
            placeholder="Destino"
            options={opcionesDestino}
            value={destinoFilter}
            onChange={e => onFilterChange?.({ origen: origenFilter, destino: e.target.value })}
          />
        </div>
      </div>

      {hayFiltrosActivos && (
        <button
          onClick={limpiarFiltros}
          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mb-2 underline"
        >
          Limpiar filtros
        </button>
      )}

      <div className="mb-3">
        <Select
          placeholder="Ordenar por..."
          options={opcionesOrden}
          value={orden}
          onChange={e => setOrden(e.target.value)}
        />
      </div>

      {vuelosFiltrados.length > MAX_RENDER && (
        <p className="text-[11px] text-slate-400 mb-2">
          Mostrando las primeras {MAX_RENDER}; refina los filtros para ver el resto.
        </p>
      )}

      <div className="space-y-2 max-h-56 overflow-y-auto">
        {vuelosVisibles.map(v => {
          const ocupada = v.capacidad_carga - v.carga_disponible;
          const pct = v.capacidad_carga > 0 ? (ocupada / v.capacidad_carga) * 100 : 0;
          const colorHex = colorVueloPorEstado(v.estado);
          return (
            <div
              key={v.id}
              className="py-2.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700/50 transition-all duration-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shadow-sm animate-pulse" style={{ backgroundColor: colorHex }} />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{v.codigo_vuelo}</span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: `${colorHex}15`, color: colorHex }}
                  >
                    {v.estado === 'EN_RUTA' ? 'En Ruta' : v.estado === 'PROGRAMADO' ? 'Programado' : v.estado === 'CANCELADO' ? 'Cancelado' : 'Completado'}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400">
                  {v.origen_iata} &rarr; {v.destino_iata}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                <span>Carga: {ocupada} / {v.capacidad_carga}</span>
                <span className="font-semibold" style={{ color: colorHex }}>{pct.toFixed(0)}%</span>
              </div>
              <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: colorHex }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mb-2">
                <span>Salida: <strong className="font-medium text-slate-600 dark:text-slate-400">{formatearHoraLocalCorta(v.hora_salida)}</strong></span>
                <span>Llegada: <strong className="font-medium text-slate-600 dark:text-slate-400">{formatearHoraLocalCorta(v.hora_llegada)}</strong></span>
              </div>
              
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2 mt-1.5 gap-2">
                <div className="flex gap-1.5">
                  {onVueloClick && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onVueloClick(v.id, v.codigo_vuelo); }}
                      className="px-2.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-medium transition-colors cursor-pointer border border-transparent dark:border-blue-900/30"
                    >
                      Ver Envíos
                    </button>
                  )}
                  {onDownloadManifiesto && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDownloadManifiesto(v.id, v.codigo_vuelo); }}
                      className="px-2.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium transition-colors cursor-pointer border border-transparent dark:border-emerald-900/30"
                    >
                      Ver Maletas
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {seguidoId === v.id ? (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium whitespace-nowrap">
                      En Mapa [ESC]
                    </span>
                  ) : onVerEnMapa && v.estado === 'EN_RUTA' && (
                    <button
                      onClick={e => { e.stopPropagation(); onVerEnMapa(v.id); }}
                      className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 transition-colors cursor-pointer"
                      title="Ver en mapa"
                    >
                      <MapIcon size={12} />
                    </button>
                  )}
                  {onCancelVuelo && (v.estado === 'PROGRAMADO' || v.estado === 'EN_RUTA') && (
                    <button
                      onClick={e => { e.stopPropagation(); onCancelVuelo(v.id, v.codigo_vuelo); }}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition-colors cursor-pointer"
                      title="Cancelar vuelo"
                    >
                      <XCircle size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {vuelosFiltrados.length === 0 && (
          <p className="text-xs text-slate-400 italic text-center py-2">
            Ningún vuelo coincide con los filtros
          </p>
        )}
      </div>
    </div>
  );
}
