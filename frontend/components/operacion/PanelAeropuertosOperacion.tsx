'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Map as MapIcon } from 'lucide-react';
import type { AeropuertoTelemetria } from '@/lib/types';
import { ciudadDe, paisDe } from '@/lib/aeropuertos';
import { determinarColorSemaforo } from '@/lib/colors';

interface PanelAeropuertosOperacionProps {
  aeropuertos: AeropuertoTelemetria[];
  onAeropuertoClick?: (id: string, codigo: string) => void;
  onVerEnMapa?: (id: string) => void;
  seguidoId?: string;
  seleccionadoId?: string;
  filtroColor?: string;
  onFilterColorChange?: (color: string) => void;
  umbralesConfig?: { verdeMax: number; ambarMax: number };
  /** Filtro por continente controlado por el padre (también mueve el mapa). */
  filtroContinente?: string;
  onFiltroContinenteChange?: (continente: string) => void;
}

export function PanelAeropuertosOperacion({
  aeropuertos,
  onAeropuertoClick,
  onVerEnMapa,
  seguidoId,
  seleccionadoId,
  filtroColor,
  onFilterColorChange,
  umbralesConfig,
  filtroContinente,
  onFiltroContinenteChange,
}: PanelAeropuertosOperacionProps) {
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    if (seleccionadoId && itemRefs.current[seleccionadoId]) {
      itemRefs.current[seleccionadoId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [seleccionadoId]);
  const [orden, setOrden] = useState('');

  // Default al state interno si el padre no controla el filtro. Asi el componente
  // sigue utilisable en aislamiento, pero las vistas del dashboard siempre pasan props.
  const [filtroContinenteInterno, setFiltroContinenteInterno] = useState('');
  const continenteActual = filtroContinente ?? filtroContinenteInterno;
  const onContinenteChange = (v: string) => {
    if (onFiltroContinenteChange) {
      onFiltroContinenteChange(v);
    } else {
      setFiltroContinenteInterno(v);
    }
  };

  const opcionesContinente = useMemo(() => {
    const set = new Set(aeropuertos.map(n => n.continente || n.zona_horaria).filter(Boolean));
    return Array.from(set).sort().map(v => ({ value: v, label: v }));
  }, [aeropuertos]);

  const opcionesOrden = [
    { value: '', label: 'Sin orden' },
    { value: 'ocupacion-asc', label: 'Ocupación ↑' },
    { value: 'ocupacion-desc', label: 'Ocupación ↓' },
  ];

  const aeropuertosFiltrados = useMemo(() => {
    return aeropuertos.filter(n => {
      if (filtroCodigo) {
        const q = filtroCodigo.toLowerCase();
        const coincide = n.codigo_iata.toLowerCase().includes(q)
          || ciudadDe(n.codigo_iata).toLowerCase().includes(q)
          || paisDe(n.codigo_iata).toLowerCase().includes(q);
        if (!coincide) return false;
      }
      if (continenteActual) {
        const valor = n.continente || n.zona_horaria;
        if (valor !== continenteActual) return false;
      }
      if (filtroColor) {
        if (determinarColorSemaforo(n.ocupacion_pct, umbralesConfig) !== filtroColor) return false;
      }
      return true;
    });
  }, [aeropuertos, filtroCodigo, continenteActual, filtroColor, umbralesConfig]);

  const aeropuertosOrdenados = useMemo(() => {
    const lista = [...aeropuertosFiltrados];
    switch (orden) {
      case 'ocupacion-asc':
        lista.sort((a, b) => a.ocupacion_pct - b.ocupacion_pct);
        break;
      case 'ocupacion-desc':
        lista.sort((a, b) => b.ocupacion_pct - a.ocupacion_pct);
        break;
    }
    return lista;
  }, [aeropuertosFiltrados, orden]);

  const hayFiltrosActivos = filtroCodigo || continenteActual || filtroColor;

  const limpiarFiltros = () => {
    setFiltroCodigo('');
    onContinenteChange('');
    if (filtroColor) onFilterColorChange?.('');
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
            placeholder="Código, ciudad o país..."
            value={filtroCodigo}
            onChange={e => setFiltroCodigo(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[100px]">
          <Select
            placeholder="Continente"
            options={opcionesContinente}
            value={continenteActual}
            onChange={e => onContinenteChange(e.target.value)}
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
          const ciudad = ciudadDe(n.codigo_iata);
          const pais = paisDe(n.codigo_iata);
          const ubicacion = [pais, continenteLabel].filter(Boolean).join(' · ');
          return (
            <div
              key={n.id}
              ref={el => { itemRefs.current[n.codigo_iata] = el; }}
              className={`py-2 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border ${
                seleccionadoId === n.codigo_iata
                  ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                  : 'border-slate-100 dark:border-slate-800/60'
              } ${onAeropuertoClick ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:border-slate-200 dark:hover:border-slate-700 transition-colors' : ''}`}
              onClick={() => onAeropuertoClick?.(n.codigo_iata, n.codigo_iata)}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: n.color }} />
                  <div className="flex flex-col min-w-0 leading-tight">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {ciudad && ciudad !== n.codigo_iata && (
                        <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{ciudad}</span>
                      )}
                      <span className="text-xs font-mono text-slate-600 shrink-0">{n.codigo_iata}</span>
                    </div>
                    {ubicacion && (
                      <span className="text-xs text-slate-600 truncate">{ubicacion}</span>
                    )}
                  </div>
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
