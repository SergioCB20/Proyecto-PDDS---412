'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { fetchEnviosPanel, fetchEnviosPanelSesion } from '@/lib/api';
import type { EnvioPanelResponse } from '@/lib/types';

type TabType = 'planificados' | 'en_vuelo' | 'entregados';

interface PanelEnviosMaletasProps {
  sesionId?: string;
  activo: boolean;
  nodos: { codigo_iata: string; nombre: string }[];
}

type State = {
  data: EnvioPanelResponse[] | null;
  loading: boolean;
  error: string;
};

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; data: EnvioPanelResponse[] }
  | { type: 'FETCH_ERROR'; error: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_START':
      return { data: null, loading: true, error: '' };
    case 'FETCH_SUCCESS':
      return { data: action.data, loading: false, error: '' };
    case 'FETCH_ERROR':
      return { data: null, loading: false, error: action.error };
  }
}

const TAB_LABELS: Record<TabType, string> = {
  planificados: 'Planificados',
  en_vuelo: 'En Vuelo',
  entregados: 'Entregados (4h)',
};

export function PanelEnviosMaletas({ sesionId, activo, nodos }: PanelEnviosMaletasProps) {
  const [tab, setTab] = useReducer((_: TabType, next: TabType) => next, 'planificados' as TabType);
  const [origen, setOrigen] = useReducer((_: string, next: string) => next, '');
  const [destino, setDestino] = useReducer((_: string, next: string) => next, '');
  const [{ data, loading, error }, dispatch] = useReducer(reducer, {
    data: null, loading: true, error: '',
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const cargar = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const result = sesionId
        ? await fetchEnviosPanelSesion(sesionId, tab, origen || undefined, destino || undefined)
        : await fetchEnviosPanel(tab, origen || undefined, destino || undefined);
      dispatch({ type: 'FETCH_SUCCESS', data: result });
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      dispatch({ type: 'FETCH_ERROR', error: e.mensaje || e.message || 'Error al cargar envíos' });
    }
  }, [sesionId, tab, origen, destino]);

  useEffect(() => {
    cargar();
    if (activo) {
      intervalRef.current = setInterval(cargar, 5000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [cargar, activo]);

  const allOption = { value: '', label: 'Todos' };
  const nodoOptions = [
    allOption,
    ...nodos
      .filter(n => n.codigo_iata)
      .map(n => ({ value: n.codigo_iata, label: `${n.codigo_iata} — ${n.nombre}` }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];

  return (
    <div className="border-t border-slate-200 dark:border-slate-700">
      <div className="p-4 pb-0">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Envíos de Maletas</h3>

        <div className="flex gap-1 mb-3">
          {(Object.entries(TAB_LABELS) as [TabType, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 text-[11px] font-medium py-1.5 px-1 rounded-md transition-colors ${
                tab === key
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-2">
          <select
            value={origen}
            onChange={e => setOrigen(e.target.value)}
            className="flex-1 text-[11px] rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {nodoOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={destino}
            onChange={e => setDestino(e.target.value)}
            className="flex-1 text-[11px] rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {nodoOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="px-4 pb-4">
        {loading && (
          <p className="text-xs text-slate-400 italic text-center py-2">Cargando envíos...</p>
        )}

        {error && (
          <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-2 rounded">
            {error}
          </div>
        )}

        {!loading && !error && data && data.length === 0 && (
          <p className="text-xs text-slate-400 italic text-center py-2">Sin envíos</p>
        )}

        {!loading && !error && data && data.length > 0 && (
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {data.map((item, i) => (
              <div
                key={`${item.equipaje_id}-${i}`}
                className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-800/50 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {item.origen_iata}&rarr;{item.destino_iata}
                  </span>
                  {item.codigo_vuelo && (
                    <span className="text-slate-400 font-mono">{item.codigo_vuelo}</span>
                  )}
                </div>
                <span className="text-slate-500 shrink-0">
                  {item.cantidad} maleta{item.cantidad !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
