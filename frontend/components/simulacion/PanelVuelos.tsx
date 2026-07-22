'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Calendar, Plane, XCircle, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { colorVueloPorEstado, colorVueloPorOcupacion, determinarColorSemaforo, type ColorSemaforo } from '@/lib/colors';
import type { VueloTelemetria } from '@/lib/types';
import { formatearFechaHoraSeparado } from '@/lib/formatearHora';

interface PanelVuelosProps {
  vuelos: VueloTelemetria[];
  onVueloClick?: (id: string, codigo: string) => void;
  origenFilter?: string;
  destinoFilter?: string;
  onFilterChange?: (filters: { origen: string; destino: string }) => void;
}

const MAX_RENDER = 500;

const ICONO_ESTADO_VUELO: Record<string, React.ReactNode> = {
  PROGRAMADO: <Calendar size={11} />,
  EN_RUTA: <Plane size={11} className="rotate-45" />,
  CANCELADO: <XCircle size={11} />,
  COMPLETADO: <CheckCircle size={11} />,
};

export function PanelVuelos({ vuelos, onVueloClick, origenFilter = '', destinoFilter = '', onFilterChange }: PanelVuelosProps) {
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(true);
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroColorLocal, setFiltroColorLocal] = useState<'' | ColorSemaforo>('');
  const [orden, setOrden] = useState('');
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    if (origenFilter || destinoFilter) {
      const found = vuelos.find(v => v.origen_iata === origenFilter && (!destinoFilter || v.destino_iata === destinoFilter));
      if (found && itemRefs.current[found.id]) {
        itemRefs.current[found.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [origenFilter, destinoFilter, vuelos]);

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
      if (filtroColorLocal) {
        if (determinarColorSemaforo(v.ocupacion_pct) !== filtroColorLocal) return false;
      }
      return true;
    });
  }, [vuelos, filtroCodigo, origenFilter, destinoFilter, filtroColorLocal]);

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
        lista.sort((a, b) => new Date(a.hora_salida).getTime() - new Date(b.hora_salida).getTime());
        break;
      case 'hora-llegada':
        lista.sort((a, b) => new Date(a.hora_llegada).getTime() - new Date(b.hora_llegada).getTime());
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

      <div className="max-h-[28rem] overflow-y-auto flex flex-col gap-1.5 pr-0.5">
        {vuelosVisibles.map((v) => {
          const ocupada = v.capacidad_carga - v.carga_disponible;
          const pct = v.capacidad_carga > 0 ? (ocupada / v.capacidad_carga) * 100 : 0;
          const colorHex = colorVueloPorEstado(v.estado);
          const semaforoColor = colorVueloPorOcupacion(pct);
          const salida = formatearFechaHoraSeparado(v.hora_salida);
          const llegada = formatearFechaHoraSeparado(v.hora_llegada);
          const estadoLabel = v.estado === 'EN_RUTA' ? 'En ruta' : v.estado === 'PROGRAMADO' ? 'Programado' : v.estado === 'CANCELADO' ? 'Cancelado' : 'Completado';
          const estadoColor = v.estado === 'PROGRAMADO' ? '#94a3b8' : colorHex;
          return (
            <div
              key={v.id}
              ref={el => { itemRefs.current[v.id] = el; }}
              onClick={() => onVueloClick?.(v.id, v.codigo_vuelo)}
              className={`rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 transition-colors ${onVueloClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40' : ''}`}
            >
              {/* Línea 1: estado (icono) + código + ruta + ocupación */}
              <div className="flex items-center gap-2">
                <span className="shrink-0 flex" title={estadoLabel} style={{ color: estadoColor }}>
                  {ICONO_ESTADO_VUELO[v.estado] ?? null}
                </span>
                <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 shrink-0">{v.codigo_vuelo}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate min-w-0">
                  {v.origen_iata} <span className="text-slate-400">→</span> {v.destino_iata}
                </span>
                <div className="flex-1" />
                <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: semaforoColor }}>{pct.toFixed(0)}%</span>
              </div>
              {/* Línea 2: horarios + carga */}
              <div className="flex items-center gap-3 mt-1 text-[11px]">
                <span className="font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap" title="Salida">
                  <span className="text-slate-400">↑</span> {salida.hora}<span className="ml-1 text-slate-400">{salida.fecha}</span>
                </span>
                <span className="font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap" title="Llegada">
                  <span className="text-slate-400">↓</span> {llegada.hora}<span className="ml-1 text-slate-400">{llegada.fecha}</span>
                </span>
                <div className="flex-1 flex items-center gap-1.5 min-w-0" title={`Carga ${ocupada}/${v.capacidad_carga}`}>
                  <div className="flex-1 h-1.5 min-w-[24px] bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: semaforoColor }} />
                  </div>
                  <span className="text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap">{ocupada}/{v.capacidad_carga}</span>
                </div>
              </div>
            </div>
          );
        })}
        {vuelosFiltrados.length === 0 && (
          <p className="text-xs text-slate-600 italic text-center py-4">
            Ningún vuelo coincide con los filtros
          </p>
        )}
      </div>
    </div>
  );
}
