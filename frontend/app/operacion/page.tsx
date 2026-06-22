'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Package, RefreshCw, ChevronDown, ChevronUp, CheckCircle, XCircle, Plane, Upload, FileSpreadsheet, AlertTriangle, Menu, ChevronLeft, Power } from 'lucide-react';
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
import { PanelVuelosOperacion } from '@/components/operacion/PanelVuelosOperacion';
import { PanelNodosOperacion } from '@/components/operacion/PanelNodosOperacion';
import { PanelEntregadosOperacion } from '@/components/operacion/PanelEntregadosOperacion';
import { PanelEnviosOperacion } from '@/components/operacion/PanelEnviosOperacion';
import type { SelectedEnvioOperacion } from '@/components/operacion/PanelEnviosOperacion';
import { MetricasOperacion } from '@/components/operacion/MetricasOperacion';
import { ResumenVuelosOperacion } from '@/components/operacion/ResumenVuelosOperacion';
import type { Nodo, Vuelo, VueloEnMapa, VueloPageResponse, NodoEnMapa, CrearEquipajeRequest, CrearEquipajeResponse, CargaMasivaPreview, CargaMasivaConfirmResponse } from '@/lib/types';
import { auth } from '@/lib/auth';

const GeoMapa = dynamic(() => import('@/components/mapa/GeoMapa'), { ssr: false });

const ESTADOS_VUELO_VALIDOS = ['PROGRAMADO', 'EN_RUTA', 'CANCELADO', 'COMPLETADO'] as const;

function getNodoRefIdFromToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = auth.getToken();
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    const parsed = JSON.parse(atob(base64));
    return parsed.nodo_ref_id || null;
  } catch {
    return null;
  }
}

function matchEstadoVuelo(valor: string): VueloEnMapa['estado'] {
  if (ESTADOS_VUELO_VALIDOS.includes(valor as typeof ESTADOS_VUELO_VALIDOS[number])) {
    return valor as VueloEnMapa['estado'];
  }
  return 'PROGRAMADO';
}

interface EquipajeReciente {
  id_externo: string;
  destino: string;
  estado: string;
  tiempo: string;
}

