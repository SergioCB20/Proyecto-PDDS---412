'use client';

import { useEffect, useState, useCallback, startTransition } from 'react';
import { Building2, Clock, LogOut, Upload, CheckCircle, XCircle, FileSpreadsheet, Save, Play, Loader2, Trash2, Filter, Table2 } from 'lucide-react';
import { setNodoCapacidadOperacion, cargarPlanesOperacion, eliminarCargadoOperacion, fetchEstadoPreparacion, fetchPlanesOperacion } from '@/lib/api';
import type { VueloOperacionPlano } from '@/lib/api';
import { tzAbrev, formatLocal } from '@/lib/timezone';

const SEDES_NOMBRE: Record<string, string> = {
  SPIM: 'Lima (Perú)',
  SABE: 'Buenos Aires (Argentina)',
  EKCH: 'Copenhague (Dinamarca)',
  VIDP: 'Delhi (India)',
};

function useReloj() {
  const [hora, setHora] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return hora;
}

export default function SetupOperacion({
  iata,
  onListo,
  onCambiarSede,
}: {
  iata: string;
  onListo: () => void;
  onCambiarSede: () => void;
}) {
  const hora = useReloj();
  const [capacidad, setCapacidad] = useState('999');
  const [planesFile, setPlanesFile] = useState<File | null>(null);
  const [planesLoaded, setPlanesLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [capacidadPorIata, setCapacidadPorIata] = useState<Record<string, number>>({});
  const [vuelos, setVuelos] = useState<VueloOperacionPlano[]>([]);
  const [filtroAeropuerto, setFiltroAeropuerto] = useState('TODOS');

  const AERO_OPS = ['SPIM', 'SABE', 'EKCH', 'VIDP'] as const;
  const CAPS_ORIGINAL: Record<string, number> = { SPIM: 440, SABE: 460, EKCH: 480, VIDP: 480 };

  const refetchCapacidades = useCallback(async () => {
    try {
      const s = await fetchEstadoPreparacion();
      setCapacidadPorIata(s.capacidades);
    } catch { /* ignore */ }
  }, []);

  const refetchPlanes = useCallback(async (filtro: string) => {
    try {
      const ps = await fetchPlanesOperacion(filtro === 'TODOS' ? undefined : filtro);
      setVuelos(ps);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    startTransition(() => { refetchCapacidades(); });
    const id = setInterval(() => startTransition(() => { refetchCapacidades(); }), 15000);
    const vis = () => { if (document.visibilityState === 'visible') startTransition(() => { refetchCapacidades(); }); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [refetchCapacidades]);

  useEffect(() => {
    startTransition(() => { refetchPlanes(filtroAeropuerto); });
  }, [filtroAeropuerto, refetchPlanes]);

  const guardarCapacidad = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await setNodoCapacidadOperacion(iata, parseInt(capacidad) || 999);
      setSuccess('Capacidad guardada');
      await refetchCapacidades();
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || 'Error al guardar capacidad');
    } finally {
      setLoading(false);
    }
  };

  const cargarPlanes = async () => {
    if (!planesFile) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await cargarPlanesOperacion(planesFile);
      setSuccess('Planes cargados');
      setPlanesLoaded(true);
      setPlanesFile(null);
      await refetchPlanes(filtroAeropuerto);
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || 'Error al cargar planes');
    } finally {
      setLoading(false);
    }
  };

  const puedeSiguiente = planesLoaded && !loading;

  const limpiarCargado = async () => {
    if (!confirm('¿Eliminar todos los planes y equipajes cargados (tag_dia_a_dia)? Esta acción es irreversible.')) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await eliminarCargadoOperacion();
      setSuccess(`Eliminados ${res.vuelos_eliminados} vuelos, ${res.equipajes_eliminados} equipajes`);
      setPlanesLoaded(false);
      setVuelos([]);
      await refetchCapacidades();
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || 'Error al limpiar');
    } finally {
      setLoading(false);
    }
  };

  function estadoCap(iata: string): { label: string; cls: string } {
    const c = capacidadPorIata[iata];
    if (c === undefined) return { label: '—', cls: 'text-slate-400' };
    if (c === 999) return { label: 'PRUEBA', cls: 'text-amber-600 font-semibold' };
    if (c === CAPS_ORIGINAL[iata]) return { label: 'OK', cls: 'text-green-600' };
    return { label: 'MOD', cls: 'text-orange-600 font-semibold' };
  }

  function formatHoraIata(iso: string, iataDestino: string): string {
    try {
      const d = new Date(iso);
      return formatLocal(iataDestino, d);
    } catch { return iso; }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 font-mono font-bold rounded">
              {iata}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {SEDES_NOMBRE[iata] || iata}
              </div>
              <div className="text-xs text-slate-500">{tzAbrev(iata)}</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Clock size={11} />
                <span>HORA LOCAL</span>
              </div>
              <div className="text-base font-mono font-bold text-slate-700 dark:text-slate-200">
                {formatLocal(iata, hora)}
              </div>
            </div>

            <button
              onClick={onCambiarSede}
              className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-red-600 px-3 py-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition"
              title="Cambiar de sede"
            >
              <LogOut size={13} />
              Cambiar sede
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm">
            <XCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-sm">
            <CheckCircle size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
            <span className="text-green-700 dark:text-green-300">{success}</span>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={18} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Capacidad de almacén</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Capacidad ({iata})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={capacidad}
                    onChange={e => setCapacidad(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <button
                  onClick={guardarCapacidad}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Guardar
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Se actualiza cada 15 s · {Object.keys(capacidadPorIata).length} aeropuertos
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-1.5 pr-2 font-medium text-slate-500">IATA</th>
                    <th className="text-left py-1.5 pr-2 font-medium text-slate-500">TZ</th>
                    <th className="text-right py-1.5 pr-2 font-medium text-slate-500">Cap.</th>
                    <th className="text-right py-1.5 font-medium text-slate-500">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {AERO_OPS.map(i => {
                    const c = capacidadPorIata[i];
                    const st = estadoCap(i);
                    return (
                      <tr key={i} className={`border-b border-slate-100 dark:border-slate-800 ${i === iata ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                        <td className="py-1.5 pr-2 font-mono font-bold text-slate-800 dark:text-slate-200">{i}</td>
                        <td className="py-1.5 pr-2 text-slate-500">{tzAbrev(i)}</td>
                        <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{c ?? '—'}</td>
                        <td className={`py-1.5 text-right ${st.cls}`}>{st.label}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileSpreadsheet size={18} className="text-green-600" />
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Cargar planes de vuelo</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <input
                  id="planes-file"
                  type="file"
                  accept=".txt,.csv"
                  onChange={e => setPlanesFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <button
                  onClick={cargarPlanes}
                  disabled={loading || !planesFile}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Cargar
                </button>
              </div>
              {planesLoaded && (
                <div className="flex items-center gap-2 mt-2 text-xs text-green-700 dark:text-green-400">
                  <CheckCircle size={12} />
                  Planes cargados
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <div className="flex items-center gap-2 mb-2">
                <Filter size={13} className="text-slate-500" />
                <select
                  value={filtroAeropuerto}
                  onChange={e => setFiltroAeropuerto(e.target.value)}
                  className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  <option value="TODOS">Todos</option>
                  {AERO_OPS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <span className="text-xs text-slate-400">{vuelos.length} vuelos</span>
                {vuelos.length > 0 && (
                  <button
                    onClick={limpiarCargado}
                    disabled={loading}
                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 ml-auto px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                  >
                    <Trash2 size={13} />
                    Eliminar
                  </button>
                )}
              </div>
              {vuelos.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-xs text-slate-400 border border-dashed border-slate-300 dark:border-slate-600 rounded">
                  <Table2 size={14} className="mr-1" />
                  Sin planes cargados
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white dark:bg-slate-900">
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left py-1 pr-2 font-medium text-slate-500">Código</th>
                        <th className="text-left py-1 pr-2 font-medium text-slate-500">Ruta</th>
                        <th className="text-left py-1 pr-2 font-medium text-slate-500">Sale (origen)</th>
                        <th className="text-left py-1 pr-2 font-medium text-slate-500">Llega (destino)</th>
                        <th className="text-right py-1 font-medium text-slate-500">Cap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vuelos.map(v => (
                        <tr key={v.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-1 pr-2 font-mono text-slate-800 dark:text-slate-200">{v.codigo_vuelo}</td>
                          <td className="py-1 pr-2 text-slate-600">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{v.origen_iata}</span>
                            <span className="text-slate-400 mx-0.5">→</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">{v.destino_iata}</span>
                          </td>
                          <td className="py-1 pr-2 text-slate-600 tabular-nums whitespace-nowrap">
                            {formatHoraIata(v.hora_salida, v.origen_iata)}
                          </td>
                          <td className="py-1 pr-2 text-slate-600 tabular-nums whitespace-nowrap">
                            {formatHoraIata(v.hora_llegada, v.destino_iata)}
                          </td>
                          <td className="py-1 text-right font-mono tabular-nums text-slate-600">
                            {v.capacidad_carga}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <button
            onClick={onListo}
            disabled={!puedeSiguiente}
            className="px-8 py-3 rounded-xl bg-blue-600 text-white text-base font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
          >
            Comenzar Operación
            <Play size={18} />
          </button>
        </div>
      </main>
    </div>
  );
}
