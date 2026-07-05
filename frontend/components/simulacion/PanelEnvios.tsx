'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { FileDown, Loader2, MapPin } from 'lucide-react';
import { fetchEnviosVuelo, fetchEnviosAeropuerto, descargarPlanViajePdf, fetchPlanViaje } from '@/lib/api';
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
  onSeguirEnMapa?: (vueloId: string) => void;
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

export function PanelEnvios({ sesionId, selectedEnvio, onClose, onSeguirEnMapa }: PanelEnviosProps) {
  const [{ data, loading, error }, dispatch] = useReducer(reducer, {
    data: null,
    loading: true,
    error: '',
  });

  const [siguiendoId, setSiguiendoId] = useState<string | null>(null);

  const ref = useRef<HTMLDivElement>(null);

  const handleSeguir = useCallback(async (id: string) => {
    setSiguiendoId(id);
    try {
      const plan = await fetchPlanViaje(id);
      if (plan.ubicacion_actual?.tipo === 'VUELO') {
        onSeguirEnMapa?.(plan.ubicacion_actual.referencia_id);
      } else {
        alert('La maleta no está en un vuelo actualmente');
      }
    } catch {
      alert('Error al obtener información de la maleta');
    } finally {
      setSiguiendoId(null);
    }
  }, [onSeguirEnMapa]);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  useEffect(() => {
    dispatch({ type: 'FETCH_START' });

    const fetchFn = selectedEnvio.tipo === 'vuelo'
      ? fetchEnviosVuelo(sesionId, selectedEnvio.id)
      : fetchEnviosAeropuerto(sesionId, selectedEnvio.id);

    fetchFn
      .then(data => dispatch({ type: 'FETCH_SUCCESS', data }))
      .catch(err => dispatch({ type: 'FETCH_ERROR', error: err?.mensaje || 'Error al cargar envíos' }));
  }, [sesionId, selectedEnvio]);

  const titulo = selectedEnvio.tipo === 'vuelo'
    ? `Envíos del vuelo ${selectedEnvio.codigo}`
    : `Envíos en aeropuerto ${selectedEnvio.codigo}`;

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
              <div className="flex items-center gap-2 shrink-0">
                {onSeguirEnMapa && (
                  <button
                    onClick={() => handleSeguir(item.id)}
                    disabled={siguiendoId === item.id}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-50 disabled:cursor-wait"
                    title="Seguir en mapa"
                  >
                    {siguiendoId === item.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <MapPin size={14} />
                    )}
                  </button>
                )}
                <button
                  onClick={() => descargarPlanViajePdf(item.id).catch(() => alert('Error al descargar plan de viaje'))}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  title="Descargar plan de viaje"
                >
                  <FileDown size={14} />
                </button>
                <span className="text-slate-500">{item.cantidad} maleta{item.cantidad !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
