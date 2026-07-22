'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Map as MapIcon, ChevronDown, ChevronUp } from 'lucide-react';
import type { AeropuertoTelemetria, SegmentoResponse, VueloTelemetria } from '@/lib/types';
import { ciudadDe } from '@/lib/aeropuertos';
import { determinarColorSemaforo, type ColorSemaforo } from '@/lib/colors';
import { formatearFechaHoraSeparado } from '@/lib/formatearHora';
import { DetalleEnviosAeropuerto } from '@/components/operacion/DetalleEnviosAeropuerto';

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
  /** Vuelos usados para calcular la próxima UT en salir/llegar de cada almacén. */
  vuelos?: VueloTelemetria[];
  onAeropuertoClick?: (id: string, codigo: string) => void;
  onVerEnMapa?: (id: string) => void;
  seguidoId?: string;
  seleccionadoId?: string;
  umbralesConfig?: { verdeMax: number; ambarMax: number };
  filtroContinente?: string;
  onFiltroContinenteChange?: (continente: string) => void;
  /** Filtro por semáforo controlado desde la vista, para reflejarlo en el mapa. */
  filtroColor?: '' | ColorSemaforo;
  onFiltroColorChange?: (color: '' | ColorSemaforo) => void;
  onSeguirEnMapa?: (vueloId: string) => void;
  onMostrarRuta?: (segmentos: SegmentoResponse[]) => void;
  onVerEnvios?: (iata: string) => void;
  sesionId?: string;
}

