'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Briefcase, Check, ChevronDown, ChevronRight, Copy, FileDown, Loader2, MapPin, Route } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  fetchEnviosVueloOperacion,
  fetchEnviosAeropuertoOperacion,
  fetchEnviosVuelo,
  fetchEnviosAeropuerto,
  fetchMaletasEquipaje,
  descargarPlanViajePdf,
  fetchPlanViaje,
} from '@/lib/api';
import type { EnvioItemResponse, Maleta, SegmentoResponse } from '@/lib/types';

export interface SelectedEnvioConsolidado {
  tipo: 'vuelo' | 'nodo';
  id: string;
  codigo: string;
}

interface ModalEnviosProps {
  open: boolean;
  selectedEnvio: SelectedEnvioConsolidado | null;
  onClose: () => void;
  sesionId?: string;
  onSeguirEnMapa?: (vueloId: string) => void;
  onMostrarRuta?: (segmentos: SegmentoResponse[]) => void;
}

interface EnvioExpandido {
  maletas: Maleta[];
  loading: boolean;
  error: string | null;
  maletaCopiada: string | null;
}

export function ModalEnvios({ open, selectedEnvio, onClose, sesionId, onSeguirEnMapa, onMostrarRuta }: ModalEnviosProps) {
  const [data, setData] = useState<EnvioItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Record<string, EnvioExpandido>>({});
  const [siguiendoId, setSiguiendoId] = useState<string | null>(null);
  const [mostrandoRutaId, setMostrandoRutaId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !selectedEnvio) return;
    setLoading(true);
    setError(null);
    setExpandidos({});
    const fetchFn = sesionId
      ? (selectedEnvio.tipo === 'vuelo'
          ? fetchEnviosVuelo(sesionId, selectedEnvio.id)
          : fetchEnviosAeropuerto(sesionId, selectedEnvio.id))
      : (selectedEnvio.tipo === 'vuelo'
          ? fetchEnviosVueloOperacion(selectedEnvio.id)
          : fetchEnviosAeropuertoOperacion(selectedEnvio.id));
    fetchFn
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError(err?.mensaje || err?.message || 'Error al cargar envíos'); setLoading(false); });
  }, [open, selectedEnvio, sesionId]);

  const totalMaletas = useMemo(() => data.reduce((acc, item) => acc + (item.cantidad || 0), 0), [data]);

  const handleToggleExpand = useCallback(async (id: string, codigoEquipaje: string) => {
    setExpandidos(prev => {
      if (prev[id]) return {};
      return { ...prev };
    });
    if (expandidos[id] || loading) {
      setExpandidos(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    setExpandidos(prev => ({ ...prev, [id]: { maletas: [], loading: true, error: null, maletaCopiada: null } }));
    try {
      const lista = await fetchMaletasEquipaje(codigoEquipaje);
      setExpandidos(prev => ({ ...prev, [id]: { maletas: lista, loading: false, error: null, maletaCopiada: null } }));
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      setExpandidos(prev => ({
        ...prev,
        [id]: { maletas: [], loading: false, error: e.mensaje || e.message || 'Error al cargar maletas', maletaCopiada: null },
      }));
    }
  }, [expandidos, loading]);

  const handleCopiarMaleta = useCallback(async (envioId: string, codigo: string) => {
    try {
      await navigator.clipboard.writeText(codigo);
      setExpandidos(prev => ({
        ...prev,
        [envioId]: { ...(prev[envioId] ?? { maletas: [], loading: false, error: null, maletaCopiada: null }), maletaCopiada: codigo },
      }));
      setTimeout(() => {
        setExpandidos(prev => {
          const curr = prev[envioId];
          if (!curr) return prev;
          return { ...prev, [envioId]: { ...curr, maletaCopiada: null } };
        });
      }, 1500);
    } catch {
      // Fallback silencioso sin clipboard API
    }
  }, []);

  const handleCopiarTodas = useCallback(async (envioId: string) => {
    const exp = expandidos[envioId];
    if (!exp || exp.maletas.length === 0) return;
    const all = exp.maletas.map(m => m.codigo_maleta).join('\n');
    try { await navigator.clipboard.writeText(all); } catch { /* ignore */ }
  }, [expandidos]);

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

  const titulo = !selectedEnvio
    ? 'Envíos'
    : selectedEnvio.tipo === 'vuelo'
      ? `Envíos del vuelo ${selectedEnvio.codigo}`
      : `Envíos en aeropuerto ${selectedEnvio.codigo}`;

  return (
    <Modal
      open={open && !!selectedEnvio}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-emerald-600" />
          <span>{titulo}</span>
        </div>
      }
    >
      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-600 py-4">
          <span className="w-3 h-3 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
          Cargando envíos...
        </div>
      )}

      {!loading && error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-3 rounded">
          {error}
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <p className="text-xs text-slate-600 italic text-center py-4">Sin envíos registrados.</p>
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3 text-sm text-slate-600">
            <span>
              {data.length} envío{data.length !== 1 ? 's' : ''} · {totalMaletas} maleta{totalMaletas !== 1 ? 's' : ''} en total.
            </span>
          </div>

          <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1">
            {data.map(item => {
              const exp = expandidos[item.id];
              const expandido = !!exp;
              return (
                <div key={item.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40">
                  <button
                    type="button"
                    onClick={() => handleToggleExpand(item.id, item.codigo_equipaje)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-white/60 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-800/60 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold tracking-wide shrink-0">
                        EQUIPAJE
                      </span>
                      <span className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {item.codigo_equipaje}
                      </span>
                      <span className="text-xs text-slate-500 shrink-0">
                        {item.origen_iata}→{item.destino_iata}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm text-slate-600 whitespace-nowrap">
                        {item.cantidad} maleta{item.cantidad !== 1 ? 's' : ''}
                      </span>
                      {expandido ? (
                        <ChevronDown size={16} className="text-slate-500" />
                      ) : (
                        <ChevronRight size={16} className="text-slate-500" />
                      )}
                    </div>
                  </button>

                  {!expandido && (
                    <div className="flex items-center justify-end gap-1.5 px-3 py-2 border-t border-slate-200 dark:border-slate-700">
                      {onSeguirEnMapa && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSeguir(item.id)}
                          disabled={siguiendoId === item.id}
                          title="Seguir ubicación actual en el mapa"
                        >
                          {siguiendoId === item.id ? <Loader2 size={12} className="mr-1 animate-spin" /> : <MapPin size={12} className="mr-1" />}
                          Seguir
                        </Button>
                      )}
                      {onMostrarRuta && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleMostrarRuta(item.id)}
                          disabled={mostrandoRutaId === item.id}
                          title="Mostrar ruta del envío en el mapa"
                        >
                          {mostrandoRutaId === item.id ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Route size={12} className="mr-1" />}
                          Ruta
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => descargarPlanViajePdf(item.id).catch(() => alert('Error al descargar plan de viaje'))}
                        title="Descargar plan de viaje"
                      >
                        <FileDown size={12} className="mr-1" />
                        PDF
                      </Button>
                    </div>
                  )}

                  {expandido && (
                    <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
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
                          <FileDown size={12} className="mr-1" />
                          PDF
                        </Button>
                      </div>

                      {exp.loading && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 py-2">
                          <span className="w-3 h-3 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
                          Cargando maletas...
                        </div>
                      )}

                      {!exp.loading && exp.error && (
                        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-2 rounded">
                          {exp.error}
                        </div>
                      )}

                      {!exp.loading && !exp.error && exp.maletas.length === 0 && (
                        <p className="text-xs text-slate-600 italic text-center py-2">Este equipaje no tiene maletas registradas.</p>
                      )}

                      {!exp.loading && !exp.error && exp.maletas.length > 0 && (
                        <>
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span>{exp.maletas.length} maleta{exp.maletas.length !== 1 ? 's' : ''} individual{exp.maletas.length !== 1 ? 'es' : ''}.</span>
                            <Button size="sm" variant="secondary" onClick={() => handleCopiarTodas(item.id)} title="Copiar todos los IDs al portapapeles">
                              <Copy size={12} />
                              Copiar todos
                            </Button>
                          </div>
                          <ul className="divide-y divide-slate-200 dark:divide-slate-700 rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                            {exp.maletas.map(m => (
                              <li key={m.id} className="flex items-center justify-between px-3 py-1.5 bg-white/60 dark:bg-slate-900/30">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
                                    {m.codigo_maleta}
                                  </span>
                                  {m.virtual && (
                                    <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium shrink-0">
                                      virtual
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopiarMaleta(item.id, m.codigo_maleta)}
                                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
                                  title="Copiar ID al portapapeles"
                                >
                                  {exp.maletaCopiada === m.codigo_maleta ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Modal>
  );
}
