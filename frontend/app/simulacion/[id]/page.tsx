'use client';

import { useEffect, useState, Suspense, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { Play, Pause, Square, Clock, AlertTriangle, RefreshCw, Activity, FileText } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { useTelemetria } from '@/lib/useTelemetria';
import type { Nodo, NodoEnMapa, Vuelo, VueloEnMapa, VueloPageResponse, MetricasSimulacion, VueloTelemetria } from '@/lib/types';

const GeoMapa = dynamic(() => import('@/components/mapa/GeoMapa'), { ssr: false });

const ESTADOS_VUELO_VALIDOS = ['PROGRAMADO', 'EN_RUTA', 'CANCELADO', 'COMPLETADO'] as const;

const COLOR_NODO_MAP = {
  VERDE: '#22c55e',
  AMBAR: '#eab308',
  ROJO: '#ef4444',
} as const;

function matchEstadoVuelo(valor: string): VueloEnMapa['estado'] {
  if (ESTADOS_VUELO_VALIDOS.includes(valor as typeof ESTADOS_VUELO_VALIDOS[number])) {
    return valor as VueloEnMapa['estado'];
  }
  return 'PROGRAMADO';
}

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

function ResumenVuelos({ vuelos }: { vuelos: VueloTelemetria[] }) {
  const activos = vuelos.filter(v => v.estado === 'EN_RUTA').length;
  const programados = vuelos.filter(v => v.estado === 'PROGRAMADO').length;

  const porNodo = useMemo(() => {
    const map = new Map<string, { activos: number; programados: number }>();
    for (const v of vuelos) {
      if (v.estado !== 'EN_RUTA' && v.estado !== 'PROGRAMADO') continue;
      const entry = map.get(v.origen_iata) ?? { activos: 0, programados: 0 };
      if (v.estado === 'EN_RUTA') entry.activos++;
      if (v.estado === 'PROGRAMADO') entry.programados++;
      map.set(v.origen_iata, entry);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].activos - a[1].activos);
  }, [vuelos]);

  return (
    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
        Resumen de Vuelos
      </h3>
      <div className="flex gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-slate-500">Activos</span>
          <span className="ml-auto text-lg font-bold text-green-600">{activos}</span>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs text-slate-500">Prog.</span>
          <span className="ml-auto text-lg font-bold text-blue-600">{programados}</span>
        </div>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto text-sm">
        {porNodo.map(([iata, cnt]) => (
          <div key={iata} className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-800/50">
            <span className="font-medium text-slate-700 dark:text-slate-300">{iata}</span>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-green-600 font-semibold">{cnt.activos}</span>
              </span>
              <span className="text-slate-300">/</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-blue-600 font-semibold">{cnt.programados}</span>
              </span>
            </div>
          </div>
        ))}
        {porNodo.length === 0 && (
          <p className="text-xs text-slate-400 italic text-center py-2">Sin datos de vuelos</p>
        )}
      </div>
    </div>
  );
}

interface SesionResponse {
  id: string;
}

function SimulacionContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const sesionIdParam = params.id as string;
  const probCancelacion = Number(searchParams.get('prob_cancelacion') || '15');
  const fechaInicio = searchParams.get('fecha_inicio_virtual') || '2025-06-01';
  const horaInicio = searchParams.get('hora_inicio_virtual') || '08:00';

  const [backendSesionId, setBackendSesionId] = useState<string>(sesionIdParam);
  const [estado, setEstado] = useState<'CONFIGURADA' | 'EN_CURSO' | 'PAUSADA' | 'FINALIZADA'>('CONFIGURADA');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const accionRef = useRef<'ninguna' | 'detener'>('ninguna');
  const { data: telemetria, connected } = useTelemetria(estado === 'EN_CURSO');

  const [initialNodos, setInitialNodos] = useState<NodoEnMapa[]>([]);
  const [initialVuelos, setInitialVuelos] = useState<VueloEnMapa[]>([]);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [nodosData, vuelosData] = await Promise.all([
          api.get<Nodo[]>('/nodos'),
          api.get<VueloPageResponse>('/vuelos?size=50'),
        ]);
        setInitialNodos(
          nodosData.map(n => {
            const pct = n.capacidad_almacen > 0 ? (n.ocupacion_actual / n.capacidad_almacen) * 100 : 0;
            const color = pct < 70 ? '#22c55e' : pct < 90 ? '#eab308' : '#ef4444';
            return { ...n, color, ocupacionPorcentaje: pct };
          })
        );
        setInitialVuelos(vuelosData.content.map((v: Vuelo): VueloEnMapa => ({ ...v })));
      } catch {
      }
    }
    loadInitial();
  }, []);

  const [metricasPoll, setMetricasPoll] = useState<MetricasSimulacion>({
    sesion_id: sesionIdParam,
    estado: 'CONFIGURADA',
    dia_hora_virtual: `${fechaInicio}T${horaInicio}:00Z`,
    segundos_reales_transcurridos: 0,
    sla_acumulado_pct: 100,
    vuelos_cancelados: 0,
    maletas_replanificadas: 0,
  });

  const metricas = telemetria?.metricas_sesion ?? metricasPoll;

  const nodosTelemetria: NodoEnMapa[] = useMemo(() =>
    (telemetria?.nodos ?? []).map(n => ({
      id: n.id,
      codigo_iata: n.codigo_iata,
      nombre: n.codigo_iata,
      latitud: n.lat,
      longitud: n.lon,
      capacidad_almacen: 0,
      ocupacion_actual: 0,
      zona_horaria: '',
      color: COLOR_NODO_MAP[n.color as keyof typeof COLOR_NODO_MAP] || '#22c55e',
      ocupacionPorcentaje: n.ocupacion_pct,
    })), [telemetria]);

  const vuelosTelemetria: VueloEnMapa[] = useMemo(() =>
    (telemetria?.vuelos ?? []).map(v => ({
      id: v.id,
      codigo_vuelo: v.codigo_vuelo,
      estado: matchEstadoVuelo(v.estado),
      origen: { id: '', codigo_iata: v.origen_iata, nombre: v.origen_iata },
      destino: { id: '', codigo_iata: v.destino_iata, nombre: v.destino_iata },
      origen_lat: v.origen_lat,
      origen_lon: v.origen_lon,
      destino_lat: v.destino_lat,
      destino_lon: v.destino_lon,
      hora_salida: '',
      hora_llegada: '',
      capacidad_carga: 0,
      carga_disponible: 0,
      es_plantilla: false,
      fecha_operacion: '',
      posicionActual: { lat: v.lat_actual, lon: v.lon_actual },
    })), [telemetria]);

  const hayTelemetria = telemetria !== null && (telemetria.nodos?.length > 0 || telemetria.vuelos?.length > 0);
  const nodosMapa = hayTelemetria ? nodosTelemetria : initialNodos;
  const vuelosMapa = hayTelemetria ? vuelosTelemetria : initialVuelos;

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMetricas = useCallback(async () => {
    if (!backendSesionId || accionRef.current === 'detener') return;
    try {
      const data = await api.get<MetricasSimulacion>(`/sesiones/${backendSesionId}/metricas`);
      setMetricasPoll(data);
      if (accionRef.current === 'ninguna') {
        setEstado(data.estado);
      }
    } catch {
    }
  }, [backendSesionId]);

  useEffect(() => {
    if (backendSesionId && estado === 'EN_CURSO' && !connected) {
      pollingRef.current = setInterval(fetchMetricas, 3000);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [backendSesionId, estado, connected, fetchMetricas]);

  useEffect(() => {
    if (backendSesionId && accionRef.current === 'ninguna') {
      fetchMetricas();
    }
  }, [backendSesionId, fetchMetricas]);

  const handleIniciar = async () => {
    setLoading(true);
    setError('');
    try {
      let sesionId = backendSesionId;
      if (!sesionId) {
        const createRes = await api.post<SesionResponse>('/sesiones', {
          tipo: 'SIMULADA',
          fecha_inicio_virtual: fechaInicio,
          hora_inicio_virtual: horaInicio + ':00',
          prob_cancelacion: probCancelacion / 100,
          umbrales_almacen: {
            verde_min: 0, verde_max: 70,
            ambar_min: 70, ambar_max: 90,
            rojo_min: 90, rojo_max: 100
          },
          umbrales_vuelo: {
            verde_min: 0, verde_max: 75,
            ambar_min: 75, ambar_max: 90,
            rojo_min: 90, rojo_max: 100
          }
        });
        sesionId = createRes.id;
        setBackendSesionId(sesionId);
      }

      await api.post(`/sesiones/${sesionId}/iniciar`, {});
      setEstado('EN_CURSO');
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setError(error.mensaje || error.message || 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  const handlePausar = async () => {
    if (!backendSesionId) return;
    setLoading(true);
    try {
      await api.post(`/sesiones/${backendSesionId}/pausar`, {});
      setEstado('PAUSADA');
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setError(error.mensaje || 'Error al pausar');
    } finally {
      setLoading(false);
    }
  };

  const handleDetener = async () => {
    if (!backendSesionId) return;
    accionRef.current = 'detener';
    setLoading(true);
    setError('');
    try {
      await api.post(`/sesiones/${backendSesionId}/detener`, {});
      setEstado('FINALIZADA');
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setError(error.mensaje || 'Error al detener');
      accionRef.current = 'ninguna';
    } finally {
      setLoading(false);
    }
  };

  const slaColor = () => {
    if (metricas.sla_acumulado_pct >= 90) return 'bg-green-500';
    if (metricas.sla_acumulado_pct >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatoTiempo = (seg: number) => {
    const h = Math.floor(seg / 3600);
    const m = Math.floor((seg % 3600) / 60);
    const s = seg % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="flex-1 p-4">
<GeoMapa
          nodos={nodosMapa}
          vuelos={vuelosMapa}
          mostrarAviones={true}
          animacionActiva={estado === 'EN_CURSO'}
          className="h-full"
        />
      </div>

      <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Sesion de Simulacion</h2>
            <Badge
              variant={
                estado === 'EN_CURSO' ? 'green' :
                estado === 'PAUSADA' ? 'yellow' :
                estado === 'FINALIZADA' ? 'red' : 'blue'
              }
            >
              {estado.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-slate-500">
              {connected ? 'Telemetría conectada' : 'Telemetría desconectada'}
            </span>
          </div>
          <div className="text-xs text-slate-500 font-mono">{backendSesionId || sesionIdParam}</div>
        </div>

        <div className="p-4 space-y-3 flex-1">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <Clock size={18} className="text-slate-400" />
              <div>
                <div className="text-xs text-slate-500">Tiempo real</div>
                <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                  {formatoTiempo(metricas.segundos_reales_transcurridos)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <Activity size={18} className="text-slate-400" />
              <div className="flex-1">
                <div className="text-xs text-slate-500">Dia/hora virtual</div>
                <div className="text-sm font-medium font-mono text-slate-900 dark:text-slate-100">
                  {new Date(metricas.dia_hora_virtual).toLocaleString('es-ES', {
                    timeZone: 'UTC',
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                  })} UTC
                </div>
              </div>
            </div>
          </div>

          <MetricaCard
            label="SLA Acumulado"
            value={`${metricas.sla_acumulado_pct.toFixed(1)}%`}
            icon={Activity}
            color={slaColor()}
          />
          <MetricaCard
            label="Vuelos Cancelados"
            value={metricas.vuelos_cancelados}
            icon={AlertTriangle}
            color="bg-red-500"
          />
          <MetricaCard
            label="Maletas Replanificadas"
            value={metricas.maletas_replanificadas}
            icon={RefreshCw}
            color="bg-blue-500"
          />
        </div>

        <ResumenVuelos vuelos={telemetria?.vuelos ?? []} />

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-2 rounded">
              {error}
            </div>
          )}
          {estado === 'CONFIGURADA' && (
            <Button className="w-full" onClick={handleIniciar} disabled={loading}>
              <Play size={16} className="mr-2" />
              {loading ? 'Iniciando...' : 'Iniciar'}
            </Button>
          )}
          {estado === 'EN_CURSO' && (
            <Button className="w-full" variant="secondary" onClick={handlePausar} disabled={loading}>
              <Pause size={16} className="mr-2" />
              Pausar
            </Button>
          )}
          {estado === 'PAUSADA' && (
            <Button className="w-full" onClick={handleIniciar} disabled={loading}>
              <Play size={16} className="mr-2" />
              Reanudar
            </Button>
          )}
          {(estado === 'EN_CURSO' || estado === 'PAUSADA') && (
            <Button className="w-full" variant="danger" onClick={handleDetener} disabled={loading}>
              <Square size={16} className="mr-2" />
              {loading ? 'Deteniendo...' : 'Detener'}
            </Button>
          )}
          {estado === 'FINALIZADA' && (
            <Button className="w-full" variant="secondary" onClick={() => router.push(`/simulacion/${backendSesionId || sesionIdParam}/reporte`)}>
              <FileText size={16} className="mr-2" />
              Ver Reporte
            </Button>
          )}
          <Button variant="ghost" className="w-full" onClick={() => router.push('/simulacion')}>
            Nueva Simulacion
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SimulacionDetallePage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Cargando simulacion...</div>}>
      <SimulacionContent />
    </Suspense>
  );
}
