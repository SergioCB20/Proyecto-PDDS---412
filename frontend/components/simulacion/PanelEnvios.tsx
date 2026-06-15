'use client';

import { useEffect, useReducer, useRef } from 'react';
import { fetchEnviosVuelo, fetchEnviosNodo } from '@/lib/api';
import type { EnvioItemResponse } from '@/lib/types';

export interface SelectedEnvio {
  tipo: 'vuelo' | 'nodo';
  id: string;
  codigo: string;
}

interface PanelEnviosProps {
  sesionId: string;
  selectedEnvio: SelectedEnvio;
  onClose: () => void;
}

type State = {
  data: EnvioItemResponse[] | null;
  loading: boolean;
  error: string;
};

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; data: EnvioItemResponse[] }
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

export function PanelEnvios({ sesionId, selectedEnvio, onClose }: PanelEnviosProps) {
  const [{ data, loading, error }, dispatch] = useReducer(reducer, {
    data: null,
    loading: true,
    error: '',
  });

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  useEffect(() => {
    dispatch({ type: 'FETCH_START' });

    const fetchFn = selectedEnvio.tipo === 'vuelo'
      ? fetchEnviosVuelo(sesionId, selectedEnvio.id)
      : fetchEnviosNodo(sesionId, selectedEnvio.id);

    fetchFn
      .then(data => dispatch({ type: 'FETCH_SUCCESS', data }))
      .catch(err => dispatch({ type: 'FETCH_ERROR', error: err?.mensaje || 'Error al cargar envíos' }));
  }, [sesionId, selectedEnvio]);

  const titulo = selectedEnvio.tipo === 'vuelo'
    ? `Envíos del vuelo ${selectedEnvio.codigo}`
    : `Envíos en nodo ${selectedEnvio.codigo}`;

  return (
    <div ref={ref} className="p-4 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{titulo}</h3>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          Cerrar
        </button>
      </div>

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
              key={i}
              className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-800/50 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-medium text-slate-700 dark:text-slate-300">{item.codigo_equipaje}</span>
                <span className="text-slate-400">
                  {item.origen_iata}→{item.destino_iata}
                </span>
              </div>
              <span className="text-slate-500 shrink-0">{item.cantidad} maleta{item.cantidad !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
