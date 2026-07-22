'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Map as MapIcon, ChevronDown, ChevronUp } from 'lucide-react';
import type { AeropuertoTelemetria, VueloTelemetria } from '@/lib/types'
import { formatearFechaHoraSeparado } from '@/lib/formatearHora';
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

interface PanelAeropuertosProps {
  aeropuertos: AeropuertoTelemetria[];
  vuelos: VueloTelemetria[];
  onAeropuertoClick?: (id: string, codigo: string) => void;
  onVerEnMapa?: (id: string) => void;
  seguidoId?: string;
}

export function PanelAeropuertos({ aeropuertos, vuelos, onAeropuertoClick, onVerEnMapa, seguidoId }: PanelAeropuertosProps) {
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(true);
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [filtroColorLocal, setFiltroColorLocal] = useState<'' | ColorSemaforo>('');
  const [filtroContinente, setFiltroContinente] = useState('');
  const [orden, setOrden] = useState('');
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    if (seguidoId && itemRefs.current[seguidoId]) {
      itemRefs.current[seguidoId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [seguidoId]);

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
      if (filtroColorLocal && determinarColorSemaforo(n.ocupacion_pct) !== filtroColorLocal) return false;
      return true;
    });
  }, [aeropuertos, filtroCodigo, filtroContinente, filtroColorLocal]);

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

  const hayFiltrosActivos = filtroCodigo || filtroContinente || filtroColorLocal;

  const limpiarFiltros = () => {
    setFiltroCodigo('');
    setFiltroContinente('');
    setFiltroColorLocal('');
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
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Aeropuertos</h3>
          <button onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"
            title={filtrosAbiertos ? 'Ocultar filtros' : 'Mostrar filtros'}
          >
            {filtrosAbiertos ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
        <span className="text-xs text-slate-600">
          Mostrando {aeropuertosOrdenados.length} de {aeropuertos.length}
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
            placeholder="Continente"
            options={opcionesContinente}
            value={filtroContinente}
            onChange={e => setFiltroContinente(e.target.value)}
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
      </>
      )}

      <div className="max-h-[28rem] overflow-y-auto flex flex-col gap-1.5 pr-0.5">
        {aeropuertosOrdenados.map((n) => {
          const continenteLabel = n.continente && n.continente !== 'Desconocido' ? n.continente : (n.zona_horaria ? n.zona_horaria.split('/')[0] : '');
          const proxSalida = timingPorAeropuerto.salida.get(n.codigo_iata) || '';
          const proxLlegada = timingPorAeropuerto.llegada.get(n.codigo_iata) || '';
          const fmtSalida = formatearFechaHoraSeparado(proxSalida || null);
          const fmtLlegada = formatearFechaHoraSeparado(proxLlegada || null);
          const seleccionado = seguidoId === n.codigo_iata;
          const estado = ESTILO_POR_ESTADO[determinarColorSemaforo(n.ocupacion_pct) as ColorSemaforo];
          return (
            <div
              key={n.id}
              ref={el => { itemRefs.current[n.codigo_iata] = el; }}
              onClick={() => onAeropuertoClick?.(n.codigo_iata, n.codigo_iata)}
              className={`rounded-lg border border-l-4 ${estado.bordeIzq} px-2.5 py-1.5 transition-colors ${onAeropuertoClick ? 'cursor-pointer' : ''} ${
                seleccionado
                  ? 'border-amber-300 dark:border-amber-700 bg-amber-50/70 dark:bg-amber-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              {/* Línea 1: estado (punto) + IATA + continente + ocupación + acción */}
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${estado.dotCls}`} title={estado.label} />
                <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 shrink-0">{n.codigo_iata}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate min-w-0" title={continenteLabel}>
                  {continenteLabel || '—'}
                </span>
                <div className="flex-1" />
                <span className={`text-xs font-bold tabular-nums shrink-0 ${estado.textCls}`}>{n.ocupacion_pct.toFixed(0)}%</span>
                {seguidoId === n.codigo_iata ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium shrink-0">ESC</span>
                ) : onVerEnMapa && (
                  <button
                    onClick={e => { e.stopPropagation(); onVerEnMapa(n.codigo_iata); }}
                    className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 shrink-0"
                    title="Ver en mapa"
                  >
                    <MapIcon size={12} />
                  </button>
                )}
              </div>
              {/* Línea 2: barra ocupación + próxima UT */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px]">
                <div className="flex items-center gap-1.5 flex-1 min-w-[110px]" title={`Ocupación ${n.ocupacion_actual}/${n.capacidad_almacen}`}>
                  <div className="flex-1 h-1.5 min-w-[24px] bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${estado.dotCls}`} style={{ width: `${Math.min(n.ocupacion_pct, 100)}%` }} />
                  </div>
                  <span className="text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap">{n.ocupacion_actual}/{n.capacidad_almacen}</span>
                </div>
                <span className="font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap" title="Próxima UT en salir (↑) / llegar (↓)">
                  UT <span className="text-slate-400">↑</span>{fmtSalida.hora || '—'} <span className="text-slate-400">↓</span>{fmtLlegada.hora || '—'}
                </span>
              </div>
            </div>
          );
        })}
        {aeropuertosOrdenados.length === 0 && (
          <p className="text-xs text-slate-600 italic text-center py-4">
            Ningún aeropuerto coincide con los filtros
          </p>
        )}
      </div>
    </div>
  );
}
