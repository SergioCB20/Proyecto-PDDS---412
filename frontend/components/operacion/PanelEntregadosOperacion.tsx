'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { fetchEntregadosRecientesOperacion } from '@/lib/api';
import type { EnvioEntregadoResponse } from '@/lib/types';

interface PanelEntregadosOperacionProps {
  activo: boolean;
}

type State = {
  data: EnvioEntregadoResponse[] | null;
  loading: boolean;
  error: string;
};

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; data: EnvioEntregadoResponse[] }
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

export function PanelEntregadosOperacion({ activo }: PanelEntregadosOperacionProps) {
  const [{ data, loading, error }, dispatch] = useReducer(reducer, {
    data: null,
    loading: true,
    error: '',
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const cargar = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    const desde = typeof window !== 'undefined' ? localStorage.getItem('sesion_operacion_inicio') : null;
    try {
      const result = await fetchEntregadosRecientesOperacion(4, desde ?? undefined);
      dispatch({ type: 'FETCH_SUCCESS', data: result });
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      dispatch({ type: 'FETCH_ERROR', error: e.mensaje || e.message || 'Error al cargar entregados' });
    }
  }, []);

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

  return (
    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Últimos entregados (4h)
        </h3>
        {activo && (
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Actualizando..." />
        )}
      </div>

      {loading && !data && (
        <p className="text-xs text-slate-400 italic text-center py-2">Cargando entregados...</p>
      )}

      {error && (
        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-2 rounded">
          {error}
        </div>
      )}

      {!loading && !error && data && data.length === 0 && (
        <p className="text-xs text-slate-400 italic text-center py-2">Sin entregas recientes</p>
      )}

      {!loading && !error && data && data.length > 0 && (
        <div className="space-y-1 max-h-56 overflow-y-auto">
          {data.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-800/50 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-medium text-slate-700 dark:text-slate-300">{item.codigo_vuelo}</span>
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