export function PanelAeropuertosOperacion({
  aeropuertos,
  vuelos = [],
  onAeropuertoClick,
  onVerEnMapa,
  seguidoId,
  seleccionadoId,
  umbralesConfig,
  filtroContinente,
  onFiltroContinenteChange,
  filtroColor,
  onFiltroColorChange,
  onSeguirEnMapa,
  onMostrarRuta,
  onVerEnvios,
  sesionId,
}: PanelAeropuertosOperacionProps) {
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(true);
  const [filtroCodigo, setFiltroCodigo] = useState('');
  const [aeropuertoSeleccionado, setAeropuertoSeleccionado] = useState<string | null>(null);
  // Controlado si la vista pasa filtroColor (para reflejarlo en el mapa); si no,
  // mantiene el filtro local al panel.
  const [filtroColorInterno, setFiltroColorInterno] = useState<'' | ColorSemaforo>('');
  const filtroColorLocal = filtroColor ?? filtroColorInterno;
  const setFiltroColorLocal = (v: '' | ColorSemaforo) => {
    if (onFiltroColorChange) onFiltroColorChange(v);
    else setFiltroColorInterno(v);
  };
  const seleccionadoActual = aeropuertoSeleccionado ?? seleccionadoId;
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
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
    { value: 'prox-salida', label: 'Próxima salida' },
    { value: 'prox-llegada', label: 'Próxima llegada' },
  ];

  /**
   * Por cada almacén, la hora de la UT más próxima en SALIR (vuelos aún no
   * despegados que parten de él) y en LLEGAR (vuelos en ruta o programados con
   * destino a él). Las horas vienen en ISO, así que se comparan lexicográficamente.
   */
  const proximos = useMemo(() => {
    const salida = new Map<string, string>();
    const llegada = new Map<string, string>();
    for (const v of vuelos) {
      if (v.hora_salida && v.estado === 'PROGRAMADO') {
        const actual = salida.get(v.origen_iata);
        if (!actual || v.hora_salida < actual) salida.set(v.origen_iata, v.hora_salida);
      }
      if (v.hora_llegada && (v.estado === 'EN_RUTA' || v.estado === 'PROGRAMADO')) {
        const actual = llegada.get(v.destino_iata);
        if (!actual || v.hora_llegada < actual) llegada.set(v.destino_iata, v.hora_llegada);
      }
    }
    return { salida, llegada };
  }, [vuelos]);

  const enviosCounts = useMemo(() => {
    const saliendo = new Map<string, number>();
    const llegando = new Map<string, number>();
    for (const v of vuelos) {
      saliendo.set(v.origen_iata, (saliendo.get(v.origen_iata) ?? 0) + 1);
      llegando.set(v.destino_iata, (llegando.get(v.destino_iata) ?? 0) + 1);
    }
    return { saliendo, llegando };
  }, [vuelos]);

  /** Ordena por hora ascendente; los almacenes sin vuelo próximo quedan al final. */
  const porHora = (mapa: Map<string, string>) => (a: AeropuertoTelemetria, b: AeropuertoTelemetria) => {
    const ta = mapa.get(a.codigo_iata);
    const tb = mapa.get(b.codigo_iata);
    if (!ta && !tb) return 0;
    if (!ta) return 1;
    if (!tb) return -1;
    return ta.localeCompare(tb);
  };

  const aeropuertosFiltrados = useMemo(() => {
    return aeropuertos.filter(n => {
      if (filtroCodigo) {
        const q = filtroCodigo.toLowerCase();
        const coincide = n.codigo_iata.toLowerCase().includes(q)
          || ciudadDe(n.codigo_iata).toLowerCase().includes(q);
        if (!coincide) return false;
      }
      if (continenteActual) {
        const valor = n.continente || n.zona_horaria;
        if (valor !== continenteActual) return false;
      }
      if (filtroColorLocal) {
        if (determinarColorSemaforo(n.ocupacion_pct, umbralesConfig) !== filtroColorLocal) return false;
      }
      return true;
    });
  }, [aeropuertos, filtroCodigo, continenteActual, filtroColorLocal, umbralesConfig]);

  const aeropuertosOrdenados = useMemo(() => {
    const lista = [...aeropuertosFiltrados];
    switch (orden) {
      case 'ocupacion-asc':
        lista.sort((a, b) => a.ocupacion_pct - b.ocupacion_pct);
        break;
      case 'ocupacion-desc':
        lista.sort((a, b) => b.ocupacion_pct - a.ocupacion_pct);
        break;
      case 'prox-salida':
        lista.sort(porHora(proximos.salida));
        break;
      case 'prox-llegada':
        lista.sort(porHora(proximos.llegada));
        break;
    }
    return lista;
  }, [aeropuertosFiltrados, orden, proximos]);

  const hayFiltrosActivos = filtroCodigo || continenteActual || filtroColorLocal;

  const limpiarFiltros = () => {
    setFiltroCodigo('');
    onContinenteChange('');
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
          const ciudad = ciudadDe(n.codigo_iata);
          const nombreCiudad = ciudad && ciudad !== n.codigo_iata ? ciudad : '';
          const seleccionado = seleccionadoActual === n.codigo_iata;
          const estado = ESTILO_POR_ESTADO[determinarColorSemaforo(n.ocupacion_pct, umbralesConfig) as ColorSemaforo];
          const s = proximos.salida.get(n.codigo_iata);
          const l = proximos.llegada.get(n.codigo_iata);
          const fs = s ? formatearFechaHoraSeparado(s) : null;
          const fl = l ? formatearFechaHoraSeparado(l) : null;
          return (
            <div
              key={n.id}
              ref={el => { itemRefs.current[n.codigo_iata] = el; }}
              onClick={() => {
                const iata = n.codigo_iata;
                setAeropuertoSeleccionado(prev => prev === iata ? null : iata);
                onAeropuertoClick?.(iata, iata);
              }}
              className={`rounded-lg border border-l-4 ${estado.bordeIzq} px-2.5 py-1.5 transition-colors ${onAeropuertoClick ? 'cursor-pointer' : ''} ${
                seleccionado
                  ? 'border-blue-300 dark:border-blue-700 bg-blue-50/70 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              {/* Línea 1: estado (punto) + IATA + ubicación + ocupación + acciones */}
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${estado.dotCls}`} title={estado.label} />
                <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 shrink-0">{n.codigo_iata}</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate min-w-0" title={nombreCiudad || n.codigo_iata}>
                  {nombreCiudad || '—'}
                </span>
                <div className="flex-1" />
                <span className={`text-xs font-bold tabular-nums shrink-0 ${estado.textCls}`}>{n.ocupacion_pct.toFixed(0)}%</span>
                {onVerEnvios && (
                  <button
                    onClick={e => { e.stopPropagation(); onVerEnvios(n.codigo_iata); }}
                    className="px-2 py-0.5 text-[11px] font-medium rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shrink-0"
                    title="Ver envíos del aeropuerto"
                  >
                    Envíos
                  </button>
                )}
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
              {/* Línea 2: barra ocupación + envíos + próxima UT */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px]">
                <div className="flex items-center gap-1.5 flex-1 min-w-[110px]" title={`Ocupación ${n.ocupacion_actual}/${n.capacidad_almacen}`}>
                  <div className="flex-1 h-1.5 min-w-[24px] bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${estado.dotCls}`} style={{ width: `${Math.min(n.ocupacion_pct, 100)}%` }} />
                  </div>
                  <span className="text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap">{n.ocupacion_actual}/{n.capacidad_almacen}</span>
                </div>
                <span className="whitespace-nowrap tabular-nums" title="Envíos saliendo / llegando">
                  <span className="text-amber-600 dark:text-amber-400">↑{enviosCounts.saliendo.get(n.codigo_iata) ?? 0}</span>{' '}
                  <span className="text-emerald-600 dark:text-emerald-400">↓{enviosCounts.llegando.get(n.codigo_iata) ?? 0}</span>
                </span>
                {(fs || fl) && (
                  <span className="font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap" title="Próxima UT en salir (↑) / llegar (↓)">
                    UT <span className="text-slate-400">↑</span>{fs ? fs.hora : '—'} <span className="text-slate-400">↓</span>{fl ? fl.hora : '—'}
                  </span>
                )}
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

      {seleccionadoActual && (
        <DetalleEnviosAeropuerto
          key={seleccionadoActual}
          iata={seleccionadoActual}
          sesionId={sesionId}
          onSeguirEnMapa={onSeguirEnMapa}
          onMostrarRuta={onMostrarRuta}
        />
      )}
    </div>
  );
}