export default function OperacionPage() {
  const [nodos, setNodos] = useState<NodoEnMapa[]>([]);
  const [vuelosEnRuta, setVuelosEnRuta] = useState<VueloEnMapa[]>([]);
  const [allVuelos, setAllVuelos] = useState<VueloEnMapa[]>([]);
  const [equipajesRecientes, setEquipajesRecientes] = useState<EquipajeReciente[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    destinoIata: '',
    cantidad: 1,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState<CrearEquipajeResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [cargaMasivaOpen, setCargaMasivaOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CargaMasivaPreview | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvConfirmLoading, setCsvConfirmLoading] = useState(false);
  const [manifestLoading, setManifestLoading] = useState<string | null>(null);

  const [vueloFormOpen, setVueloFormOpen] = useState(false);
  const [vueloFormData, setVueloFormData] = useState({
    codigo_vuelo: '',
    origen_id: '',
    destino_id: '',
    hora_salida: '',
    hora_llegada: '',
    capacidad_carga: '',
  });
  const [vueloFormLoading, setVueloFormLoading] = useState(false);
  const [vueloFormError, setVueloFormError] = useState<string | null>(null);
  const [editingVuelo, setEditingVuelo] = useState<Vuelo | null>(null);

  const [sseConnected, setSseConnected] = useState(false);
  const { data: telemetria, connected: wsConnected } = useTelemetria(true);
  const k = useMemo(() => telemetria?.metricas_sesion?.k ?? 120, [telemetria]);
  const animacionActiva = wsConnected && (telemetria?.vuelos?.some(v => v.estado === 'EN_RUTA') ?? false);
  const [notificaciones, setNotificaciones] = useState<{ id: number; tipo: 'success' | 'error'; mensaje: string }[]>([]);

  const ultimaTelemetria = useRef<number>(0);
  const [operacionActiva, setOperacionActiva] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedEnvio, setSelectedEnvio] = useState<SelectedEnvioOperacion | null>(null);
  const [vueloFilterOrigen, setVueloFilterOrigen] = useState('');
  const [vueloFilterDestino, setVueloFilterDestino] = useState('');
  const [operadorNodo, setOperadorNodo] = useState<NodoEnMapa | null>(null);

  const agregarNotificacion = (tipo: 'success' | 'error', mensaje: string) => {
    const id = Date.now();
    setNotificaciones(prev => [...prev.slice(-4), { id, tipo, mensaje }]);
    setTimeout(() => setNotificaciones(prev => prev.filter(n => n.id !== id)), 5000);
  };

  const getApiBaseUrl = () => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const base = getApiBaseUrl().replace(/\/api\/?$/, '');
    const url = `${base}/api/eventos/planificacion?token=${encodeURIComponent(token)}`;
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const conectar = () => {
      eventSource = new EventSource(url);

      eventSource.onopen = () => setSseConnected(true);

      eventSource.addEventListener('planificacion-completada', (e) => {
        try {
          const data = JSON.parse(e.data);
          agregarNotificacion('success', `Equipaje ${data.equipaje_id.slice(0, 8)}... planificado (${data.tipo})`);
          setEquipajesRecientes(prev => [
            { id_externo: data.equipaje_id, destino: '', estado: 'ENRUTADO', tiempo: 'ahora' },
            ...prev.slice(0, 7),
          ]);
        } catch { /* ignore parse errors */ }
      });

      eventSource.addEventListener('planificacion-fallida', (e) => {
        try {
          const data = JSON.parse(e.data);
          agregarNotificacion('error', `Fallo planificacion: ${data.error || data.equipaje_id?.slice(0, 8)}`);
        } catch { /* ignore parse errors */ }
      });

      eventSource.onerror = () => {
        eventSource?.close();
        setSseConnected(false);
        reconnectTimer = setTimeout(conectar, 3000);
      };
    };

    conectar();

    return () => {
      eventSource?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  const toggleOperacion = async () => {
    setToggleLoading(true);
    try {
      const res = await api.post<{ activo: boolean }>('/operacion/toggle', {});
      setOperacionActiva(res.activo);
    } catch {
      agregarNotificacion('error', 'Error al cambiar estado');
    } finally {
      setToggleLoading(false);
    }
  };

  useEffect(() => {
    api.get<{ activo: boolean }>('/operacion/estado')
      .then(res => setOperacionActiva(res.activo))
      .catch(() => {});
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const ahora = new Date();

      // Si WS ha entregado datos en los últimos 15s, saltar REST para evitar flicker
      if (ultimaTelemetria.current > 0 && ahora.getTime() - ultimaTelemetria.current < 15000) {
        setLastUpdate(new Date());
        setLoading(false);
        return;
      }

      const baseDate = '2026-01-15';
      const pad = (n: number) => String(n).padStart(2, '0');
      const hh = pad(ahora.getUTCHours());
      const mm = pad(ahora.getUTCMinutes());
      const ss = pad(ahora.getUTCSeconds());
      const wStart = `${baseDate}T${hh}:${mm}:${ss}Z`;
      const wEnd = new Date(new Date(wStart).getTime() + 4 * 3600000).toISOString();
      const [nodosData, vuelosData] = await Promise.all([
        api.get<Nodo[]>('/nodos'),
        api.get<VueloPageResponse>(`/vuelos?size=300&fecha_desde=${encodeURIComponent(wStart)}&fecha_hasta=${encodeURIComponent(wEnd)}`),
      ]);
      const mapped = vuelosData.content.map((v: Vuelo): VueloEnMapa => ({ ...v }));
      setNodos(nodosData.map(nodoToEnMapa));
      setAllVuelos(mapped);
      setVuelosEnRuta(mapped.filter((v: VueloEnMapa) => v.estado === 'EN_RUTA'));
      setLastUpdate(new Date());
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setApiError(error.mensaje || error.message || 'Error de conexion con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchData, 5000);
    const timer = setTimeout(fetchData, 0);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!telemetria?.nodos || telemetria.nodos.length === 0) return;

    const telemetriaNodos: NodoEnMapa[] = telemetria.nodos.map(n => ({
      id: n.id,
      codigo_iata: n.codigo_iata,
      nombre: n.codigo_iata,
      latitud: n.lat,
      longitud: n.lon,
      capacidad_almacen: n.capacidad_almacen,
      ocupacion_actual: n.ocupacion_actual,
      zona_horaria: '',
      color: colorNodoPorOcupacion(n.ocupacion_pct),
      ocupacionPorcentaje: n.ocupacion_pct,
    }));

    queueMicrotask(() => {
      setNodos(telemetriaNodos);
    });

    ultimaTelemetria.current = Date.now();

    if (telemetria.vuelos && telemetria.vuelos.length > 0) {
      const telemetriaVuelos: VueloEnMapa[] = telemetria.vuelos.map(v => ({
        id: v.id,
        codigo_vuelo: v.codigo_vuelo,
        estado: matchEstadoVuelo(v.estado),
        origen: { id: '', codigo_iata: v.origen_iata, nombre: v.origen_iata },
        destino: { id: '', codigo_iata: v.destino_iata, nombre: v.destino_iata },
        origen_lat: v.origen_lat,
        origen_lon: v.origen_lon,
        destino_lat: v.destino_lat,
        destino_lon: v.destino_lon,
        hora_salida: v.hora_salida || '',
        hora_llegada: v.hora_llegada || '',
        capacidad_carga: v.capacidad_carga,
        carga_disponible: v.carga_disponible,
        es_plantilla: false,
        fecha_operacion: '',
        posicionActual: { lat: v.lat_actual, lon: v.lon_actual },
      }));

      queueMicrotask(() => {
        setAllVuelos(telemetriaVuelos);
        setVuelosEnRuta(telemetriaVuelos.filter(v => v.estado === 'EN_RUTA'));
      });
    }
  }, [telemetria]);

  const estadoColor = (estado: string): 'green' | 'yellow' | 'red' | 'blue' | 'default' => {
    if (estado === 'ENTREGADO') return 'green';
    if (estado === 'EN_VUELO' || estado === 'EN_ALMACEN') return 'blue';
    if (estado === 'EN_REPLANIFICACION') return 'yellow';
    if (estado === 'INCUMPLIMIENTO_SLA') return 'red';
    return 'default';
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.destinoIata) errors.destinoIata = 'Destino es requerido';
    if (!formData.cantidad || formData.cantidad < 1) errors.cantidad = 'Cantidad debe ser al menos 1';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!validateForm()) return;

    setFormLoading(true);
    try {
      const request: CrearEquipajeRequest = {
        destino_iata: formData.destinoIata,
        cantidad: formData.cantidad,
      };

      const response = await api.post<CrearEquipajeResponse>('/equipajes', request);
      setFormSuccess(response);
      setFormData({ destinoIata: '', cantidad: 1 });
      setEquipajesRecientes(prev => [
        { id_externo: response.id_externo || response.id.slice(0, 8), destino: formData.destinoIata, estado: response.estado, tiempo: 'ahora' },
        ...prev.slice(0, 7),
      ]);
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setFormError(error.mensaje || error.message || 'Error al registrar equipaje');
    } finally {
      setFormLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setCsvError(null);
    setCsvLoading(true);

    try {
      const formData = new FormData();
      formData.append('archivo', file);
      const preview = await api.upload<CargaMasivaPreview>('/equipajes/carga-masiva', formData);
      setCsvPreview(preview);
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setCsvError(error.mensaje || error.message || 'Error al procesar archivo');
      setCsvPreview(null);
    } finally {
      setCsvLoading(false);
    }
  };

  const handleConfirmarCargaMasiva = async () => {
    if (!csvPreview) return;
    const registrosValidos = csvPreview.registros.filter(r => r.estado_validacion === 'VALIDO');
    if (registrosValidos.length === 0) return;

    setCsvConfirmLoading(true);
    setCsvError(null);
    try {
      await api.post<CargaMasivaConfirmResponse>('/equipajes/carga-masiva/confirmar', {});
      setCargaMasivaOpen(false);
      setCsvFile(null);
      setCsvPreview(null);
      fetchData();
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setCsvError(error.mensaje || error.message || 'Error al confirmar carga');
    } finally {
      setCsvConfirmLoading(false);
    }
  };

  const handleCargaMasivaClose = () => {
    setCargaMasivaOpen(false);
    setCsvFile(null);
    setCsvPreview(null);
    setCsvError(null);
  };

  const handleEditarEquipaje = (eq: EquipajeReciente) => {
    setFormData({
      destinoIata: eq.destino,
      cantidad: 1,
    });
    setFormOpen(true);
  };

  const handleEliminarEquipaje = async (idExterno: string) => {
    if (!confirm(`¿Eliminar equipaje ${idExterno}?`)) return;
    try {
      await api.delete(`/equipajes/${idExterno}`);
      setEquipajesRecientes(prev => prev.filter(eq => eq.id_externo !== idExterno));
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      alert(error.mensaje || error.message || 'Error al eliminar equipaje');
    }
  };

  const resetVueloForm = () => {
    setVueloFormData({ codigo_vuelo: '', origen_id: '', destino_id: '', hora_salida: '', hora_llegada: '', capacidad_carga: '' });
    setVueloFormError(null);
    setEditingVuelo(null);
  };

  const handleVueloSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVueloFormError(null);

    if (!vueloFormData.codigo_vuelo || !vueloFormData.origen_id || !vueloFormData.destino_id || !vueloFormData.hora_salida || !vueloFormData.hora_llegada || !vueloFormData.capacidad_carga) {
      setVueloFormError('Todos los campos son requeridos');
      return;
    }

    setVueloFormLoading(true);
    try {
      const payload = {
        codigo_vuelo: vueloFormData.codigo_vuelo,
        origen_id: vueloFormData.origen_id,
        destino_id: vueloFormData.destino_id,
        hora_salida: vueloFormData.hora_salida + ':00',
        hora_llegada: vueloFormData.hora_llegada + ':00',
        capacidad_carga: parseInt(vueloFormData.capacidad_carga),
      };

      if (editingVuelo) {
        await api.put(`/vuelos/${editingVuelo.id}`, payload);
      } else {
        await api.post('/vuelos', payload);
      }

      resetVueloForm();
      setVueloFormOpen(false);
      fetchData();
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setVueloFormError(error.mensaje || error.message || 'Error al guardar vuelo');
    } finally {
      setVueloFormLoading(false);
    }
  };

  const handleEditarVuelo = (vuelo: Vuelo) => {
    setVueloFormData({
      codigo_vuelo: vuelo.codigo_vuelo,
      origen_id: vuelo.origen.id,
      destino_id: vuelo.destino.id,
      hora_salida: vuelo.hora_salida.slice(0, 16),
      hora_llegada: vuelo.hora_llegada.slice(0, 16),
      capacidad_carga: String(vuelo.capacidad_carga),
    });
    setEditingVuelo(vuelo);
    setVueloFormOpen(true);
  };

  const handleEliminarVuelo = async (vuelo: Vuelo) => {
    if (!confirm(`¿Eliminar vuelo ${vuelo.codigo_vuelo}?`)) return;
    try {
      await api.delete(`/vuelos/${vuelo.id}`);
      fetchData();
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      alert(error.mensaje || error.message || 'Error al eliminar vuelo');
    }
  };

  const handleDescargarManifiesto = async (vuelo: Vuelo) => {
    setManifestLoading(vuelo.id);
    try {
      const blob = await api.downloadBlob(`/manifiestos/${vuelo.id}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manifiesto_${vuelo.codigo_vuelo}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const error = err as { status?: number; mensaje?: string };
      if (error.status === 404) {
        alert('Vuelo no encontrado');
      } else if (error.status === 422) {
        alert('El vuelo no tiene equipajes registrados');
      } else {
        alert(error.mensaje || 'Error al descargar manifiesto');
      }
    } finally {
      setManifestLoading(null);
    }
  };

  const destinoOptions = nodos.filter(n => n.codigo_iata).map(n => ({ value: n.codigo_iata, label: n.codigo_iata })).sort((a, b) => a.label.localeCompare(b.label));

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
      if (endMin < 1440) {
        return hsMin >= nowMin && hsMin < endMin;
      } else {
        return hsMin >= nowMin || hsMin < (endMin - 1440);
      }
    });
  }, [allVuelos, vueloFilterOrigen, vueloFilterDestino]);

  useEffect(() => {
    const nodoRefId = getNodoRefIdFromToken();
    if (nodoRefId && nodos.length > 0) {
      const match = nodos.find(n => n.id === nodoRefId) || null;
      setOperadorNodo(match);
    }
  }, [nodos]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="flex-1 p-4 relative">
        {operadorNodo && (
          <div className="absolute top-6 right-6 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md border border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <Plane size={14} className="text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{operadorNodo.codigo_iata}</span>
          </div>
        )}
        <GeoMapa
          nodos={nodos}
          vuelos={vuelosMapaFiltrados}
          mostrarAviones={true}
          animacionActiva={animacionActiva}
          k={k}
          className="h-full"
        />
      </div>

      <div className={`border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-80'}`}>
        <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">Operación en Vivo</h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Expandir panel' : 'Colapsar panel'}
          >
            {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {isCollapsed ? (
          <div className="flex flex-col items-center gap-3 py-4 px-1">
            <Badge variant={sseConnected ? 'green' : 'red'} className="!px-1 !text-[10px]">
              {sseConnected ? 'SSE' : 'OFF'}
            </Badge>
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} title={wsConnected ? 'WebSocket conectado' : 'WebSocket desconectado'} />
            <span className={`w-2 h-2 rounded-full ${operacionActiva ? 'bg-green-500' : 'bg-red-500'}`} title={operacionActiva ? 'Operación activa' : 'Operación detenida'} />
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">Operación en Vivo</h2>
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-50"
                  title="Actualizar"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-slate-500">
                  SSE {sseConnected ? 'conectado' : 'desconectado'}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-300 mx-1" />
                <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-slate-500">
                  WS {wsConnected ? 'conectado' : 'desconectado'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${operacionActiva ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-slate-500">
                    Operación {operacionActiva ? 'activa' : 'detenida'}
                  </span>
                </div>
                <button
                  onClick={toggleOperacion}
                  disabled={toggleLoading}
                  className={`p-1.5 rounded-lg transition-colors ${
                    operacionActiva
                      ? 'bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400'
                      : 'bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400'
                  }`}
                  title={operacionActiva ? 'Detener operación' : 'Activar operación'}
                >
                  <Power size={14} className={toggleLoading ? 'animate-spin' : ''} />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Última actualización: {lastUpdate ? lastUpdate.toLocaleTimeString('es-ES') : '...'}
              </p>
              {apiError && (
                <div className="flex items-center gap-2 p-2 mt-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                  <XCircle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                  <span className="text-xs text-red-700 dark:text-red-300">{apiError}</span>
                </div>
              )}
              {notificaciones.length > 0 && (
                <div className="mt-2 space-y-1">
                  {notificaciones.map(n => (
                    <div
                      key={n.id}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                        n.tipo === 'success'
                          ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {n.tipo === 'success' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {n.mensaje}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <MetricasOperacion />

            <ResumenVuelosOperacion vuelos={telemetria?.vuelos ?? []} />

            {telemetria?.nodos && telemetria.nodos.length > 0 && (
              <PanelNodosOperacion
                nodos={telemetria.nodos}
                vuelos={telemetria.vuelos ?? []}
                onNodoClick={(id, codigo) => setSelectedEnvio({ tipo: 'nodo', id, codigo })}
              />
            )}

            {telemetria?.vuelos && telemetria.vuelos.length > 0 && (
              <PanelVuelosOperacion
                vuelos={telemetria.vuelos}
                onVueloClick={(id, codigo) => setSelectedEnvio({ tipo: 'vuelo', id, codigo })}
                origenFilter={vueloFilterOrigen}
                destinoFilter={vueloFilterDestino}
                onFilterChange={({ origen, destino }) => {
                  setVueloFilterOrigen(origen);
                  setVueloFilterDestino(destino);
                }}
              />
            )}

            <PanelEntregadosOperacion activo={true} />

            {selectedEnvio && (
              <PanelEnviosOperacion
                selectedEnvio={selectedEnvio}
                onClose={() => setSelectedEnvio(null)}
              />
            )}

            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setFormOpen(!formOpen)}
                  className="flex-1 flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-sm text-blue-900 dark:text-blue-100">Individual</span>
                  </div>
                  {formOpen ? <ChevronUp size={16} className="text-blue-600 dark:text-blue-400" /> : <ChevronDown size={16} className="text-blue-600 dark:text-blue-400" />}
                </button>
                <button
                  onClick={() => setCargaMasivaOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                >
                  <FileSpreadsheet size={16} className="text-green-600 dark:text-green-400" />
                  <span className="font-medium text-sm text-green-900 dark:text-green-100">Carga Masiva</span>
                </button>
                <button
                  onClick={() => { resetVueloForm(); setVueloFormOpen(!vueloFormOpen); }}
                  className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                >
                  <Plane size={16} className="text-purple-600 dark:text-purple-400" />
                  <span className="font-medium text-sm text-purple-900 dark:text-purple-100">
                    {editingVuelo ? 'Editando...' : 'Nuevo Vuelo'}
                  </span>
                </button>
              </div>

              {formOpen && (
                <form onSubmit={handleSubmit} className="space-y-3 mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <Select
                    label="Destino IATA"
                    placeholder={nodos.length === 0 ? 'No hay destinos disponibles' : 'Seleccionar destino'}
                    options={destinoOptions}
                    value={formData.destinoIata}
                    onChange={e => setFormData(prev => ({ ...prev, destinoIata: e.target.value }))}
                    error={formErrors.destinoIata}
                    disabled={nodos.length === 0}
                  />

                  <Input
                    label="Número de Maletas"
                    type="number"
                    placeholder="1"
                    min="1"
                    value={formData.cantidad}
                    onChange={e => setFormData(prev => ({ ...prev, cantidad: Math.max(1, parseInt(e.target.value) || 1) }))}
                    error={formErrors.cantidad}
                  />

                  {formError && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                      <XCircle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                      <span className="text-xs text-red-700 dark:text-red-300">{formError}</span>
                    </div>
                  )}

                  <Button type="submit" disabled={formLoading} className="w-full">
                    {formLoading ? 'Registrando...' : 'Registrar'}
                  </Button>
                </form>
              )}

              {vueloFormOpen && (
                <form onSubmit={handleVueloSubmit} className="space-y-3 mb-4 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800">
                  <h4 className="text-sm font-medium text-purple-900 dark:text-purple-100">
                    {editingVuelo ? 'Editar Vuelo' : 'Nuevo Vuelo'}
                  </h4>
                  <Input
                    label="Código Vuelo"
                    placeholder="LA2402"
                    value={vueloFormData.codigo_vuelo}
                    onChange={e => setVueloFormData(prev => ({ ...prev, codigo_vuelo: e.target.value }))}
                  />
                  <Select
                    label="Origen"
                    placeholder={nodos.length === 0 ? 'No hay nodos disponibles' : 'Seleccionar origen'}
                    options={nodos.map(n => ({ value: n.id, label: `${n.codigo_iata} - ${n.nombre}` }))}
                    value={vueloFormData.origen_id}
                    onChange={e => setVueloFormData(prev => ({ ...prev, origen_id: e.target.value }))}
                    disabled={nodos.length === 0}
                  />
                  <Select
                    label="Destino"
                    placeholder={nodos.length === 0 ? 'No hay nodos disponibles' : 'Seleccionar destino'}
                    options={nodos.map(n => ({ value: n.id, label: `${n.codigo_iata} - ${n.nombre}` }))}
                    value={vueloFormData.destino_id}
                    onChange={e => setVueloFormData(prev => ({ ...prev, destino_id: e.target.value }))}
                    disabled={nodos.length === 0}
                  />
                  <Input
                    label="Hora Salida"
                    type="datetime-local"
                    value={vueloFormData.hora_salida}
                    onChange={e => setVueloFormData(prev => ({ ...prev, hora_salida: e.target.value }))}
                  />
                  <Input
                    label="Hora Llegada"
                    type="datetime-local"
                    value={vueloFormData.hora_llegada}
                    onChange={e => setVueloFormData(prev => ({ ...prev, hora_llegada: e.target.value }))}
                  />
                  <Input
                    label="Capacidad de Carga"
                    type="number"
                    placeholder="200"
                    min="1"
                    value={vueloFormData.capacidad_carga}
                    onChange={e => setVueloFormData(prev => ({ ...prev, capacidad_carga: e.target.value }))}
                  />
                  {vueloFormError && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                      <XCircle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                      <span className="text-xs text-red-700 dark:text-red-300">{vueloFormError}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" disabled={vueloFormLoading} className="flex-1">
                      {vueloFormLoading ? 'Guardando...' : (editingVuelo ? 'Actualizar' : 'Crear')}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => { resetVueloForm(); setVueloFormOpen(false); }}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}

              {formSuccess && (
                <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                    <span className="font-medium text-sm text-green-900 dark:text-green-100">Equipaje registrado</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">ID Interno:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{formSuccess.id.slice(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Código:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{formSuccess.id_externo || formSuccess.id.slice(0, 8)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Estado:</span>
                      <Badge variant="green">{formSuccess.estado}</Badge>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mb-3 mt-4">
                <Package size={16} className="text-slate-400" />
                <h3 className="font-medium text-sm text-slate-700 dark:text-slate-300">
                  Equipajes Recientes
                </h3>
                <Badge variant="blue">{equipajesRecientes.length}</Badge>
              </div>

              <div className="space-y-2">
                {equipajesRecientes.map((eq, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700">
                      <Package size={14} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {eq.id_externo}
                        </span>
                        <Badge variant={estadoColor(eq.estado)}>{eq.estado.replace('_', ' ')}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">{eq.destino}</span>
                        <span className="text-xs text-slate-400">{eq.tiempo}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditarEquipaje(eq)}
                        className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500"
                        title="Editar equipaje"
                      >
                        <Package size={14} />
                      </button>
                      <button
                        onClick={() => handleEliminarEquipaje(eq.id_externo)}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                        title="Eliminar equipaje"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {vuelosEnRuta.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-3 mt-4">
                    <Plane size={16} className="text-slate-400" />
                    <h3 className="font-medium text-sm text-slate-700 dark:text-slate-300">
                      Vuelos en Ruta
                    </h3>
                    <Badge variant="blue">{vuelosEnRuta.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {vuelosEnRuta.map((vuelo) => {
                      const ocupacion = vuelo.capacidad_carga > 0
                        ? Math.round((1 - vuelo.carga_disponible / vuelo.capacidad_carga) * 100)
                        : 0;
                      return (
                        <div
                          key={vuelo.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="p-1.5 rounded-lg bg-blue-200 dark:bg-blue-700">
                            <Plane size={14} className="text-blue-600 dark:text-blue-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                              {vuelo.codigo_vuelo}
                            </div>
                            <div className="text-xs text-slate-500">
                              {vuelo.origen.codigo_iata} → {vuelo.destino.codigo_iata}
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-blue-500"
                                  style={{ width: `${Math.min(ocupacion, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                                {vuelo.carga_disponible}/{vuelo.capacidad_carga}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditarVuelo(vuelo)}
                              className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500"
                              title="Editar vuelo"
                            >
                              <Plane size={14} />
                            </button>
                            <button
                              onClick={() => handleEliminarVuelo(vuelo)}
                              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                              title="Eliminar vuelo"
                            >
                              <XCircle size={14} />
                            </button>
                            <button
                              onClick={() => handleDescargarManifiesto(vuelo)}
                              disabled={manifestLoading === vuelo.id}
                              className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-500 disabled:opacity-50"
                              title="Descargar manifiesto"
                            >
                              <Upload size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-400 text-center">
                Polling cada 5s — WebSocket + SSE en tiempo real
              </p>
            </div>
          </>
        )}
      </div>

      <Modal
        open={cargaMasivaOpen}
        onClose={handleCargaMasivaClose}
        title="Carga Masiva de Equipaje"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleCargaMasivaClose}>Cancelar</Button>
            <Button 
              onClick={handleConfirmarCargaMasiva} 
              disabled={!csvPreview || csvPreview.validos === 0 || csvConfirmLoading}
            >
              {csvConfirmLoading ? 'Confirmando...' : `Confirmar (${csvPreview?.validos || 0})`}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload size={32} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {csvFile ? csvFile.name : 'Subir archivo CSV'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Formato: destino_iata, cantidad
              </p>
            </label>
          </div>

          {csvLoading && (
            <div className="text-center text-sm text-slate-500">Procesando archivo...</div>
          )}

          {csvError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
              <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">{csvError}</span>
            </div>
          )}

          {csvPreview && (
            <div className="space-y-3">
              <div className="flex gap-4 text-sm">
                <span className="text-slate-600 dark:text-slate-400">Total: {csvPreview.total}</span>
                <div className="flex items-center gap-1">
                  <CheckCircle size={14} className="text-green-500" />
                  <span className="text-green-700 dark:text-green-400">Válidos: {csvPreview.validos}</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle size={14} className="text-yellow-500" />
                  <span className="text-yellow-700 dark:text-yellow-400">Con revisión: {csvPreview.con_revision}</span>
                </div>
              </div>

              {(() => {
                const registrosValidos = csvPreview.registros.filter(r => r.estado_validacion === 'VALIDO');
                const registrosRevision = csvPreview.registros.filter(r => r.estado_validacion === 'REVISION');
                return (
                  <>
                    {registrosValidos.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border rounded-lg">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                            <tr>
                              <th className="p-2 text-left">Fila</th>
                              <th className="p-2 text-left">Destino</th>
                              <th className="p-2 text-left">Maletas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {registrosValidos.slice(0, 10).map((row, i) => (
                              <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                                <td className="p-2">{row.fila}</td>
                                <td className="p-2">{row.destino_iata}</td>
                                <td className="p-2">{row.cantidad}</td>
                              </tr>
                            ))}
                            {registrosValidos.length > 10 && (
                              <tr className="border-t border-slate-200 dark:border-slate-700">
                                <td colSpan={3} className="p-2 text-center text-slate-500">
                                  ...y {registrosValidos.length - 10} más
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {registrosRevision.length > 0 && (
                      <div className="max-h-32 overflow-y-auto border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <table className="w-full text-xs">
                          <thead className="bg-yellow-50 dark:bg-yellow-900/30 sticky top-0">
                            <tr>
                              <th className="p-2 text-left">Fila</th>
                              <th className="p-2 text-left">Destino</th>
                              <th className="p-2 text-left">Motivo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {registrosRevision.map((row, i) => (
                              <tr key={i} className="border-t border-yellow-200 dark:border-yellow-800">
                                <td className="p-2">{row.fila}</td>
                                <td className="p-2">{row.destino_iata}</td>
                                <td className="p-2 text-red-600 dark:text-red-400">{row.motivo}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
