'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Map as MapIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { colorVueloPorEstado, colorVueloPorOcupacion, determinarColorSemaforo, type ColorSemaforo } from '@/lib/colors';
import type { VueloTelemetria } from '@/lib/types';
import { formatearFechaHoraSeparado } from '@/lib/formatearHora';
import { ciudadDe, etiquetaFiltroAeropuerto } from '@/lib/aeropuertos';

interface PanelVuelosOperacionProps {
  vuelos: VueloTelemetria[];
  onVueloClick?: (id: string, codigo: string) => void;
  onDownloadManifiesto?: (id: string, codigo: string) => void;
  onCancelVuelo?: (id: string, codigo: string) => void;
  onVerEnMapa?: (id: string) => void;
  seguidoId?: string;
  seleccionadoId?: string;
  origenFilter?: string;
  destinoFilter?: string;
  onFilterChange?: (filters: { origen: string; destino: string }) => void;
  umbralesConfig?: { verdeMax: number; ambarMax: number };
  /** Filtro por semáforo controlado desde la vista, para reflejarlo en el mapa. */
  filtroColor?: '' | ColorSemaforo;
  onFiltroColorChange?: (color: '' | ColorSemaforo) => void;
}

const MAX_RENDER = 500;

export function PanelVuelosOperacion({ vuelos, onVueloClick, onDownloadManifiesto, onCancelVuelo, onVerEnMapa, seguidoId, seleccionadoId, origenFilter = '', destinoFilter = '', onFilterChange, umbralesConfig, filtroColor, onFiltroColorChange }: PanelVuelosOperacionProps) {
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(true);
  const [filtroCodigo, setFiltroCodigo] = useState('');
  // Controlado si la vista pasa filtroColor (para reflejarlo en el mapa); si no,
  // mantiene el filtro local al panel.
  const [filtroColorInterno, setFiltroColorInterno] = useState<'' | ColorSemaforo>('');
  const filtroColorLocal = filtroColor ?? filtroColorInterno;
  const setFiltroColorLocal = (v: '' | ColorSemaforo) => {
    if (onFiltroColorChange) onFiltroColorChange(v);
    else setFiltroColorInterno(v);
  };
  const [seleccionadoLocal, setSeleccionadoLocal] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  useEffect(() => {
    if (seleccionadoId && itemRefs.current[seleccionadoId]) {
      itemRefs.current[seleccionadoId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setSeleccionadoLocal(seleccionadoId);
    }
  }, [seleccionadoId]);
  const [orden, setOrden] = useState('');

  const opcionesOrigen = useMemo(() => {
    const set = new Set(vuelos.map(v => v.origen_iata));
    return Array.from(set).sort().map(iata => ({ value: iata, label: etiquetaFiltroAeropuerto(iata) }));
  }, [vuelos]);

  const opcionesDestino = useMemo(() => {
    const set = new Set(vuelos.map(v => v.destino_iata));
    return Array.from(set).sort().map(iata => ({ value: iata, label: etiquetaFiltroAeropuerto(iata) }));
  }, [vuelos]);

  const vuelosFiltrados = useMemo(() => {
    return vuelos.filter(v => {
      if (filtroCodigo && !v.codigo_vuelo.toLowerCase().includes(filtroCodigo.toLowerCase())) return false;
      if (origenFilter && v.origen_iata !== origenFilter) return false;
      if (destinoFilter && v.destino_iata !== destinoFilter) return false;
      if (filtroColorLocal) {
        if (determinarColorSemaforo(v.ocupacion_pct, umbralesConfig) !== filtroColorLocal) return false;
      }
      return true;
    });
  }, [vuelos, filtroCodigo, origenFilter, destinoFilter, filtroColorLocal, umbralesConfig]);

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

  const hayFiltrosActivos = filtroCodigo || origenFilter || destinoFilter || filtroColorLocal;

  const limpiarFiltros = () => {
    setFiltroCodigo('');
    onFilterChange?.({ origen: '', destino: '' });
    setFiltroColorLocal('');
  };

  if (vuelos.length === 0) {
    return (
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Vuelos</h3>
        <p className="text-xs text-slate-600 italic text-center py-2">Sin datos de vuelos</p>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Vuelos</h3>
          <button onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"
            title={filtrosAbiertos ? 'Ocultar filtros' : 'Mostrar filtros'}
          >
            {filtrosAbiertos ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
        <span className="text-xs text-slate-600">
          Mostrando {vuelosFiltrados.length} de {vuelos.length}
        </span>
      </div>

      {filtrosAbiertos && (
      <>
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

      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {(['', 'VACIO', 'VERDE', 'AMBAR', 'ROJO'] as const).map((opt) => (
          <button key={opt} onClick={() => setFiltroColorLocal(filtroColorLocal === opt ? '' : opt)}
            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
              filtroColorLocal === opt
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {opt === '' ? 'Todos' : (
              <span className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: opt === 'VACIO' ? '#9ca3af' : opt === 'VERDE' ? '#22c55e' : opt === 'AMBAR' ? '#eab308' : '#ef4444' }}
              />
            )}
          </button>
        ))}
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
      </>)}

      {vuelosFiltrados.length > MAX_RENDER && (
        <p className="text-sm text-slate-600 mb-2">
          Mostrando las primeras {MAX_RENDER}; refina los filtros para ver el resto.
        </p>
      )}

      <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase tracking-wide z-10">
            <tr>
              <th className="text-left px-2 py-2 font-semibold">Código</th>
              <th className="text-left px-2 py-2 font-semibold">Estado</th>
              <th className="text-left px-2 py-2 font-semibold hidden lg:table-cell">Ruta</th>
              <th className="text-right px-2 py-2 font-semibold">Carga</th>
              <th className="text-left px-2 py-2 font-semibold">Sale</th>
              <th className="text-left px-2 py-2 font-semibold">Llega</th>
              <th className="text-right px-2 py-2 font-semibold w-24">—</th>
            </tr>
          </thead>
          <tbody>
            {vuelosVisibles.map((v, idx) => {
              const ocupada = v.capacidad_carga - v.carga_disponible;
              const pct = v.capacidad_carga > 0 ? (ocupada / v.capacidad_carga) * 100 : 0;
              const colorHex = colorVueloPorEstado(v.estado);
              const semaforoColor = colorVueloPorOcupacion(pct, umbralesConfig);
              const salida = formatearFechaHoraSeparado(v.hora_salida);
              const llegada = formatearFechaHoraSeparado(v.hora_llegada);
              const zebra = idx % 2 === 0 ? 'bg-white/40 dark:bg-slate-900/20' : '';
              const seleccionado = (seleccionadoLocal ?? seleccionadoId) === v.id;
              const rowCls = `${zebra} ${seleccionado ? '!bg-blue-50 dark:!bg-blue-900/30 ring-1 ring-blue-300 dark:ring-blue-700' : ''} cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20`;
              const estadoLabel = v.estado === 'EN_RUTA' ? 'En Ruta' : v.estado === 'PROGRAMADO' ? 'Programado' : v.estado === 'CANCELADO' ? 'Cancelado' : 'Completado';
              const estadoBg = v.estado === 'PROGRAMADO' ? '#f1f5f9' : `${colorHex}15`;
              const estadoFg = v.estado === 'PROGRAMADO' ? '#94a3b8' : colorHex;
              return (
                <tr
                  key={v.id}
                  ref={el => { itemRefs.current[v.id] = el; }}
                  className={rowCls + ' border-t border-slate-100 dark:border-slate-800'}
                  onClick={() => {
                    setSeleccionadoLocal(v.id);
                  }}
                >
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full shadow-sm shrink-0 ${v.estado !== 'PROGRAMADO' ? 'animate-pulse' : ''} ${v.estado === 'PROGRAMADO' ? 'ring-1 ring-slate-300' : ''}`} style={{ backgroundColor: semaforoColor }} />
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{v.codigo_vuelo}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap"
                      style={{ backgroundColor: estadoBg, color: estadoFg }}
                    >
                      {estadoLabel}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300 truncate hidden lg:table-cell max-w-[180px]" title={`${ciudadDe(v.origen_iata)} → ${ciudadDe(v.destino_iata)}`}>
                    {ciudadDe(v.origen_iata)} <span className="text-slate-400">→</span> {ciudadDe(v.destino_iata)}
                  </td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">
                    <span className="text-slate-600 dark:text-slate-400">{ocupada}/{v.capacidad_carga}</span>
                    <span className="ml-2 font-bold" style={{ color: semaforoColor }}>{pct.toFixed(0)}%</span>
                    <div className="w-16 h-1 mt-0.5 ml-auto bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: semaforoColor }} />
                    </div>
                  </td>
                  <td className="px-2 py-1.5 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {salida.hora}
                  </td>
                  <td className="px-2 py-1.5 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {llegada.hora}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {seguidoId === v.id ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium whitespace-nowrap">En Mapa</span>
                      ) : onVerEnMapa && v.estado === 'EN_RUTA' && (
                        <button
                          onClick={e => { e.stopPropagation(); onVerEnMapa(v.id); }}
                          className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600"
                          title="Ver en mapa"
                        >
                          <MapIcon size={12} />
                        </button>
                      )}
                      {onVueloClick && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onVueloClick(v.id, v.codigo_vuelo); }}
                          className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-medium transition-colors cursor-pointer border border-transparent dark:border-blue-900/30"
                          title="Ver envíos y maletas de este vuelo"
                        >
                          Envíos
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {vuelosFiltrados.length === 0 && (
              <tr>
                <td colSpan={7} className="text-xs text-slate-600 italic text-center py-4">
                  Ningún vuelo coincide con los filtros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
