'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { VueloTelemetria } from '@/lib/types';

interface PanelVuelosProps {
  vuelos: VueloTelemetria[];
}

export function PanelVuelos({ vuelos }: PanelVuelosProps) {
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroOrigen, setFiltroOrigen] = useState('');
  const [filtroDestino, setFiltroDestino] = useState('');

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
      if (filtroOrigen && v.origen_iata !== filtroOrigen) return false;
      if (filtroDestino && v.destino_iata !== filtroDestino) return false;
      return true;
    });
  }, [vuelos, filtroCodigo, filtroOrigen, filtroDestino]);

  const hayFiltrosActivos = filtroCodigo || filtroOrigen || filtroDestino;

  const limpiarFiltros = () => {
    setFiltroCodigo('');
    setFiltroOrigen('');
    setFiltroDestino('');
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
            value={filtroOrigen}
            onChange={e => setFiltroOrigen(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[100px]">
          <Select
            placeholder="Destino"
            options={opcionesDestino}
            value={filtroDestino}
            onChange={e => setFiltroDestino(e.target.value)}
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

      <div className="space-y-2 max-h-56 overflow-y-auto">
        {vuelosFiltrados.map(v => {
          const ocupada = v.capacidad_carga - v.carga_disponible;
          const pct = v.capacidad_carga > 0 ? (ocupada / v.capacidad_carga) * 100 : 0;
          const colorHex = v.estado === 'EN_RUTA' ? '#22c55e' : v.estado === 'PROGRAMADO' ? '#3b82f6' : '#6b7280';
          return (
            <div key={v.id} className="py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorHex }} />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{v.codigo_vuelo}</span>
                </div>
                <span className="text-xs text-slate-500">
                  {v.origen_iata}→{v.destino_iata}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{ocupada}/{v.capacidad_carga}</span>
                <span className="font-semibold" style={{ color: colorHex }}>{pct.toFixed(0)}%</span>
              </div>
              <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: colorHex }}
                />
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
