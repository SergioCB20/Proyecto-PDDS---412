'use client';

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { AeropuertoTelemetria, VueloTelemetria } from '@/lib/types';

interface PanelAeropuertosOperacionProps {
  aeropuertos: AeropuertoTelemetria[];
  vuelos: VueloTelemetria[];
  onAeropuertoClick?: (id: string, codigo: string) => void;
}

export function PanelAeropuertosOperacion({ aeropuertos, vuelos, onAeropuertoClick }: PanelAeropuertosOperacionProps) {
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
        <p className="text-xs text-slate-400 italic text-center py-2">Sin datos de aeropuertos</p>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Aeropuertos</h3>
        <span className="text-xs text-slate-400">
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
          return (
            <div
              key={n.id}
              className={`flex items-center justify-between py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-800/50 ${onAeropuertoClick ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50' : ''}`}
              onClick={() => onAeropuertoClick?.(n.codigo_iata, n.codigo_iata)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: n.color }} />
                <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{n.codigo_iata}</span>
                {continenteLabel && (
                  <span className="text-[10px] text-slate-400 truncate hidden sm:inline">{continenteLabel}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500">
                  {n.ocupacion_actual}/{n.capacidad_almacen}
                </span>
                <span className="text-xs font-semibold" style={{ color: n.color }}>
                  {n.ocupacion_pct.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
        {aeropuertosOrdenados.length === 0 && (
          <p className="text-xs text-slate-400 italic text-center py-2">
            Ningún aeropuerto coincide con los filtros
          </p>
        )}
      </div>
    </div>
  );
}
