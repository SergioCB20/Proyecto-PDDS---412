'use client';

import { useEffect, useRef, useState } from 'react';
import { api, fetchReporte } from './api';
import { device } from './device';
import { useTelemetria } from './useTelemetria';
import { useReloj } from './useReloj';
import { useInitialMapData } from './useInitialMapData';
import type { EstadoSesionMapa } from './useMapaData';
import type { UmbralesConfig } from '@/components/mapa/ConfigUmbrales';
import type {
  MetricasSimulacion,
  ReporteSesion,
  PlantillaResumen,
  VueloPageResponse,
} from './types';

export interface SesionListaItem {
  id: string;
  tipo: string;
  tipo_simulacion: string;
  estado: string;
  fecha_inicio_virtual: string;
  created_at: string;
  dispositivo_id: string | null;
}

interface SesionResponse {
  id: string;
}

export interface CancelResultEquipaje {
  id: string;
  codigo: string;
  origen_iata: string;
  destino_iata: string;
}

export interface CancelResult {
  vueloId: string;
  codigo: string;
  loteId: string;
  equipajes: CancelResultEquipaje[];
}

export interface CancelResultResponse {
  vuelo_id: string;
  estado_nuevo: string;
  equipajes_afectados: number;
  lote_replanificacion_id: string;
  equipajes: CancelResultEquipaje[];
}

/** Estado de sesión propio de las vistas de simulación (incluye COLAPSADA). */
export type EstadoSesionSim = EstadoSesionMapa;

interface UseSimulacionSesionParams {
  configUmbrales: UmbralesConfig;
  /**
   * Tipo de simulación a crear. `undefined` → el backend usa su default
   * (VENTANA_FIJA); `'HASTA_COLAPSO'` → corre hasta el colapso. Preserva el
   * comportamiento previo: Simulación no lo enviaba, Colapso enviaba HASTA_COLAPSO.
   */
  tipoSimulacion?: 'HASTA_COLAPSO';
}

/**
 * Ciclo de vida de una sesión de simulación (estado + efectos + handlers),
 * compartido por las vistas de Simulación y Colapso (antes ~400 líneas duplicadas
 * con divergencias mínimas). Las diferencias reales quedan parametrizadas:
 * `tipoSimulacion` en la creación, y el manejo de COLAPSADA queda unificado para
 * ambas (mejora: ambas reaccionan si el backend colapsa la sesión).
 *
 * Compone useTelemetria (WebSocket en vivo) y useInitialMapData (REST de vista
 * previa). El estado de UI (paneles, filtros, selección) se queda en cada vista.
 */
