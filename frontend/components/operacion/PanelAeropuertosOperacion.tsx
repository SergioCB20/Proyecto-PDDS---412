'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Map as MapIcon } from 'lucide-react';
import type { AeropuertoTelemetria } from '@/lib/types';
import { ciudadDe, paisDe } from '@/lib/aeropuertos';
import { determinarColorSemaforo, type ColorSemaforo } from '@/lib/colors';

interface EstiloEstado {
  bordeIzq: string;
  dotCls: string;
  label: string;
  textCls: string;
}

const ESTILO_POR_ESTADO: Record<ColorSemaforo, EstiloEstado> = {
  VACIO: { bordeIzq: 'border-l-slate-400', dotCls: 'bg-slate-400', label: 'Vacío', textCls: 'text-slate-600 dark:text-slate-400' },
  VERDE: { bordeIzq: 'border-l-green-500', dotCls: 'bg-green-500', label: 'Verde', textCls: 'text-green-700 dark:text-green-400' },
  AMBAR: { bordeIzq: 'border-l-yellow-500', dotCls: 'bg-yellow-500', label: 'Amarillo', textCls: 'text-yellow-700 dark:text-yellow-400' },
  ROJO: { bordeIzq: 'border-l-red-500', dotCls: 'bg-red-500', label: 'Rojo', textCls: 'text-red-700 dark:text-red-400' },
};

interface PanelAeropuertosOperacionProps {
  aeropuertos: AeropuertoTelemetria[];
  onAeropuertoClick?: (id: string, codigo: string) => void;
  onVerEnMapa?: (id: string) => void;
  seguidoId?: string;
  seleccionadoId?: string;
  filtroColor?: string;
  onFilterColorChange?: (color: string) => void;
  umbralesConfig?: { verdeMax: number; ambarMax: number };
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
  const itemRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  useEffect(() => {
    if (seleccionadoId && itemRefs.current[seleccionadoId]) {
      itemRefs.current[seleccionadoId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [seleccionadoId]);
  const [orden, setOrden] = useState('');

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
          Mostrando {aeropuertosOrdenados.length} de {aeropuertos.length}
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

      <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase tracking-wide z-10">
            <tr>
              <th className="text-left px-2 py-2 font-semibold">IATA</th>
              <th className="text-left px-2 py-2 font-semibold">Ciudad</th>
              <th className="text-left px-2 py-2 font-semibold hidden md:table-cell">País · Cont.</th>
              <th className="text-right px-2 py-2 font-semibold">Ocupación</th>
              <th className="text-right px-2 py-2 font-semibold w-12">—</th>
            </tr>
          </thead>
          <tbody>
            {aeropuertosOrdenados.map((n, idx) => {
              const continenteLabel = n.continente && n.continente !== 'Desconocido' ? n.continente : (n.zona_horaria ? n.zona_horaria.split('/')[0] : '');
              const ciudad = ciudadDe(n.codigo_iata);
              const pais = paisDe(n.codigo_iata);
              const ubicacion = [pais, continenteLabel].filter(Boolean).join(' · ');
              const zebra = idx % 2 === 0 ? 'bg-white/40 dark:bg-slate-900/20' : '';
              const seleccionado = seleccionadoId === n.codigo_iata;
              const rowCls = `${zebra} ${seleccionado ? '!bg-blue-50 dark:!bg-blue-900/30 ring-1 ring-blue-300 dark:ring-blue-700' : ''} ${onAeropuertoClick ? 'cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/20' : ''}`;
              const estado = ESTILO_POR_ESTADO[determinarColorSemaforo(n.ocupacion_pct, umbralesConfig) as ColorSemaforo];
              return (
                <tr
                  key={n.id}
                  ref={el => { itemRefs.current[n.codigo_iata] = el; }}
                  className={`${rowCls} border-t border-slate-100 dark:border-slate-800 border-l-4 ${estado.bordeIzq}`}
                  onClick={() => onAeropuertoClick?.(n.codigo_iata, n.codigo_iata)}
                >
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-3 h-3 rounded-full shrink-0 shadow-sm ${estado.dotCls}`} />
                      <div className="flex flex-col leading-tight min-w-0">
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{n.codigo_iata}</span>
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${estado.textCls}`}>{estado.label}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={ciudad}>
                    {ciudad && ciudad !== n.codigo_iata ? ciudad : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-slate-600 dark:text-slate-400 truncate hidden md:table-cell max-w-[200px]" title={ubicacion}>
                    {ubicacion || '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">
                    <span className="text-slate-600 dark:text-slate-400">{n.ocupacion_actual}/{n.capacidad_almacen}</span>
                    <span className={`ml-2 font-bold ${estado.textCls}`}>{n.ocupacion_pct.toFixed(0)}%</span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {seguidoId === n.codigo_iata ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">ESC</span>
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
                  </td>
                </tr>
              );
            })}
            {aeropuertosOrdenados.length === 0 && (
              <tr>
                <td colSpan={5} className="text-xs text-slate-600 italic text-center py-4">
                  Ningún aeropuerto coincide con los filtros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
