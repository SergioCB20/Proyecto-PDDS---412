'use client';

import { useEffect, useState, useMemo } from 'react';
import { Package, RefreshCw, ChevronDown, ChevronUp, CheckCircle, XCircle, Plane, Upload, FileSpreadsheet, AlertTriangle, AlertCircle, Menu, ChevronLeft, Play, Pause, Square, Clock, Settings, Activity } from 'lucide-react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { nodoToEnMapa } from '@/lib/mock';
import { useTelemetria } from '@/lib/useTelemetria';
import { colorNodoPorOcupacion } from '@/lib/colors';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { PanelVuelosOperacion } from '@/components/operacion/PanelVuelosOperacion';
import { PanelNodosOperacion } from '@/components/operacion/PanelNodosOperacion';
import { PanelEntregadosOperacion } from '@/components/operacion/PanelEntregadosOperacion';
import { PanelEnviosOperacion } from '@/components/operacion/PanelEnviosOperacion';
import { MetricasOperacion } from '@/components/operacion/MetricasOperacion';
import { ResumenVuelosOperacion } from '@/components/operacion/ResumenVuelosOperacion';
import { PanelVuelos } from '@/components/simulacion/PanelVuelos';
import { PanelNodos } from '@/components/simulacion/PanelNodos';
import { PanelEntregados } from '@/components/simulacion/PanelEntregados';
import { PanelEnvios } from '@/components/simulacion/PanelEnvios';
import type { SelectedEnvioOperacion } from '@/components/operacion/PanelEnviosOperacion';
import type { SelectedEnvio } from '@/components/simulacion/PanelEnvios';
import type { Nodo, Vuelo, VueloEnMapa, VueloPageResponse, NodoEnMapa, CrearEquipajeResponse, CargaMasivaPreview, CargaMasivaConfirmResponse, MetricasSimulacion } from '@/lib/types';

const GeoMapa = dynamic(() => import('@/components/mapa/GeoMapa'), { ssr: false });

