'use client';

import { useCallback, useEffect, useReducer, useState } from 'react';
import { Briefcase, ChevronDown, ChevronRight, Loader2, MapPin, Route, Plane, Warehouse, CheckCircle, RefreshCw, AlertTriangle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { fetchEnviosNodoConClasificacion, fetchPlanViaje, descargarPlanViajePdf } from '@/lib/api';
import type { EnvioNodoDetalle, Maleta, NodoEnviosResponse, SegmentoResponse } from '@/lib/types';

const ICONO_ESTADO_EQUIPAJE: Record<string, React.ReactNode> = {
  REGISTRADO: <FileText size={11} />,
  ENRUTADO: <Route size={11} />,
  EN_REPLANIFICACION: <RefreshCw size={11} />,
  EN_VUELO: <Plane size={11} />,
  EN_ALMACEN: <Warehouse size={11} />,
  ENTREGADO: <CheckCircle size={11} />,
  INCUMPLIMIENTO_SLA: <AlertTriangle size={11} />,
};

interface DetalleEnviosAeropuertoProps {
  iata: string;
  sesionId?: string;
  onSeguirEnMapa?: (vueloId: string) => void;
  onMostrarRuta?: (segmentos: SegmentoResponse[]) => void;
}

type FetchState = {
  data: NodoEnviosResponse | null;
  loading: boolean;
  error: string | null;
};

type FetchAction =
  | { type: 'START' }
  | { type: 'SUCCESS'; data: NodoEnviosResponse }
  | { type: 'ERROR'; error: string };

function fetchReducer(state: FetchState, action: FetchAction): FetchState {
  switch (action.type) {
    case 'START':
      return { data: null, loading: true, error: null };
    case 'SUCCESS':
      return { data: action.data, loading: false, error: null };
    case 'ERROR':
      return { data: null, loading: false, error: action.error };
  }
}

export function DetalleEnviosAeropuerto({ iata, sesionId, onSeguirEnMapa, onMostrarRuta }: DetalleEnviosAeropuertoProps) {
  const [{ data, loading, error }, dispatch] = useReducer(fetchReducer, {
    data: null, loading: true, error: null,
  });
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const [siguiendoId, setSiguiendoId] = useState<string | null>(null);
  const [mostrandoRutaId, setMostrandoRutaId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'START' });

    fetchEnviosNodoConClasificacion(iata, sesionId)
      .then(d => { if (!cancelled) dispatch({ type: 'SUCCESS', data: d }); })
      .catch(err => {
        if (!cancelled) {
          const e = err as { mensaje?: string; message?: string };
          dispatch({ type: 'ERROR', error: e?.mensaje || e?.message || 'Error al cargar envíos' });
        }
      });

    return () => { cancelled = true; };
  }, [iata]);

  const toggleExpandido = useCallback((id: string) => {
    setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

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

  const renderEnvio = useCallback((item: EnvioNodoDetalle) => {
    const expandido = expandidos[item.id] ?? false;
    return (
      <div key={item.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/40">
        <button
          type="button"
          onClick={() => toggleExpandido(item.id)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold tracking-wide shrink-0">
              {item.codigo_equipaje.length > 12 ? 'EQUIPAJE' : item.codigo_equipaje}
            </span>
            <span className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200 truncate">
              {item.codigo_equipaje}
            </span>
            <span className="text-xs text-slate-500 shrink-0">
              {item.origen_iata}&rarr;{item.destino_iata}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {item.codigo_vuelo && (
              <span className="text-xs font-mono text-slate-500">{item.codigo_vuelo}</span>
            )}
            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium"
              style={{
                backgroundColor: item.estado === 'EN_VUELO' ? '#dbeafe' : item.estado === 'EN_ALMACEN' ? '#d1fae5' : item.estado === 'ENRUTADO' ? '#fef3c7' : '#f3e8ff',
                color: item.estado === 'EN_VUELO' ? '#1d4ed8' : item.estado === 'EN_ALMACEN' ? '#047857' : item.estado === 'ENRUTADO' ? '#b45309' : '#6b21a8',
              }}
            >
              {ICONO_ESTADO_EQUIPAJE[item.estado] ?? null}
              {item.estado}
            </span>
            <span className="text-sm text-slate-600 whitespace-nowrap">
              {item.cantidad} maleta{item.cantidad !== 1 ? 's' : ''}
            </span>
            {expandido ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
          </div>
        </button>

        {!expandido && (
          <div className="flex items-center justify-end gap-1.5 px-3 py-1.5 border-t border-slate-100 dark:border-slate-700">
            {onSeguirEnMapa && (
              <Button size="sm" variant="secondary" onClick={() => handleSeguir(item.id)} disabled={siguiendoId === item.id}>
                {siguiendoId === item.id ? <Loader2 size={12} className="mr-1 animate-spin" /> : <MapPin size={12} className="mr-1" />}
                Seguir
              </Button>
            )}
            {onMostrarRuta && (
              <Button size="sm" variant="secondary" onClick={() => handleMostrarRuta(item.id)} disabled={mostrandoRutaId === item.id}>
                {mostrandoRutaId === item.id ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Route size={12} className="mr-1" />}
                Ruta
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => descargarPlanViajePdf(item.id).catch(() => alert('Error al descargar plan de viaje'))}>
              PDF
            </Button>
          </div>
        )}

        {expandido && (
          <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-end gap-1.5">
              {onSeguirEnMapa && (
                <Button size="sm" variant="secondary" onClick={() => handleSeguir(item.id)} disabled={siguiendoId === item.id}>
                  {siguiendoId === item.id ? <Loader2 size={12} className="mr-1 animate-spin" /> : <MapPin size={12} className="mr-1" />}
                  Seguir
                </Button>
              )}
              {onMostrarRuta && (
                <Button size="sm" variant="secondary" onClick={() => handleMostrarRuta(item.id)} disabled={mostrandoRutaId === item.id}>
                  {mostrandoRutaId === item.id ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Route size={12} className="mr-1" />}
                  Ruta
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => descargarPlanViajePdf(item.id).catch(() => alert('Error al descargar plan de viaje'))}>
                PDF
              </Button>
            </div>

            {item.maletas.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-1">Sin maletas registradas</p>
            )}

            {item.maletas.length > 0 && (
              <ul className="divide-y divide-slate-200 dark:divide-slate-700 rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                {item.maletas.map((m: Maleta) => (
                  <li key={m.id} className="flex items-center justify-between px-3 py-1.5 bg-white/60 dark:bg-slate-900/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">{m.codigo_maleta}</span>
                      {m.virtual && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium shrink-0">virtual</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {onSeguirEnMapa && (
                        <button
                          type="button"
                          onClick={() => handleSeguir(m.equipaje_id)}
                          disabled={siguiendoId === m.equipaje_id}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-50 disabled:cursor-wait"
                          title="Seguir en mapa"
                        >
                          {siguiendoId === m.equipaje_id ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
                        </button>
                      )}
                      {onMostrarRuta && (
                        <button
                          type="button"
                          onClick={() => handleMostrarRuta(m.equipaje_id)}
                          disabled={mostrandoRutaId === m.equipaje_id}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-wait"
                          title="Mostrar ruta en el mapa"
                        >
                          {mostrandoRutaId === m.equipaje_id ? <Loader2 size={12} className="animate-spin" /> : <Route size={12} />}
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
  }, [expandidos, toggleExpandido, onSeguirEnMapa, onMostrarRuta, siguiendoId, mostrandoRutaId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-4 mb-2">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="w-3 h-3 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
          Cargando envíos...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 mb-2">
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!data || (data.saliendo.length === 0 && data.llegando.length === 0)) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-4 mb-2">
        <p className="text-xs text-slate-500 italic text-center">Sin envíos registrados en este aeropuerto</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-3 mb-2">
      <div className="flex items-center gap-2 mb-3">
        <Briefcase size={16} className="text-emerald-600" />
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Aeropuerto {iata} — Detalle de Envíos
        </span>
      </div>

      {data.saliendo.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            Saliendo ({data.conteo.saliendo_envios} envíos · {data.conteo.saliendo_maletas} maletas)
          </h4>
          <div className="space-y-1.5">
            {data.saliendo.map(renderEnvio)}
          </div>
        </div>
      )}

      {data.llegando.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Llegando ({data.conteo.llegando_envios} envíos · {data.conteo.llegando_maletas} maletas)
          </h4>
          <div className="space-y-1.5">
            {data.llegando.map(renderEnvio)}
          </div>
        </div>
      )}
    </div>
  );
}