export function useSimulacionSesion({
  configUmbrales,
  tipoSimulacion,
}: UseSimulacionSesionParams) {
  const [sesionId, setSesionId] = useState<string | null>(null);
  const [inicioRealMs, setInicioRealMs] = useState(0);
  const [estadoSesion, setEstadoSesion] = useState<EstadoSesionSim>('CONFIGURADA');
  const [cancelResult, setCancelResult] = useState<CancelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sesionesActivas, setSesionesActivas] = useState<SesionListaItem[]>([]);
  const [finalizandoId, setFinalizandoId] = useState<string | null>(null);
  const [reporte, setReporte] = useState<ReporteSesion | null>(null);
  const [plantillas, setPlantillas] = useState<PlantillaResumen[]>([]);
  const [simReady, setSimReady] = useState(false);

  const [simulacionConfig, setSimulacionConfig] = useState({
    fecha_inicio_virtual: '2026-01-02',
    hora_inicio_virtual: '08:00',
  });

  const [metricasPoll, setMetricasPoll] = useState<MetricasSimulacion>({
    sesion_id: '',
    estado: 'CONFIGURADA',
    dia_hora_virtual: '',
    segundos_reales_transcurridos: 0,
    sla_acumulado_pct: 100,
    vuelos_cancelados: 0,
    maletas_replanificadas: 0,
  });

  const { data: telemetria, connected: wsConnected } = useTelemetria(
    estadoSesion === 'EN_CURSO',
  );
  const { initialAeropuertos, initialVuelos, resetInitialData } =
    useInitialMapData({ sesionId, estadoSesion, configUmbrales });
  const hora = useReloj();

  const sesionIdRef = useRef<string | null>(null);
  useEffect(() => {
    sesionIdRef.current = sesionId;
  }, [sesionId]);

  const metricas = telemetria?.metricas_sesion ?? metricasPoll;

  /** Espera a que el reporte de la sesión esté disponible (hasta ~6 s). */
  async function fetchReportConReintentos(id: string) {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 600));
      try {
        const r = await fetchReporte(id);
        setReporte(r);
        return;
      } catch {
        /* report not ready yet */
      }
    }
  }

  // Plantillas: una fila por codigo_vuelo. Solo cuando la sesión ya está en
  // movimiento (no CONFIGURADA/FINALIZADA/COLAPSADA), porque la regla hoy/mañana
  // requiere el reloj virtual que solo existe una vez arrancada.
  useEffect(() => {
    if (
      !sesionId ||
      estadoSesion === 'CONFIGURADA' ||
      estadoSesion === 'FINALIZADA' ||
      estadoSesion === 'COLAPSADA'
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlantillas([]);
      return;
    }
    api
      .get<VueloPageResponse>('/vuelos?es_plantilla=true&size=500')
      .then((r) => {
        setPlantillas(
          r.content.map((v) => ({
            id: v.id,
            codigo_vuelo: v.codigo_vuelo,
            origen_iata: v.origen.codigo_iata,
            destino_iata: v.destino.codigo_iata,
            hora_salida: v.hora_salida,
            hora_llegada: v.hora_llegada,
          })),
        );
      })
      .catch(() => setPlantillas([]));
  }, [sesionId, estadoSesion]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSimReady(false);
  }, [sesionId]);
  useEffect(() => {
    if (
      sesionId &&
      estadoSesion === 'EN_CURSO' &&
      telemetria?.sesion_id === sesionId &&
      (telemetria?.metricas_sesion?.segundos_reales_transcurridos ?? 0) > 0
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSimReady(true);
    }
  }, [telemetria, sesionId, estadoSesion]);

  useEffect(() => {
    api
      .get<SesionListaItem[]>('/sesiones?estado=EN_CURSO')
      .then((enCurso) =>
        api
          .get<SesionListaItem[]>('/sesiones?estado=PAUSADA')
          .then((pausadas) => {
            setSesionesActivas([...enCurso, ...pausadas]);
          }),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (
      !sesionId ||
      estadoSesion === 'FINALIZADA' ||
      estadoSesion === 'COLAPSADA'
    )
      return;
    const targetSesionId = sesionId;
    const interval = setInterval(() => {
      api
        .get<MetricasSimulacion>(`/sesiones/${targetSesionId}/metricas`)
        .then((m) => {
          if (!sesionIdRef.current || sesionIdRef.current !== targetSesionId)
            return;
          setMetricasPoll(m);
          if (m.estado === 'COLAPSADA' || m.estado === 'FINALIZADA') {
            setEstadoSesion(m.estado);
            fetchReportConReintentos(targetSesionId);
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [sesionId, estadoSesion]);

  const currentDeviceId = typeof window !== 'undefined' ? device.getId() : '';
  const sesionEnCurso = sesionesActivas.find((s) => s.estado === 'EN_CURSO');
  const sesionPausada = sesionesActivas.find((s) => s.estado === 'PAUSADA');
  const isDuenioSesionActual =
    sesionId &&
    (!sesionesActivas.some((s) => s.id === sesionId) ||
      sesionesActivas.some(
        (s) => s.id === sesionId && s.dispositivo_id === currentDeviceId,
      ));

  const handleIniciar = async () => {
    setError('');
    setLoading(true);
    setReporte(null);
    try {
      const umbrales = {
        verde_min: 0,
        verde_max: configUmbrales.verdeMax,
        ambar_min: configUmbrales.verdeMax,
        ambar_max: configUmbrales.ambarMax,
        rojo_min: configUmbrales.ambarMax,
        rojo_max: 100,
      };
      const res = await api.post<SesionResponse>('/sesiones', {
        tipo: 'SIMULADA',
        ...(tipoSimulacion ? { tipo_simulacion: tipoSimulacion } : {}),
        fecha_inicio_virtual: simulacionConfig.fecha_inicio_virtual,
        hora_inicio_virtual: simulacionConfig.hora_inicio_virtual + ':00',
        umbrales_almacen: umbrales,
        umbrales_vuelo: umbrales,
      });
      await api.post(`/sesiones/${res.id}/iniciar`, {});
      setSesionId(res.id);
      setInicioRealMs(hora.getTime());
      setEstadoSesion('EN_CURSO');
      setSesionesActivas([]);
      setMetricasPoll({
        sesion_id: res.id,
        estado: 'EN_CURSO',
        dia_hora_virtual: '',
        segundos_reales_transcurridos: 0,
        sla_acumulado_pct: 100,
        vuelos_cancelados: 0,
        maletas_replanificadas: 0,
      });
      resetInitialData();
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || 'Error al crear sesion');
    } finally {
      setLoading(false);
    }
  };

  const handlePausar = async () => {
    if (!sesionId) return;
    setLoading(true);
    try {
      await api.post(`/sesiones/${sesionId}/pausar`, {});
      setEstadoSesion('PAUSADA');
    } catch {
      setError('Error al pausar');
    } finally {
      setLoading(false);
    }
  };

  const handleReanudar = async () => {
    if (!sesionId) return;
    setLoading(true);
    setError('');
    try {
      const otrasActivas = await api
        .get<SesionListaItem[]>('/sesiones?estado=EN_CURSO')
        .catch(() => [] as SesionListaItem[]);
      for (const s of otrasActivas) {
        if (s.id !== sesionId) {
          try {
            await api.post(`/sesiones/${s.id}/detener`, {});
          } catch {
            /* ignore */
          }
        }
      }
      await api.post(`/sesiones/${sesionId}/iniciar`, {});
      setInicioRealMs(hora.getTime());
      setEstadoSesion('EN_CURSO');
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || 'Error al reanudar');
    } finally {
      setLoading(false);
    }
  };

  const handleDetener = async (id: string) => {
    setFinalizandoId(id);
    setError('');
    try {
      await api.post(`/sesiones/${id}/detener`, {});
      setSesionesActivas((prev) => prev.filter((s) => s.id !== id));
      if (id === sesionId) {
        setSesionId(null);
        setEstadoSesion('FINALIZADA');
        setInicioRealMs(0);
      }
      await fetchReportConReintentos(id);
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || 'Error al detener');
    } finally {
      setFinalizandoId(null);
    }
  };

  const handleCancelarVuelo = async (id: string, codigo: string) => {
    if (!confirm(`¿Cancelar vuelo ${codigo}?`)) return;
    try {
      const res = await api.post<CancelResultResponse>(
        '/simulacion/cancelacion',
        { vuelo_id: id, causa: 'Cancelación manual', sesion_id: sesionId },
      );
      setCancelResult({
        vueloId: res.vuelo_id,
        codigo,
        loteId: res.lote_replanificacion_id,
        equipajes: res.equipajes ?? [],
      });
    } catch {
      alert('Error al cancelar vuelo');
    }
  };

  return {
    // estado
    sesionId,
    estadoSesion,
    inicioRealMs,
    cancelResult,
    loading,
    error,
    sesionesActivas,
    finalizandoId,
    reporte,
    plantillas,
    simReady,
    simulacionConfig,
    metricas,
    // telemetría / datos preview
    telemetria,
    wsConnected,
    initialAeropuertos,
    initialVuelos,
    // derivados
    hora,
    currentDeviceId,
    sesionEnCurso,
    sesionPausada,
    isDuenioSesionActual,
    // setters que usa el JSX directamente
    setSesionId,
    setEstadoSesion,
    setInicioRealMs,
    setSimulacionConfig,
    setCancelResult,
    setReporte,
    setLoading,
    setError,
    // handlers
    handleIniciar,
    handlePausar,
    handleReanudar,
    handleDetener,
    handleCancelarVuelo,
  };
}
