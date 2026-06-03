'use client';

import { useEffect, useState, Suspense, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import { Play, Pause, Square, Clock, AlertTriangle, RefreshCw, Activity, FileText } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { useTelemetria } from '@/lib/useTelemetria';
import type { NodoEnMapa, VueloEnMapa, MetricasSimulacion } from '@/lib/types';

const GeoMapa = dynamic(() => import('@/components/mapa/GeoMapa'), { ssr: false });

const ESTADOS_VUELO_VALIDOS = ['PROGRAMADO', 'EN_RUTA', 'CANCELADO', 'COMPLETADO'] as const;

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
  const [, setLoading] = useState(false);
  const [, setError] = useState<string>('');
  const { data: telemetria, connected } = useTelemetria(estado === 'EN_CURSO');

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

  const nodosEnMapa: NodoEnMapa[] = useMemo(() =>
    (telemetria?.nodos ?? []).map(n => ({
      id: n.id,
      codigo_iata: n.codigo_iata,
      nombre: n.codigo_iata,
      latitud: n.lat,
      longitud: n.lon,
      capacidad_almacen: 0,
      ocupacion_actual: 0,
      color: n.color,
      ocupacionPorcentaje: n.ocupacion_pct,
    })), [telemetria]);

  const vuelos: VueloEnMapa[] = useMemo(() =>
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
      posicionActual: { lat: v.lat_actual, lon: v.lon_actual },
    })), [telemetria]);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMetricas = useCallback(async () => {
    if (!backendSesionId) return;
    try {
      const data = await api.get<MetricasSimulacion>(`/sesiones/${backendSesionId}/metricas`);
      setMetricasPoll(data);
      setEstado(data.estado);
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
    setLoading(true);
    try {
      await api.post(`/sesiones/${backendSesionId}/detener`, {});
      setEstado('FINALIZADA');
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setError(error.mensaje || 'Error al detener');
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
          nodos={nodosEnMapa}
          vuelos={vuelos}
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

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
          {estado === 'CONFIGURADA' && (
            <Button className="w-full" onClick={handleIniciar}>
              <Play size={16} className="mr-2" />
              Iniciar
            </Button>
          )}
          {estado === 'EN_CURSO' && (
            <Button className="w-full" variant="secondary" onClick={handlePausar}>
              <Pause size={16} className="mr-2" />
              Pausar
            </Button>
          )}
          {estado === 'PAUSADA' && (
            <Button className="w-full" onClick={handleIniciar}>
              <Play size={16} className="mr-2" />
              Reanudar
            </Button>
          )}
          {(estado === 'EN_CURSO' || estado === 'PAUSADA') && (
            <Button className="w-full" variant="danger" onClick={handleDetener}>
              <Square size={16} className="mr-2" />
              Detener
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
