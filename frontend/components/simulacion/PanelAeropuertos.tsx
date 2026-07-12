'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Map as MapIcon, PlaneTakeoff, PlaneLanding } from 'lucide-react';
import type { AeropuertoTelemetria, VueloTelemetria } from '@/lib/types'
import { formatearFechaHoraSeparado } from '@/lib/formatearHora';

interface PanelAeropuertosProps {
  aeropuertos: AeropuertoTelemetria[];
  vuelos: VueloTelemetria[];
  onAeropuertoClick?: (id: string, codigo: string) => void;
  onVerEnMapa?: (id: string) => void;
  seguidoId?: string;
}

export function PanelAeropuertos({ aeropuertos, vuelos, onAeropuertoClick, onVerEnMapa, seguidoId }: PanelAeropuertosProps) {
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroContinente, setFiltroContinente] = useState('');
  const [orden, setOrden] = useState('');

  const opcionesContinente = useMemo(() => {
    const set = new Set(aeropuertos.map(n => n.continente || n.zona_horaria).filter(Boolean));
    return Array.from(set).sort().map(v => ({ value: v, label: v }));
  }, [aeropuertos]);

  const opcionesOrden = [
    { value: '', label: 'Sin orden' },
    { value: 'ocupacion-asc', label: 'Ocupación ↑' },
    { value: 'ocupacion-desc', label: 'Ocupación ↓' },
    { value: 'salida-ut', label: 'Salida UT' },
    { value: 'llegada-ut', label: 'Llegada UT' },
  ];

  const timingPorAeropuerto = useMemo(() => {
    const salida = new Map<string, string>();
    const llegada = new Map<string, string>();

    for (const v of vuelos) {
      const actualSalida = salida.get(v.origen_iata);
      if (!actualSalida || v.hora_salida < actualSalida) {
        salida.set(v.origen_iata, v.hora_salida);
      }
      const actualLlegada = llegada.get(v.destino_iata);
      if (!actualLlegada || v.hora_llegada < actualLlegada) {
        llegada.set(v.destino_iata, v.hora_llegada);
      }
    }

    return { salida, llegada };
  }, [vuelos]);

  const aeropuertosFiltrados = useMemo(() => {
    return aeropuertos.filter(n => {
      if (filtroCodigo && !n.codigo_iata.toLowerCase().includes(filtroCodigo.toLowerCase())) return false;
      if (filtroContinente) {
        const valor = n.continente || n.zona_horaria;
        if (valor !== filtroContinente) return false;
      }
      return true;
    });
  }, [aeropuertos, filtroCodigo, filtroContinente]);

  const aeropuertosOrdenados = useMemo(() => {
    const lista = [...aeropuertosFiltrados];
    switch (orden) {
      case 'ocupacion-asc':
        lista.sort((a, b) => a.ocupacion_pct - b.ocupacion_pct);
        break;
      case 'ocupacion-desc':
        lista.sort((a, b) => b.ocupacion_pct - a.ocupacion_pct);
        break;
      case 'salida-ut':
        lista.sort((a, b) => {
          const sa = timingPorAeropuerto.salida.get(a.codigo_iata) || '';
          const sb = timingPorAeropuerto.salida.get(b.codigo_iata) || '';
          return sa.localeCompare(sb);
        });
        break;
      case 'llegada-ut':
        lista.sort((a, b) => {
          const la = timingPorAeropuerto.llegada.get(a.codigo_iata) || '';
          const lb = timingPorAeropuerto.llegada.get(b.codigo_iata) || '';
          return la.localeCompare(lb);
        });
        break;
    }
    return lista;
  }, [aeropuertosFiltrados, orden, timingPorAeropuerto]);

  const hayFiltrosActivos = filtroCodigo || filtroContinente;

  const limpiarFiltros = () => {
    setFiltroCodigo('');
    setFiltroContinente('');
  };

  if (aeropuertos.length === 0) {
    return (
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Aeropuertos</h3>
        <p className="text-xs text-slate-600 italic text-center py-2">Sin datos de aeropuertos</p>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Aeropuertos</h3>
        <span className="text-xs text-slate-600">
          Mostrando {aeropuertosOrdenados.length} de {aeropuertos.length} aeropuertos
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
            placeholder="Continente"
            options={opcionesContinente}
            value={filtroContinente}
            onChange={e => setFiltroContinente(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-3">
        <Select
          placeholder="Ordenar por..."
          options={opcionesOrden}
          value={orden}
          onChange={e => setOrden(e.target.value)}
        />
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
        {aeropuertosOrdenados.map(n => {
          const continenteLabel = n.continente && n.continente !== 'Desconocido' ? n.continente : (n.zona_horaria ? n.zona_horaria.split('/')[0] : '');
          const proxSalida = timingPorAeropuerto.salida.get(n.codigo_iata) || '';
          const proxLlegada = timingPorAeropuerto.llegada.get(n.codigo_iata) || '';
          const fmtSalida = formatearFechaHoraSeparado(proxSalida || null);
          const fmtLlegada = formatearFechaHoraSeparado(proxLlegada || null);
          return (
            <div
              key={n.id}
              className={`py-2 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 ${onAeropuertoClick ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:border-slate-200 dark:hover:border-slate-700 transition-colors' : ''}`}
              onClick={() => onAeropuertoClick?.(n.codigo_iata, n.codigo_iata)}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: n.color }} />
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{n.codigo_iata}</span>
                  {continenteLabel && (
                    <span className="text-xs text-slate-600 truncate hidden sm:inline">{continenteLabel}</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {seguidoId === n.codigo_iata ? (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium whitespace-nowrap">
                      Salir mapa [ESC]
                    </span>
                  ) : (
                    onVerEnMapa && (
                      <button
                        onClick={e => { e.stopPropagation(); onVerEnMapa(n.codigo_iata); }}
                        className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600"
                        title="Ver en mapa"
                      >
                        <MapIcon size={12} />
                      </button>
                    )
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                <div className="flex items-center gap-1 rounded bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/50 px-1.5 py-1">
                  <PlaneTakeoff size={10} className="text-slate-600 dark:text-slate-400 shrink-0" />
                  <div className="flex flex-col leading-tight min-w-0">
                    <span className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">Sale</span>
                    <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {fmtSalida.hora}
                      <span className="text-slate-600 dark:text-slate-400 font-normal"> · {fmtSalida.fecha}</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/50 px-1.5 py-1">
                  <PlaneLanding size={10} className="text-slate-600 dark:text-slate-400 shrink-0" />
                  <div className="flex flex-col leading-tight min-w-0">
                    <span className="text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">Llega</span>
                    <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                      {fmtLlegada.hora}
                      <span className="text-slate-600 dark:text-slate-400 font-normal"> · {fmtLlegada.fecha}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  {n.ocupacion_actual}/{n.capacidad_almacen}
                </span>
                <span className="font-bold" style={{ color: n.color }}>
                  {n.ocupacion_pct.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
        {aeropuertosOrdenados.length === 0 && (
          <p className="text-xs text-slate-600 italic text-center py-2">
            Ningún aeropuerto coincide con los filtros
          </p>
        )}
      </div>
    </div>
  );
}