function formatSegundos(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${sec}s`;
}

const ESTADOS_VUELO_VALIDOS = ['PROGRAMADO', 'EN_RUTA', 'CANCELADO', 'COMPLETADO'] as const;

function matchEstadoVuelo(valor: string): VueloEnMapa['estado'] {
  if (ESTADOS_VUELO_VALIDOS.includes(valor as typeof ESTADOS_VUELO_VALIDOS[number])) {
    return valor as VueloEnMapa['estado'];
  }
  return 'PROGRAMADO';
}

type DashboardMode = 'operacion' | 'simulacion';

interface SesionListaItem {
  id: string;
  tipo: string;
  tipo_simulacion: string;
  estado: string;
  fecha_inicio_virtual: string;
  created_at: string;
}

interface SesionResponse { id: string }

function MetricaCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{value}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [mode, setMode] = useState<DashboardMode>('operacion');

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-1 px-4 pt-2 pb-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setMode('operacion')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              mode === 'operacion'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Plane size={14} className="inline mr-1.5" />
            Operación
          </button>
          <button
            onClick={() => setMode('simulacion')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              mode === 'simulacion'
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Settings size={14} className="inline mr-1.5" />
            Simulación
          </button>
          <div className="flex-1" />
        </div>
        <div className="flex-1 relative">
          {mode === 'operacion' ? <OperacionView /> : <SimulacionView />}
        </div>
      </div>
    </div>
  );
}

function OperacionView() {
  const [nodos, setNodos] = useState<NodoEnMapa[]>([]);
  const [allVuelos, setAllVuelos] = useState<VueloEnMapa[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({ destinoIata: '', cantidad: 1 });
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState<CrearEquipajeResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [cargaMasivaOpen, setCargaMasivaOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CargaMasivaPreview | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvConfirmLoading, setCsvConfirmLoading] = useState(false);

  const { data: telemetria, connected: wsConnected } = useTelemetria(true);
  const k = useMemo(() => telemetria?.metricas_sesion?.k ?? 120, [telemetria]);
  const animacionActiva = wsConnected && (telemetria?.vuelos?.some(v => v.estado === 'EN_RUTA') ?? false);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedEnvio, setSelectedEnvio] = useState<SelectedEnvioOperacion | null>(null);
  const [vueloFilterOrigen, setVueloFilterOrigen] = useState('');
  const [vueloFilterDestino, setVueloFilterDestino] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const baseDate = '2026-01-15';
      const ahora = new Date();
      const wStart = `${baseDate}T${ahora.toISOString().slice(11, 19)}Z`;
      const wEnd = new Date(new Date(wStart).getTime() + 4 * 3600000).toISOString();
      const [nodosData, vuelosData] = await Promise.all([
        api.get<Nodo[]>('/nodos'),
        api.get<VueloPageResponse>(`/vuelos?size=300&fecha_desde=${encodeURIComponent(wStart)}&fecha_hasta=${encodeURIComponent(wEnd)}`),
      ]);
      setNodos(nodosData.map(nodoToEnMapa));
      setAllVuelos(vuelosData.content.map((v: Vuelo): VueloEnMapa => ({ ...v })));
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setApiError(error.mensaje || error.message || 'Error de conexion');
    } finally { setLoading(false); }
  };

  useEffect(() => { const timer = setTimeout(fetchData, 0); return () => clearTimeout(timer); }, []);

  useEffect(() => {
    if (!telemetria?.nodos || telemetria.nodos.length === 0) return;
    const telemetriaNodos: NodoEnMapa[] = telemetria.nodos.map(n => ({
      id: n.id, codigo_iata: n.codigo_iata, nombre: n.codigo_iata,
      latitud: n.lat, longitud: n.lon, capacidad_almacen: n.capacidad_almacen,
      ocupacion_actual: n.ocupacion_actual, zona_horaria: '',
      color: colorNodoPorOcupacion(n.ocupacion_pct), ocupacionPorcentaje: n.ocupacion_pct,
    }));
    queueMicrotask(() => {
      setNodos(telemetriaNodos);
    });
    if (telemetria.vuelos && telemetria.vuelos.length > 0) {
      const vuelosMapped = telemetria.vuelos.map(v => ({
        id: v.id, codigo_vuelo: v.codigo_vuelo, estado: matchEstadoVuelo(v.estado),
        origen: { id: '', codigo_iata: v.origen_iata, nombre: v.origen_iata },
        destino: { id: '', codigo_iata: v.destino_iata, nombre: v.destino_iata },
        origen_lat: v.origen_lat, origen_lon: v.origen_lon,
        destino_lat: v.destino_lat, destino_lon: v.destino_lon,
        hora_salida: v.hora_salida || '', hora_llegada: v.hora_llegada || '',
        capacidad_carga: v.capacidad_carga, carga_disponible: v.carga_disponible,
        es_plantilla: false, fecha_operacion: '',
        posicionActual: { lat: v.lat_actual, lon: v.lon_actual },
      }));
      queueMicrotask(() => { setAllVuelos(vuelosMapped); });
    }
  }, [telemetria]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormLoading(true);
    try {
      const response = await api.post<CrearEquipajeResponse>('/equipajes', {
        destino_iata: formData.destinoIata, cantidad: formData.cantidad,
      });
      setFormSuccess(response);
      setFormData({ destinoIata: '', cantidad: 1 });
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setFormError(error.mensaje || error.message || 'Error al registrar equipaje');
    } finally { setFormLoading(false); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file); setCsvError(null); setCsvLoading(true);
    try {
      const formData = new FormData(); formData.append('archivo', file);
      const preview = await api.upload<CargaMasivaPreview>('/equipajes/carga-masiva', formData);
      setCsvPreview(preview);
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setCsvError(error.mensaje || error.message || 'Error al procesar archivo');
      setCsvPreview(null);
    } finally { setCsvLoading(false); }
  };

  const handleConfirmarCargaMasiva = async () => {
    if (!csvPreview) return;
    setCsvConfirmLoading(true); setCsvError(null);
    try {
      await api.post<CargaMasivaConfirmResponse>('/equipajes/carga-masiva/confirmar', {});
      setCargaMasivaOpen(false); setCsvFile(null); setCsvPreview(null);
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setCsvError(error.mensaje || error.message || 'Error al confirmar carga');
      setCsvConfirmLoading(false);
    }
  };

  const vuelosMapaFiltrados = useMemo(() => {
    const ahora = new Date();
    const nowMin = ahora.getUTCHours() * 60 + ahora.getUTCMinutes();
    const endMin = nowMin + 240;
    return allVuelos.filter(v => {
      if (v.estado !== 'PROGRAMADO' && v.estado !== 'EN_RUTA') return false;
      if (vueloFilterOrigen && v.origen.codigo_iata !== vueloFilterOrigen) return false;
      if (vueloFilterDestino && v.destino.codigo_iata !== vueloFilterDestino) return false;
      if (v.estado === 'EN_RUTA') return true;
      if (!v.hora_salida) return false;
      const hs = new Date(v.hora_salida);
      const hsMin = hs.getUTCHours() * 60 + hs.getUTCMinutes();
      return hsMin >= nowMin && hsMin < endMin;
    });
  }, [allVuelos, vueloFilterOrigen, vueloFilterDestino]);

  const destinoOptions = nodos.filter(n => n.codigo_iata).map(n => ({ value: n.codigo_iata, label: n.codigo_iata })).sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="flex h-full">
      <div className="flex-1 p-4 relative">
        <GeoMapa nodos={nodos} vuelos={vuelosMapaFiltrados} mostrarAviones={true} animacionActiva={animacionActiva} k={k} className="h-full" />
      </div>

      <div className={`border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-80'}`}>
        <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          {!isCollapsed && <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">Operación</h2>}
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {isCollapsed ? (
          <div className="flex flex-col items-center gap-3 py-4 px-1">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">Operación en Vivo</h2>
                <button onClick={fetchData} disabled={loading} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-50">
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-slate-500">WS {wsConnected ? 'conectado' : 'desconectado'}</span>
              </div>
              {apiError && (
                <div className="flex items-center gap-2 p-2 mt-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                  <XCircle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                  <span className="text-xs text-red-700 dark:text-red-300">{apiError}</span>
                </div>
              )}
            </div>

            <MetricasOperacion />
            <ResumenVuelosOperacion vuelos={telemetria?.vuelos ?? []} />

            {telemetria?.nodos && telemetria.nodos.length > 0 && (
              <PanelNodosOperacion nodos={telemetria.nodos} vuelos={telemetria.vuelos ?? []} onNodoClick={(id, codigo) => setSelectedEnvio({ tipo: 'nodo', id, codigo })} />
            )}

            {telemetria?.vuelos && telemetria.vuelos.length > 0 && (
              <PanelVuelosOperacion
                vuelos={telemetria.vuelos} onVueloClick={(id, codigo) => setSelectedEnvio({ tipo: 'vuelo', id, codigo })}
                onDownloadManifiesto={async (id, codigo) => {
                  try {
                    const blob = await api.downloadBlob(`/manifiestos/${id}`);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url;
                    a.download = `manifiesto_${codigo}_${new Date().toISOString().split('T')[0]}.pdf`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch { alert('Error al descargar manifiesto'); }
                }}
                origenFilter={vueloFilterOrigen} destinoFilter={vueloFilterDestino}
                onFilterChange={({ origen, destino }) => { setVueloFilterOrigen(origen); setVueloFilterDestino(destino); }}
              />
            )}

            <PanelEntregadosOperacion activo={true} />

            {selectedEnvio && <PanelEnviosOperacion selectedEnvio={selectedEnvio} onClose={() => setSelectedEnvio(null)} />}

            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex gap-2 mb-3">
                <button onClick={() => setFormOpen(!formOpen)} className="flex-1 flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-sm text-blue-900 dark:text-blue-100">Individual</span>
                  </div>
                  {formOpen ? <ChevronUp size={16} className="text-blue-600 dark:text-blue-400" /> : <ChevronDown size={16} className="text-blue-600 dark:text-blue-400" />}
                </button>
                <button onClick={() => setCargaMasivaOpen(true)} className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors">
                  <FileSpreadsheet size={16} className="text-green-600 dark:text-green-400" />
                  <span className="font-medium text-sm text-green-900 dark:text-green-100">Carga Masiva</span>
                </button>
              </div>

              {formOpen && (
                <form onSubmit={handleSubmit} className="space-y-3 mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <Select label="Destino IATA" placeholder={nodos.length === 0 ? 'No hay destinos' : 'Seleccionar destino'} options={destinoOptions} value={formData.destinoIata} onChange={e => setFormData(prev => ({ ...prev, destinoIata: e.target.value }))} disabled={nodos.length === 0} />
                  <Input label="Número de Maletas" type="number" min="1" value={formData.cantidad} onChange={e => setFormData(prev => ({ ...prev, cantidad: Math.max(1, parseInt(e.target.value) || 1) }))} />
                  {formError && <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800"><XCircle size={14} className="text-red-600 dark:text-red-400" /><span className="text-xs text-red-700 dark:text-red-300">{formError}</span></div>}
                  <Button type="submit" disabled={formLoading} className="w-full">{formLoading ? 'Registrando...' : 'Registrar'}</Button>
                </form>
              )}

              {formSuccess && (
                <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2"><CheckCircle size={16} className="text-green-600 dark:text-green-400" /><span className="font-medium text-sm text-green-900 dark:text-green-100">Equipaje registrado</span></div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Código:</span><span className="font-medium text-slate-900 dark:text-slate-100">{formSuccess.id_externo || formSuccess.id.slice(0, 8)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Estado:</span><Badge variant="green">{formSuccess.estado}</Badge></div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Modal open={cargaMasivaOpen} onClose={() => { setCargaMasivaOpen(false); setCsvFile(null); setCsvPreview(null); setCsvError(null); }} title="Carga Masiva de Equipaje"
        footer={<div className="flex gap-2"><Button variant="secondary" onClick={() => { setCargaMasivaOpen(false); setCsvFile(null); setCsvPreview(null); setCsvError(null); }}>Cancelar</Button><Button onClick={handleConfirmarCargaMasiva} disabled={!csvPreview || csvPreview.validos === 0 || csvConfirmLoading}>{csvConfirmLoading ? 'Confirmando...' : `Confirmar (${csvPreview?.validos || 0})`}</Button></div>}
      >
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" id="csv-upload" />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">{csvFile ? csvFile.name : 'Subir archivo CSV'}</p>
            </label>
          </div>
          {csvLoading && <div className="text-center text-sm text-slate-500">Procesando...</div>}
          {csvError && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800"><AlertTriangle size={16} /><span className="text-sm text-red-700 dark:text-red-300">{csvError}</span></div>}
          {csvPreview && (
            <div className="space-y-3">
              <div className="flex gap-4 text-sm">
                <span className="text-slate-600 dark:text-slate-400">Total: {csvPreview.total}</span>
                <span className="text-green-700 dark:text-green-400">Válidos: {csvPreview.validos}</span>
                <span className="text-yellow-700 dark:text-yellow-400">Revisión: {csvPreview.con_revision}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function SimulacionView() {
  const [sesionId, setSesionId] = useState<string | null>(null);
  const [estadoSesion, setEstadoSesion] = useState<'CONFIGURADA' | 'EN_CURSO' | 'PAUSADA' | 'FINALIZADA'>('CONFIGURADA');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sesionesActivas, setSesionesActivas] = useState<SesionListaItem[]>([]);
  const [finalizandoId, setFinalizandoId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [config, setConfig] = useState({
    fecha_inicio_virtual: '2025-06-01',
    hora_inicio_virtual: '08:00',
    prob_cancelacion: 15,
    umbral_almacen_verde: 70,
    umbral_almacen_ambar: 90,
    umbral_vuelo_verde: 75,
    umbral_vuelo_ambar: 90,
  });

  const { data: telemetria, connected: wsConnected } = useTelemetria(estadoSesion === 'EN_CURSO');
  const [initialNodos, setInitialNodos] = useState<NodoEnMapa[]>([]);
  const [initialVuelos, setInitialVuelos] = useState<VueloEnMapa[]>([]);
  const [selectedEnvio, setSelectedEnvio] = useState<SelectedEnvio | null>(null);
  const [vueloFilterOrigen, setVueloFilterOrigen] = useState('');
  const [vueloFilterDestino, setVueloFilterDestino] = useState('');

  const [metricasPoll, setMetricasPoll] = useState<MetricasSimulacion>({
    sesion_id: '', estado: 'CONFIGURADA', dia_hora_virtual: '',
    segundos_reales_transcurridos: 0, sla_acumulado_pct: 100,
    vuelos_cancelados: 0, maletas_replanificadas: 0,
  });

  const metricas = telemetria?.metricas_sesion ?? metricasPoll;

  useEffect(() => {
    api.get<SesionListaItem[]>('/sesiones?estado=EN_CURSO').then(enCurso =>
      api.get<SesionListaItem[]>('/sesiones?estado=PAUSADA').then(pausadas => {
        setSesionesActivas([...enCurso, ...pausadas]);
      })
    ).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sesionId || estadoSesion === 'FINALIZADA') return;
    const interval = setInterval(() => {
      api.get<MetricasSimulacion>(`/sesiones/${sesionId}/metricas`).then(m => {
        setMetricasPoll(m);
      }).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [sesionId, estadoSesion]);

  useEffect(() => {
    if (!sesionId) return;
    api.get<Nodo[]>('/nodos').then(nodosData => {
      setInitialNodos(nodosData.map(n => {
        const pct = n.capacidad_almacen > 0 ? (n.ocupacion_actual / n.capacidad_almacen) * 100 : 0;
        return { ...n, color: colorNodoPorOcupacion(pct, { verdeMax: config.umbral_almacen_verde, ambarMax: config.umbral_almacen_ambar }), ocupacionPorcentaje: pct };
      }));
    }).catch(() => {});
    api.get<VueloPageResponse>('/vuelos?size=50').then(vuelosData => {
      setInitialVuelos(vuelosData.content.map((v: Vuelo): VueloEnMapa => ({ ...v })));
    }).catch(() => {});
  }, [sesionId, config.umbral_almacen_verde, config.umbral_almacen_ambar]);

  const sesionEnCurso = sesionesActivas.find(s => s.estado === 'EN_CURSO');
  const sesionPausada = sesionesActivas.find(s => s.estado === 'PAUSADA');

  const nodosMapa: NodoEnMapa[] = (telemetria?.nodos ?? []).length > 0
    ? (telemetria?.nodos ?? []).map(n => ({
        id: n.id, codigo_iata: n.codigo_iata, nombre: n.codigo_iata,
        latitud: n.lat, longitud: n.lon, capacidad_almacen: n.capacidad_almacen,
        ocupacion_actual: n.ocupacion_actual, zona_horaria: '',
        color: colorNodoPorOcupacion(n.ocupacion_pct, { verdeMax: config.umbral_almacen_verde, ambarMax: config.umbral_almacen_ambar }),
        ocupacionPorcentaje: n.ocupacion_pct,
      }))
    : initialNodos;

  const vuelosMapa: VueloEnMapa[] = (telemetria?.vuelos ?? []).length > 0
    ? telemetria!.vuelos.map(v => ({
        id: v.id, codigo_vuelo: v.codigo_vuelo, estado: matchEstadoVuelo(v.estado),
        origen: { id: '', codigo_iata: v.origen_iata, nombre: v.origen_iata },
        destino: { id: '', codigo_iata: v.destino_iata, nombre: v.destino_iata },
        origen_lat: v.origen_lat, origen_lon: v.origen_lon, destino_lat: v.destino_lat, destino_lon: v.destino_lon,
        hora_salida: v.hora_salida ?? '', hora_llegada: v.hora_llegada ?? '',
        capacidad_carga: v.capacidad_carga, carga_disponible: v.carga_disponible,
        es_plantilla: false, fecha_operacion: '',
        posicionActual: { lat: v.lat_actual, lon: v.lon_actual },
      }))
    : initialVuelos;

  const handleIniciar = async () => {
    setError(''); setLoading(true);
    try {
      const activas = await api.get<SesionListaItem[]>('/sesiones?estado=EN_CURSO');
      for (const s of activas) {
        try { await api.post(`/sesiones/${s.id}/detener`, {}); } catch { /* ignore */ }
      }
      const pausadas = await api.get<SesionListaItem[]>('/sesiones?estado=PAUSADA');
      for (const s of pausadas) {
        try { await api.post(`/sesiones/${s.id}/detener`, {}); } catch { /* ignore */ }
      }
      const res = await api.post<SesionResponse>('/sesiones', {
        tipo: 'SIMULADA',
        fecha_inicio_virtual: config.fecha_inicio_virtual,
        hora_inicio_virtual: config.hora_inicio_virtual + ':00',
        prob_cancelacion: config.prob_cancelacion / 100,
        umbrales_almacen: { verde_min: 0, verde_max: config.umbral_almacen_verde, ambar_min: config.umbral_almacen_verde, ambar_max: config.umbral_almacen_ambar, rojo_min: config.umbral_almacen_ambar, rojo_max: 100 },
        umbrales_vuelo: { verde_min: 0, verde_max: config.umbral_vuelo_verde, ambar_min: config.umbral_vuelo_verde, ambar_max: config.umbral_vuelo_ambar, rojo_min: config.umbral_vuelo_ambar, rojo_max: 100 },
      });
      await api.post(`/sesiones/${res.id}/iniciar`, {});
      setSesionId(res.id);
      setEstadoSesion('EN_CURSO');
      setSesionesActivas([]);
      setMetricasPoll(prev => ({ ...prev, sesion_id: res.id }));
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || 'Error al crear sesion');
    } finally { setLoading(false); }
  };

  const handlePausar = async () => {
    if (!sesionId) return;
    setLoading(true);
    try {
      await api.post(`/sesiones/${sesionId}/pausar`, {});
      setEstadoSesion('PAUSADA');
    } catch { setError('Error al pausar'); }
    finally { setLoading(false); }
  };

  const handleReanudar = async () => {
    if (!sesionId) return;
    setLoading(true);
    try {
      await api.post(`/sesiones/${sesionId}/iniciar`, {});
      setEstadoSesion('EN_CURSO');
    } catch { setError('Error al reanudar'); }
    finally { setLoading(false); }
  };

  const handleDetener = async (id: string) => {
    setFinalizandoId(id); setError('');
    try {
      await api.post(`/sesiones/${id}/detener`, {});
      setSesionesActivas(prev => prev.filter(s => s.id !== id));
      if (id === sesionId) { setSesionId(null); setEstadoSesion('FINALIZADA'); }
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || 'Error al detener');
    } finally { setFinalizandoId(null); }
  };

  const k = useMemo(() => telemetria?.metricas_sesion?.k ?? 120, [telemetria]);
  const animacionActiva = wsConnected && (vuelosMapa.some(v => v.estado === 'EN_RUTA') ?? false);

  return (
    <div className="flex h-full">
      <div className="flex-1 p-4 relative">
        <GeoMapa nodos={nodosMapa} vuelos={vuelosMapa} mostrarAviones={true} animacionActiva={animacionActiva} k={k} className="h-full" />
      </div>

      <div className={`border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-80'}`}>
        <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          {!isCollapsed && <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">Simulación</h2>}
          <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {isCollapsed ? (
          <div className="flex flex-col items-center gap-3 py-4 px-1">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        ) : (
          <>
            {sesionEnCurso && (
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Activa: {sesionEnCurso.fecha_inicio_virtual}</p>
                <div className="flex gap-2 mt-2">
                  <Button variant="danger" size="sm" disabled={finalizandoId === sesionEnCurso.id} onClick={() => handleDetener(sesionEnCurso.id)}>
                    <Square size={14} className="mr-1" />{finalizandoId === sesionEnCurso.id ? '...' : 'Detener'}
                  </Button>
                  <Button size="sm" onClick={() => { setSesionId(sesionEnCurso.id); setEstadoSesion('EN_CURSO'); }}>
                    <Play size={14} className="mr-1" />Reanudar
                  </Button>
                </div>
              </div>
            )}

            {sesionPausada && !sesionEnCurso && (
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-yellow-50 dark:bg-yellow-900/20">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Pausada: {sesionPausada.fecha_inicio_virtual}</p>
                <div className="flex gap-2 mt-2">
                  <Button variant="danger" size="sm" disabled={finalizandoId === sesionPausada.id} onClick={() => handleDetener(sesionPausada.id)}>
                    <Square size={14} className="mr-1" />{finalizandoId === sesionPausada.id ? '...' : 'Detener'}
                  </Button>
                  <Button size="sm" onClick={async () => { setSesionId(sesionPausada.id); setLoading(true); try { await api.post(`/sesiones/${sesionPausada.id}/iniciar`, {}); setEstadoSesion('EN_CURSO'); } catch { setError('Error al reanudar'); } finally { setLoading(false); } }}>
                    <Play size={14} className="mr-1" />Continuar
                  </Button>
                </div>
              </div>
            )}

            {(estadoSesion === 'EN_CURSO' || estadoSesion === 'PAUSADA') && (
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Sesión {sesionId?.slice(0, 8)}</h3>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <MetricaCard label="SLA" value={`${(metricas.sla_acumulado_pct ?? 0).toFixed(1)}%`} icon={Activity} color="bg-blue-600" />
                  <MetricaCard label="Cancelaciones" value={metricas.vuelos_cancelados} icon={XCircle} color="bg-red-600" />
                  <MetricaCard label="Replanificadas" value={metricas.maletas_replanificadas} icon={RefreshCw} color="bg-amber-600" />
                  <MetricaCard label="Tiempo Virtual" value={metricas.dia_hora_virtual?.slice(0, 16).replace('T', ' ') || '-'} icon={Clock} color="bg-slate-600" />
                </div>
                <div className="space-y-1 mb-3 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Inicio Real:</span>
                    <span className="font-mono">{metricas.fecha_inicio_real?.slice(0, 19).replace('T', ' ') || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inicio Virtual:</span>
                    <span className="font-mono">{config.fecha_inicio_virtual} {config.hora_inicio_virtual}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transcurrido Real:</span>
                    <span className="font-mono">{formatSegundos(metricas.segundos_reales_transcurridos ?? 0)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {estadoSesion === 'EN_CURSO' ? (
                    <Button variant="secondary" size="sm" onClick={handlePausar} disabled={loading} className="flex-1">
                      <Pause size={14} className="mr-1" />Pausar
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleReanudar} disabled={loading} className="flex-1">
                      <Play size={14} className="mr-1" />Reanudar
                    </Button>
                  )}
                  <Button variant="danger" size="sm" onClick={() => sesionId && handleDetener(sesionId)} disabled={finalizandoId === sesionId} className="flex-1">
                    <Square size={14} className="mr-1" />Detener
                  </Button>
                </div>
              </div>
            )}

            {(!sesionId || estadoSesion === 'FINALIZADA') && (
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-4">
                <Card title="Fecha y Hora">
                  <div className="space-y-3">
                    <Input label="Fecha virtual" type="date" value={config.fecha_inicio_virtual} onChange={e => setConfig({ ...config, fecha_inicio_virtual: e.target.value })} />
                    <Input label="Hora virtual" type="time" value={config.hora_inicio_virtual} onChange={e => setConfig({ ...config, hora_inicio_virtual: e.target.value })} />
                  </div>
                </Card>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Prob. Cancelación {config.prob_cancelacion}%</label>
                  <input type="range" min={0} max={100} step={5} value={config.prob_cancelacion} onChange={e => setConfig({ ...config, prob_cancelacion: Number(e.target.value) })} className="w-full accent-blue-600" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Almacén Verde Max</label>
                    <input type="number" min={0} max={100} value={config.umbral_almacen_verde} onChange={e => setConfig({ ...config, umbral_almacen_verde: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Almacén Ámbar Max</label>
                    <input type="number" min={0} max={100} value={config.umbral_almacen_ambar} onChange={e => setConfig({ ...config, umbral_almacen_ambar: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Vuelo Verde Max</label>
                    <input type="number" min={0} max={100} value={config.umbral_vuelo_verde} onChange={e => setConfig({ ...config, umbral_vuelo_verde: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Vuelo Ámbar Max</label>
                    <input type="number" min={0} max={100} value={config.umbral_vuelo_ambar} onChange={e => setConfig({ ...config, umbral_vuelo_ambar: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm" />
                  </div>
                </div>
                {error && <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400"><AlertCircle size={16} />{error}</div>}
                <Button size="lg" onClick={handleIniciar} disabled={loading} className="w-full">
                  <Play size={18} className="mr-2" />{loading ? 'Creando...' : 'Iniciar Simulación'}
                </Button>
              </div>
            )}

            {sesionId && estadoSesion !== 'FINALIZADA' && (
              <>
                {((telemetria?.nodos && telemetria.nodos.length > 0) || initialNodos.length > 0) && (
                  <PanelNodos nodos={telemetria?.nodos && telemetria.nodos.length > 0 ? telemetria.nodos : initialNodos.map(n => ({ id: n.id, codigo_iata: n.codigo_iata, lat: n.latitud, lon: n.longitud, capacidad_almacen: n.capacidad_almacen, ocupacion_actual: n.ocupacion_actual, ocupacion_pct: n.ocupacionPorcentaje ?? 0, color: n.color ?? 'verde', continente: '', zona_horaria: n.zona_horaria ?? '' }))} vuelos={telemetria?.vuelos ?? []}
                    onNodoClick={(id, codigo) => setSelectedEnvio({ tipo: 'nodo', id, codigo })}
                  />
                )}
                {((telemetria?.vuelos && telemetria.vuelos.length > 0) || initialVuelos.length > 0) && (
                  <PanelVuelos vuelos={telemetria?.vuelos && telemetria.vuelos.length > 0 ? telemetria.vuelos : initialVuelos.map(v => ({ id: v.id, codigo_vuelo: v.codigo_vuelo, estado: v.estado, lat_actual: v.posicionActual?.lat ?? v.origen_lat, lon_actual: v.posicionActual?.lon ?? v.origen_lon, origen_lat: v.origen_lat, origen_lon: v.origen_lon, destino_lat: v.destino_lat, destino_lon: v.destino_lon, origen_iata: v.origen?.codigo_iata ?? '', destino_iata: v.destino?.codigo_iata ?? '', capacidad_carga: v.capacidad_carga, carga_disponible: v.carga_disponible, ocupacion_pct: 0, color: 'verde', hora_salida: v.hora_salida ?? '', hora_llegada: v.hora_llegada ?? '', progreso: 0 }))}
                    onVueloClick={(id, codigo) => setSelectedEnvio({ tipo: 'vuelo', id, codigo })}
                    origenFilter={vueloFilterOrigen} destinoFilter={vueloFilterDestino}
                    onFilterChange={({ origen, destino }) => { setVueloFilterOrigen(origen); setVueloFilterDestino(destino); }}
                  />
                )}
                <PanelEntregados sesionId={sesionId} activo={true} />
                {selectedEnvio && sesionId && (
                  <PanelEnvios selectedEnvio={selectedEnvio} sesionId={sesionId} onClose={() => setSelectedEnvio(null)} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
