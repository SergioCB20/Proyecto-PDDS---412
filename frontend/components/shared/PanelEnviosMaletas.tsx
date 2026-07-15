'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, MapPin, Route } from 'lucide-react';
import { fetchEnviosPanel, fetchEnviosPanelSesion, fetchMaletasEquipaje, fetchPlanViaje } from '@/lib/api';
import type { EnvioPanelResponse, Maleta, SegmentoResponse } from '@/lib/types';

type TabType = 'planificados' | 'en_vuelo' | 'entregados';

interface PanelEnviosMaletasProps {
  sesionId?: string;
  activo: boolean;
  nodos: { codigo_iata: string; nombre: string }[];
  onSeguirEnMapa?: (vueloId: string) => void;
  onMostrarRuta?: (segmentos: SegmentoResponse[]) => void;
  onVerAeropuertoEnMapa?: (id: string) => void;
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
      // Stale-while-revalidate: conserva los datos anteriores mientras recarga, para no
      // parpadear "Cargando…" en cada refresco de 5 s. Solo la 1ª carga tiene data === null.
      return { ...state, loading: true, error: '' };
    case 'FETCH_SUCCESS':
      return { data: action.data, loading: false, error: '' };
    case 'FETCH_ERROR':
      // Mantiene los últimos datos válidos si un refresco falla.
      return { ...state, loading: false, error: action.error };
  }
}

const TAB_LABELS: Record<TabType, string> = {
  planificados: 'Planificados',
  en_vuelo: 'En Vuelo',
  entregados: 'Entregados (4h)',
};

