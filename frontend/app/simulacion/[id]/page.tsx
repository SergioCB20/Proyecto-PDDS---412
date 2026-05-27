'use client';

import { useEffect, useState, Suspense, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Play, Pause, Square, Clock, AlertTriangle, RefreshCw, Activity, FileText } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { MOCK_NODOS, MOCK_VUELOS, nodoToEnMapa, resetMetricasMock, tickMetricasMock } from '@/lib/mock';
import type { NodoEnMapa, MetricasSimulacion } from '@/lib/types';

const GeoMapa = dynamic(() => import('@/components/mapa/GeoMapa'), { ssr: false });

const FALLBACK_SIM_ID = 'sim-' + Math.random().toString(36).substring(2, 8);

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
  const router = useRouter();
  const sesionIdParam = searchParams.get('sesionId') || '';
  const probCancelacion = Number(searchParams.get('prob_cancelacion') || '15');
  const fechaInicio = searchParams.get('fecha_inicio_virtual') || '2025-06-01';
  const horaInicio = searchParams.get('hora_inicio_virtual') || '08:00';

  const [backendSesionId, setBackendSesionId] = useState<string>('');
  const [estado, setEstado] = useState<'CONFIGURADA' | 'EN_CURSO' | 'PAUSADA' | 'FINALIZADA'>('CONFIGURADA');
  const [, setLoading] = useState(false);
  const [, setError] = useState<string>('');
  const [metricas, setMetricas] = useState<MetricasSimulacion>({
    sesion_id: sesionIdParam,
    estado: 'CONFIGURADA',
    dia_hora_virtual: `${fechaInicio}T${horaInicio}:00Z`,
    segundos_reales_transcurridos: 0,
    sla_acumulado_pct: 100,
    vuelos_cancelados: 0,
    maletas_replanificadas: 0,
  });

  const nodosEnMapa: NodoEnMapa[] = MOCK_NODOS.map(nodoToEnMapa);
  const vuelos = MOCK_VUELOS;
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMetricas = useCallback(async () => {
    if (!backendSesionId) return;
    try {
      const data = await api.get<MetricasSimulacion>(`/sesiones/${backendSesionId}/metricas`);
      setMetricas(data);
      setEstado(data.estado);
    } catch {
    }
  }, [backendSesionId]);

  useEffect(() => {
    if (backendSesionId && estado === 'EN_CURSO') {
      pollingRef.current = setInterval(fetchMetricas, 3000);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [backendSesionId, estado, fetchMetricas]);

  useEffect(() => {
    resetMetricasMock(sesionIdParam);
  }, [sesionIdParam]);

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
      setMetricas(tickMetricasMock(true, probCancelacion / 100));
      setEstado('EN_CURSO');
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
          <div className="text-xs text-slate-500 font-mono">{backendSesionId || sesionIdParam || FALLBACK_SIM_ID}</div>
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