export function PanelEnviosMaletas({ sesionId, activo, nodos, onSeguirEnMapa, onMostrarRuta, onVerAeropuertoEnMapa }: PanelEnviosMaletasProps) {
  const [tab, setTab] = useReducer((_: TabType, next: TabType) => next, 'planificados' as TabType);
  const [origen, setOrigen] = useReducer((_: string, next: string) => next, '');
  const [destino, setDestino] = useReducer((_: string, next: string) => next, '');
  const [codigoMaleta, setCodigoMaleta] = useReducer((_: string, next: string) => next, '');
  const [{ data, loading, error }, dispatch] = useReducer(reducer, {
    data: null, loading: true, error: '',
  });
  const [siguiendoId, setSiguiendoId] = useState<string | null>(null);
  const [mostrandoRutaId, setMostrandoRutaId] = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Record<string, { maletas: Maleta[]; loading: boolean }>>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleVerEnMapa = useCallback(async (id: string) => {
    setSiguiendoId(id);
    try {
      const plan = await fetchPlanViaje(id);
      if (plan.ubicacion_actual?.tipo === 'VUELO') {
        onSeguirEnMapa?.(plan.ubicacion_actual.referencia_id);
      } else if (plan.ubicacion_actual?.tipo === 'NODO') {
        onVerAeropuertoEnMapa?.(plan.ubicacion_actual.referencia_id);
      }
    } catch {
      // silent fail
    } finally {
      setSiguiendoId(null);
    }
  }, [onSeguirEnMapa, onVerAeropuertoEnMapa]);

  const handleMostrarRuta = useCallback(async (id: string) => {
    setMostrandoRutaId(id);
    try {
      const plan = await fetchPlanViaje(id);
      if (plan.segmentos && plan.segmentos.length > 0) {
        onMostrarRuta?.(plan.segmentos);
      } else {
        alert('El grupo de maletas no tiene un plan de viaje asignado');
      }
    } catch {
      alert('Error al obtener información de la maleta');
    } finally {
      setMostrandoRutaId(null);
    }
  }, [onMostrarRuta]);

  const handleToggleExpand = useCallback(async (id: string, codigoEquipaje: string) => {
    if (expandidos[id]) {
      setExpandidos(prev => { const next = { ...prev }; delete next[id]; return next; });
      return;
    }
    setExpandidos(prev => ({ ...prev, [id]: { maletas: [], loading: true } }));
    try {
      const lista = await fetchMaletasEquipaje(codigoEquipaje);
      setExpandidos(prev => ({ ...prev, [id]: { maletas: lista, loading: false } }));
    } catch {
      setExpandidos(prev => ({ ...prev, [id]: { maletas: [], loading: false } }));
    }
  }, [expandidos]);

  const limpiar = useCallback(() => {
    setOrigen('');
    setDestino('');
    setCodigoMaleta('');
  }, []);

  const hayFiltrosActivos = !!origen || !!destino || !!codigoMaleta;

  const cargar = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const cm = codigoMaleta || undefined;
      const result = sesionId
        ? await fetchEnviosPanelSesion(sesionId, tab, origen || undefined, destino || undefined, cm)
        : await fetchEnviosPanel(tab, origen || undefined, destino || undefined, cm);
      dispatch({ type: 'FETCH_SUCCESS', data: result });
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      dispatch({ type: 'FETCH_ERROR', error: e.mensaje || e.message || 'Error al cargar envíos' });
    }
  }, [sesionId, tab, origen, destino, codigoMaleta]);

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
              className={`flex-1 text-sm font-medium py-1.5 px-1 rounded-md transition-colors ${
                tab === key
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-1.5">
          <select
            value={origen}
            onChange={e => setOrigen(e.target.value)}
            className="flex-1 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {nodoOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={destino}
            onChange={e => setDestino(e.target.value)}
            className="flex-1 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {nodoOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 mb-2 items-center">
          <input
            type="text"
            value={codigoMaleta}
            onChange={e => setCodigoMaleta(e.target.value)}
            placeholder="Código maleta (MAL-...)"
            className="flex-1 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={limpiar}
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline whitespace-nowrap"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-4">
        {loading && data === null && (
          <p className="text-xs text-slate-600 italic text-center py-2">Cargando envíos...</p>
        )}

        {error && data === null && (
          <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-2 rounded">
            {error}
          </div>
        )}

        {!loading && !error && data && data.length === 0 && (
          <p className="text-xs text-slate-600 italic text-center py-2">Sin envíos</p>
        )}

        {data && data.length > 0 && (
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {data.map((item, i) => {
              const exp = expandidos[item.equipaje_id];
              const expandido = !!exp;
              return (
                <div key={`${item.equipaje_id}-${i}`}>
                  <div className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-800/50 text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleExpand(item.equipaje_id, item.codigo_equipaje)}
                      className="flex items-center gap-2 min-w-0 text-left"
                    >
                      {expandido ? (
                        <ChevronDown size={12} className="shrink-0 text-slate-500" />
                      ) : (
                        <ChevronRight size={12} className="shrink-0 text-slate-500" />
                      )}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {item.origen_iata}&rarr;{item.destino_iata}
                      </span>
                      {item.codigo_vuelo && (
                        <span className="text-slate-600 font-mono">{item.codigo_vuelo}</span>
                      )}
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      {onSeguirEnMapa && (
                        <button
                          onClick={() => handleVerEnMapa(item.equipaje_id)}
                          disabled={siguiendoId === item.equipaje_id}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-50 disabled:cursor-wait"
                          title="Ver en mapa"
                        >
                          {siguiendoId === item.equipaje_id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <MapPin size={14} />
                          )}
                        </button>
                      )}
                      {tab === 'en_vuelo' && onMostrarRuta && (
                        <button
                          onClick={() => handleMostrarRuta(item.equipaje_id)}
                          disabled={mostrandoRutaId === item.equipaje_id}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-wait"
                          title="Mostrar ruta en el mapa"
                        >
                          {mostrandoRutaId === item.equipaje_id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Route size={14} />
                          )}
                        </button>
                      )}
                      <span className="text-slate-600">
                        {item.cantidad} maleta{item.cantidad !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {expandido && (
                    <div className="pl-6 pr-2 pb-1.5">
                      {exp.loading && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 py-1">
                          <Loader2 size={10} className="animate-spin" /> Cargando maletas...
                        </div>
                      )}
                      {!exp.loading && exp.maletas.length === 0 && (
                        <p className="text-xs text-slate-500 italic py-1">Sin maletas registradas</p>
                      )}
                      {!exp.loading && exp.maletas.length > 0 && (
                        <ul className="divide-y divide-slate-200 dark:divide-slate-700 rounded border border-slate-200 dark:border-slate-700 overflow-hidden">
                          {exp.maletas.map(m => (
                            <li key={m.id} className="flex items-center justify-between px-2 py-1 bg-white/60 dark:bg-slate-900/30">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 truncate">{m.codigo_maleta}</span>
                                {m.virtual && (
                                  <span className="text-[9px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium shrink-0">virtual</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {onSeguirEnMapa && (
                                  <button
                                    type="button"
                                    onClick={() => handleVerEnMapa(m.equipaje_id)}
                                    disabled={siguiendoId === m.equipaje_id}
                                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-50 disabled:cursor-wait"
                                    title="Ver en mapa"
                                  >
                                    {siguiendoId === m.equipaje_id ? <Loader2 size={10} className="animate-spin" /> : <MapPin size={10} />}
                                  </button>
                                )}
                                {onMostrarRuta && (
                                  <button
                                    type="button"
                                    onClick={() => handleMostrarRuta(m.equipaje_id)}
                                    disabled={mostrandoRutaId === m.equipaje_id}
                                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-wait"
                                    title="Mostrar ruta en el mapa"
                                  >
                                    {mostrandoRutaId === m.equipaje_id ? <Loader2 size={10} className="animate-spin" /> : <Route size={10} />}
                                  </button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
