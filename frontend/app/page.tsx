"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Package, LogOut,
  RefreshCw,
  CheckCircle,
  XCircle,
  Plane,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  Play,
  Pause,
  Square,
  Clock,
  Settings,
  Activity,
  Luggage,
  Warehouse,
  FileText,
  X,
  BarChart3,
  ZoomIn,
  Download,
} from "lucide-react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { device } from "@/lib/device";
import { aeropuertoToEnMapa } from "@/lib/mock";
import { useTelemetria } from "@/lib/useTelemetria";
import { useMapaData, matchEstadoVuelo } from "@/lib/useMapaData";
import { useSimulacionSesion } from "@/lib/useSimulacionSesion";
import { useMode } from "@/lib/mode-context";
import { useFiltrosColor } from "@/lib/useFiltrosColor";
import { colorAeropuertoPorOcupacion, type ColorSemaforo } from "@/lib/colors";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { PanelAeropuertosOperacion } from "@/components/operacion/PanelAeropuertosOperacion";
import { PanelVuelosOperacion } from "@/components/operacion/PanelVuelosOperacion";
import SedePicker from "@/components/operacion/SedePicker";
import SetupOperacion from "@/components/operacion/SetupOperacion";
import { PanelEnviosMaletas } from "@/components/shared/PanelEnviosMaletas";
import { ModalEnvios, type SelectedEnvioConsolidado } from "@/components/shared/ModalEnvios";
import { PanelReporte } from "@/components/simulacion/PanelReporte";
import { SeccionCancelacion } from "@/components/simulacion/SeccionCancelacion";
import { PanelDetalleCancelaciones } from "@/components/simulacion/PanelDetalleCancelaciones";
import { RegistroEquipajePanel } from "@/components/simulacion/RegistroEquipajePanel";
import { SimulacionLoadingOverlay } from "@/components/simulacion/SimulacionLoadingOverlay";
import { PanelTabs } from "@/components/shared/PanelTabs";
import {
  ConfigUmbrales,
  type UmbralesConfig,
} from "@/components/mapa/ConfigUmbrales";
import DockIconos from "@/components/mapa/DockIconos";
import PanelFlotante from "@/components/mapa/PanelFlotante";
import BarraMetricasCompacta from "@/components/mapa/BarraMetricasCompacta";
import TiemposInfo from "@/components/mapa/TiemposInfo";
import CommandBarSimulacion from "@/components/mapa/CommandBarSimulacion";
import {
  formatearFechaHora,
  formatearFechaHoraSinSeg,
  formatDuracionHHMMSS,
} from "@/lib/formatearHora";
import { tzDeIata, tzAbrev } from "@/lib/timezone";
import type {
  Aeropuerto,
  Vuelo,
  VueloEnMapa,
  VueloPageResponse,
  AeropuertoEnMapa,
  CrearEquipajeResponse,
  CargaMasivaPreview,
  CargaMasivaConfirmResponse,
  ReporteOperacion,
  RutaDestacada,
  ResultadoCancelacion,
  SegmentoResponse,
  PlantillaResumen,
} from "@/lib/types";

const GeoMapa = dynamic(() => import("@/components/mapa/GeoMapa"), {
  ssr: false,
  loading: () => (
    <div className="bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center h-full">
      <span className="text-slate-600 text-sm">Cargando mapa...</span>
    </div>
  ),
});

function useReloj() {
  const [hora, setHora] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setHora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return hora;
}


export default function DashboardPage() {
  const { mode } = useMode();
  const [configUmbrales, setConfigUmbrales] = useState<UmbralesConfig>(() => {
    try {
      const saved = localStorage.getItem("umbrales-config");
      if (saved) {
        const p = JSON.parse(saved);
        if ("verdeMax" in p) return p;
      }
    } catch {
      /* ignore */
    }
    return { verdeMax: 70, ambarMax: 90 };
  });
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("umbrales-config", JSON.stringify(configUmbrales));
  }, [configUmbrales]);

  return (
    <div className="flex h-[calc(100vh-2.75rem)]">
      <div className="flex-1 flex flex-col">
        {/* Las pestañas Operación / Simulación / Colapso viven ahora en la barra superior (Navbar). */}
        <div className="flex-1 relative min-h-0">
          {mode === "operacion" ? (
            <OperacionView configUmbrales={configUmbrales} />
          ) : mode === "colapso" ? (
            <ColapsoView configUmbrales={configUmbrales} />
          ) : (
            <SimulacionView configUmbrales={configUmbrales} />
          )}
          <button
            onClick={() => setConfigOpen(!configOpen)}
            className="absolute bottom-4 right-4 z-40 p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Configurar umbrales"
          >
            <Settings
              size={18}
              className="text-slate-600 dark:text-slate-300"
            />
          </button>
          {configOpen && (
            <ConfigUmbrales
              config={configUmbrales}
              onConfigChange={setConfigUmbrales}
              onClose={() => setConfigOpen(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function OperacionView({ configUmbrales }: { configUmbrales: UmbralesConfig }) {
  const [sesionId, setSesionId] = useState<string | null>(null);
  const [estadoSesion, setEstadoSesion] = useState<
    "CONFIGURADA" | "EN_CURSO" | "PAUSADA" | "FINALIZADA"
  >("CONFIGURADA");
  const [operacionLoading, setOperacionLoading] = useState(false);
  const [aeropuertos, setAeropuertos] = useState<AeropuertoEnMapa[]>([]);
  const [allVuelos, setAllVuelos] = useState<VueloEnMapa[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [reporteOp, setReporteOp] = useState<ReporteOperacion | null>(null);
  const [inicioOperacionMs, setInicioOperacionMs] = useState(0);
  const [historialCargado, setHistorialCargado] = useState(false);

  const [stage, setStage] = useState<"picker" | "setup" | "mapa">(() => {
    const storedId = device.getAeropuertoRefId();
    if (!storedId) return "picker";
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem("operacion_setup_done_v1") === "1") return "mapa";
    return "setup";
  });
  const iataOperacion = stage === "picker" ? "" : (device.getAeropuertoRefId() || "");
  // El origen de todo registro/carga en operación es la sede seleccionada. Se
  // resuelve a su nodo (con id) desde la lista de aeropuertos para enviarlo en
  // el header X-Device-Nodo-Id que el backend exige.
  const nodoOrigen = useMemo(
    () => aeropuertos.find((n) => n.codigo_iata === iataOperacion) ?? null,
    [aeropuertos, iataOperacion],
  );
  // Zona horaria de la sede: referencia local del operador para las fechas/horas
  // generales del escenario día a día (reloj, inicio de jornada, etc.).
  const tzSede = useMemo(() => tzDeIata(iataOperacion), [iataOperacion]);

  const zonasHorarias = useMemo(() => {
    const m: Record<string, string> = {};
    aeropuertos.forEach(a => { if (a.zona_horaria) m[a.codigo_iata] = a.zona_horaria; });
    return m;
  }, [aeropuertos]);
  const tzOperacion = zonasHorarias[iataOperacion] ?? 'America/Lima';

  const handlePickSede = useCallback((iata: string) => {
    device.setAeropuertoRefId(iata);
    setStage("setup");
  }, []);

  const handleSetupListo = useCallback(async () => {
    try {
      await api.post<{ estado: string; sesion_id?: string }>("/operacion/iniciar", {});
      const ahoraMs = Date.now();
      setInicioOperacionMs(ahoraMs);
      localStorage.setItem("sesion_operacion_inicio", new Date(ahoraMs).toISOString());
    } catch {
      // If session already exists, GET /operacion/estado will sync state on mount
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem("operacion_setup_done_v1", "1");
    }
    setStage("mapa");
  }, []);

  const handleCambiarSede = useCallback(() => {
    device.setAeropuertoRefId("");
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem("operacion_setup_done_v1");
    }
    setStage("picker");
  }, []);

  const fetchHistoricos = useCallback(async (): Promise<boolean> => {
    try {
      const data = await api.get<Vuelo[]>("/vuelos/historicos");
      if (!data || data.length === 0) return false;
      const historicos: VueloEnMapa[] = data.map((v: Vuelo) => ({
        ...v,
        esHistorico: true,
      }));
      setAllVuelos((prev) => {
        const idsExistentes = new Set(prev.map((v) => v.id));
        const nuevos = historicos.filter((h) => !idsExistentes.has(h.id));
        if (nuevos.length === 0) return prev;
        return [...prev, ...nuevos];
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (stage !== "mapa" || historialCargado) return;
    const timer = setInterval(async () => {
      const ok = await fetchHistoricos();
      if (ok) {
        setHistorialCargado(true);
        clearInterval(timer);
      }
    }, 30_000);
    return () => clearInterval(timer);
  }, [stage, historialCargado, fetchHistoricos]);

  const [formData, setFormData] = useState({
    origenIata: "",
    destinoIata: "",
    cantidad: 1,
    clienteId: "",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState<CrearEquipajeResponse | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const [_cargaMasivaOpen, _setCargaMasivaOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CargaMasivaPreview | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);
  const [csvConfirmLoading, setCsvConfirmLoading] = useState(false);

  const { data: telemetria, connected: wsConnected } = useTelemetria(
    estadoSesion === "EN_CURSO" || estadoSesion === "PAUSADA",
  );
  const hora = useReloj();

  const opTelemetria = useMemo(
    () => (telemetria?.sesion_id ? undefined : telemetria),
    [telemetria],
  );

  useEffect(() => {
    api
      .get<{ estado: string; sesion_id?: string }>("/operacion/estado")
      .then((r) => {
        if (r.sesion_id) setSesionId(r.sesion_id);
        if (r.estado === "ACTIVO") setEstadoSesion("EN_CURSO");
        else if (r.estado === "PAUSADO") setEstadoSesion("PAUSADA");
        // Rescata el inicio de jornada tras una recarga, para no perder el
        // "transcurrido" mientras la operación sigue activa.
        if (r.estado === "ACTIVO" || r.estado === "PAUSADO") {
          const guardado = localStorage.getItem("sesion_operacion_inicio");
          const ms = guardado ? new Date(guardado).getTime() : NaN;
          if (!Number.isNaN(ms)) setInicioOperacionMs(ms);
        }
      })
      .catch(() => {});
  }, []);

  const k = 1;
  const animacionActiva =
    estadoSesion !== 'PAUSADA' &&
    wsConnected &&
    (opTelemetria?.vuelos?.some((v) => v.estado === "EN_RUTA") ?? false);

  const [dockAbiertas, setDockAbiertas] = useState<Set<string>>(new Set());
  const [dockCollapsed, setDockCollapsed] = useState(false);
  // Arrancan ocultos: el mapa inicia sin overlays levantados (re-abribles desde el dock).
  const [metricaVisibleOp, setMetricaVisibleOp] = useState(false);
  const [relojVisibleOp, setRelojVisibleOp] = useState(false);
  const [zoomVisibleOp, setZoomVisibleOp] = useState(false);
  const filtrosColor = useFiltrosColor();
  const [selectedEnvio, setSelectedEnvio] =
    useState<SelectedEnvioConsolidado | null>(null);
  const [vueloFilterOrigen, setVueloFilterOrigen] = useState("");
  const [vueloFilterDestino, setVueloFilterDestino] = useState("");
  const [equipajeFilter, setEquipajeFilter] = useState<
    "todos" | "con_equipaje" | "sin_equipaje"
  >("todos");
  const [seguidoVueloId, setSeguidoVueloId] = useState<string | null>(null);
  const [seguidoAeropuertoId, setSeguidoAeropuertoId] = useState<string | null>(
    null,
  );
  const [rutaDestacadaOp, setRutaDestacadaOp] = useState<RutaDestacada | null>(null);
  const [filtroContinenteOp, setFiltroContinenteOp] = useState<string>('');
  // Filtros por semáforo: viven en la vista para reflejarse en panel Y mapa.
  const [filtroColorAeroOp, setFiltroColorAeroOp] = useState<'' | ColorSemaforo>('');
  const [filtroColorVueloOp, setFiltroColorVueloOp] = useState<'' | ColorSemaforo>('');
  const [aeroSeleccionado, setAeroSeleccionado] = useState<string | null>(null);
  const [vueloSeleccionadoOp, setVueloSeleccionadoOp] = useState<string | null>(null);
  const [historialCancelOp, setHistorialCancelOp] = useState<ResultadoCancelacion[]>([]);
  const [showCancelDetalleOp, setShowCancelDetalleOp] = useState(false);
  const [selectedCancelDetalleOp, setSelectedCancelDetalleOp] = useState<string | null>(null);
  const [highlightedEquipajeIdOp, setHighlightedEquipajeIdOp] = useState<string | null>(null);
  const [plantillasOp, setPlantillasOp] = useState<PlantillaResumen[]>([]);
  const [realTimeMomentoOp, setRealTimeMomentoOp] = useState<string>(new Date().toISOString());

  useEffect(() => {
    const id = setInterval(() => setRealTimeMomentoOp(new Date().toISOString()), 5000);
    return () => clearInterval(id);
  }, []);

  const handleAeropuertoClickOp = useCallback((codigoIata: string) => {
    setAeroSeleccionado(codigoIata);
    setSeguidoAeropuertoId(codigoIata);
    setSeguidoVueloId(null);
  }, []);

  const handleVueloSeleccionadoOp = useCallback((id: string, _codigo: string) => {
    setVueloSeleccionadoOp(id);
  }, []);

  const handleMostrarRutaOp = useCallback((segmentos: SegmentoResponse[]) => {
    const vueloIds = segmentos.map(s => s.vuelo_codigo);
    const coordenadas: [number, number][] = [];
    for (const seg of segmentos) {
      const a = aeropuertos.find(a => a.codigo_iata === seg.nodo_origen);
      if (a) coordenadas.push([a.latitud, a.longitud]);
    }
    const ultimo = segmentos[segmentos.length - 1];
    const destAero = aeropuertos.find(a => a.codigo_iata === ultimo?.nodo_destino);
    if (destAero) coordenadas.push([destAero.latitud, destAero.longitud]);
    if (coordenadas.length >= 2) {
      setRutaDestacadaOp({ vueloIds, coordenadas });
    }
  }, [aeropuertos]);

  const fetchData = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const hoy = new Date();
      const yyyy = hoy.getUTCFullYear();
      const mm = String(hoy.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(hoy.getUTCDate()).padStart(2, "0");
      const baseDate = `${yyyy}-${mm}-${dd}`;
      const ahora = new Date();
      const wStart = `${baseDate}T${ahora.toISOString().slice(11, 19)}Z`;
      const wEnd = new Date(
        new Date(wStart).getTime() + 4 * 3600000,
      ).toISOString();
      const [aeropuertosData, vuelosData] = await Promise.all([
        api.get<Aeropuerto[]>("/nodos"),
        api.get<VueloPageResponse>(
          `/vuelos?size=100000&fecha_desde=${encodeURIComponent(wStart)}&fecha_hasta=${encodeURIComponent(wEnd)}`,
        ),
      ]);
      setAeropuertos(aeropuertosData.map(aeropuertoToEnMapa));
      setAllVuelos(
        vuelosData.content.map((v: Vuelo): VueloEnMapa => ({ ...v })),
      );
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setApiError(error.mensaje || error.message || "Error de conexion");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchData, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = () => {
      if (!document.hidden) fetchData();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  useEffect(() => {
    if (telemetria?.sesion_id) return;
    const t = opTelemetria;
    if (!t?.nodos || t.nodos.length === 0) return;
    const telemetriaAeropuertos: AeropuertoEnMapa[] = t.nodos.map(
      (n) => ({
        id: n.id,
        codigo_iata: n.codigo_iata,
        nombre: n.codigo_iata,
        latitud: n.lat,
        longitud: n.lon,
        capacidad_almacen: n.capacidad_almacen,
        ocupacion_actual: n.ocupacion_actual,
        zona_horaria: n.zona_horaria ?? "",
        color: colorAeropuertoPorOcupacion(n.ocupacion_pct, {
          verdeMax: configUmbrales.verdeMax,
          ambarMax: configUmbrales.ambarMax,
        }),
        ocupacionPorcentaje: n.ocupacion_pct,
        continente: n.continente,
      }),
    );
    queueMicrotask(() => {
      setAeropuertos(telemetriaAeropuertos);
    });
    if (t.vuelos && t.vuelos.length > 0) {
      const vuelosMapped = t.vuelos.map((v) => ({
        id: v.id,
        codigo_vuelo: v.codigo_vuelo,
        estado: matchEstadoVuelo(v.estado),
        origen: { id: "", codigo_iata: v.origen_iata, nombre: v.origen_iata },
        destino: {
          id: "",
          codigo_iata: v.destino_iata,
          nombre: v.destino_iata,
        },
        origen_lat: v.origen_lat,
        origen_lon: v.origen_lon,
        destino_lat: v.destino_lat,
        destino_lon: v.destino_lon,
        hora_salida: v.hora_salida || "",
        hora_llegada: v.hora_llegada || "",
        capacidad_carga: v.capacidad_carga,
        carga_disponible: v.carga_disponible,
        es_plantilla: false,
        fecha_operacion: "",
        posicionActual: { lat: v.lat_actual, lon: v.lon_actual },
        progreso: v.progreso,
      }));
      queueMicrotask(() => {
        setAllVuelos(vuelosMapped);
      });
      const plantillasMapped: PlantillaResumen[] = t.vuelos.map((v) => ({
        id: v.id,
        codigo_vuelo: v.codigo_vuelo,
        origen_iata: v.origen_iata,
        destino_iata: v.destino_iata,
        hora_salida: v.hora_salida || "",
        hora_llegada: v.hora_llegada || "",
        estado: matchEstadoVuelo(v.estado),
      }));
      queueMicrotask(() => {
        setPlantillasOp(plantillasMapped);
      });
    }
  }, [telemetria, configUmbrales]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormLoading(true);
    try {
      if (!nodoOrigen) {
        setFormError("Aeropuerto de origen (sede) no disponible. Recargue la página.");
        setFormLoading(false);
        return;
      }
      const response = await api.post<CrearEquipajeResponse>(
        "/equipajes",
        {
          destino_iata: formData.destinoIata,
          cantidad: formData.cantidad,
          cliente_id: formData.clienteId || undefined,
        },
        { "X-Device-Nodo-Id": nodoOrigen.id },
      );
      setFormSuccess(response);
      setFormData({ origenIata: "", destinoIata: "", cantidad: 1, clienteId: "" });
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setFormError(
        error.mensaje || error.message || "Error al registrar equipaje",
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!nodoOrigen) {
      setCsvError("Aeropuerto de origen (sede) no disponible. Recargue la página.");
      return;
    }
    setCsvFile(file);
    setCsvError(null);
    setCsvSuccess(null);
    setCsvLoading(true);
    try {
      const formData = new FormData();
      formData.append("archivo", file);
      const preview = await api.upload<CargaMasivaPreview>(
        "/equipajes/carga-masiva",
        formData,
        { "X-Device-Nodo-Id": nodoOrigen.id },
      );
      setCsvPreview(preview);
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setCsvError(
        error.mensaje || error.message || "Error al procesar archivo",
      );
      setCsvPreview(null);
    } finally {
      setCsvLoading(false);
    }
  };

  const handleConfirmarCargaMasiva = async () => {
    if (!csvPreview) return;
    if (!nodoOrigen) {
      setCsvError("Aeropuerto de origen (sede) no disponible. Recargue la página.");
      return;
    }
    setCsvConfirmLoading(true);
    setCsvError(null);
    setCsvSuccess(null);
    try {
      const res = await api.post<CargaMasivaConfirmResponse>(
        "/equipajes/carga-masiva/confirmar",
        {},
        { "X-Device-Nodo-Id": nodoOrigen.id },
      );
      setCsvFile(null);
      setCsvPreview(null);
      setCsvSuccess(
        `${res.ingresados} envíos ingresados${res.fallidos ? `, ${res.fallidos} fallidos` : ""}`,
      );
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setCsvError(error.mensaje || error.message || "Error al confirmar carga");
    } finally {
      setCsvConfirmLoading(false);
    }
  };

  const vuelosMapaFiltrados = useMemo(() => {
    const ahora = new Date();
    const nowMin = ahora.getUTCHours() * 60 + ahora.getUTCMinutes();
    const endMin = nowMin + 240;
    return allVuelos.filter((v) => {
      if (
        v.estado !== "PROGRAMADO" &&
        v.estado !== "EN_RUTA" &&
        v.estado !== "COMPLETADO"
      )
        return false;
      if (vueloFilterOrigen && v.origen.codigo_iata !== vueloFilterOrigen)
        return false;
      if (vueloFilterDestino && v.destino.codigo_iata !== vueloFilterDestino)
        return false;
      if (v.estado === "EN_RUTA" || v.estado === "COMPLETADO") return true;
      if (!v.hora_salida) return false;
      const hs = new Date(v.hora_salida);
      const hsMin = hs.getUTCHours() * 60 + hs.getUTCMinutes();
      return hsMin >= nowMin && hsMin < endMin;
    });
  }, [allVuelos, vueloFilterOrigen, vueloFilterDestino]);

  const destinoOptions = aeropuertos
    .filter((n) => n.codigo_iata)
    .map((n) => ({ value: n.codigo_iata, label: n.codigo_iata }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const handleIniciar = async () => {
    setOperacionLoading(true);
    setApiError(null);
    setReporteOp(null);
    try {
      const res = await api.post<{ estado: string; sesion_id?: string }>(
        "/operacion/iniciar", {}
      );
      if (res.sesion_id) setSesionId(res.sesion_id);
      setEstadoSesion("EN_CURSO");
      // Marca el inicio de la jornada; se persiste para sobrevivir recargas y lo
      // reutilizan los paneles que consultan "entregados desde".
      const ahoraMs = Date.now();
      setInicioOperacionMs(ahoraMs);
      localStorage.setItem(
        "sesion_operacion_inicio",
        new Date(ahoraMs).toISOString(),
      );
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      setApiError(e.mensaje || e.message || "Error al iniciar operación");
    } finally {
      setOperacionLoading(false);
    }
  };

  const handlePausar = async () => {
    setOperacionLoading(true);
    try {
      await api.post("/operacion/pausar", {});
      setEstadoSesion("PAUSADA");
    } catch {
      setApiError("Error al pausar operación");
    } finally {
      setOperacionLoading(false);
    }
  };

  const handleReanudar = async () => {
    setOperacionLoading(true);
    try {
      const res = await api.post<{ estado: string; sesion_id?: string }>(
        "/operacion/reanudar", {}
      );
      if (res.sesion_id) setSesionId(res.sesion_id);
      setEstadoSesion("EN_CURSO");
    } catch {
      setApiError("Error al reanudar operación");
    } finally {
      setOperacionLoading(false);
    }
  };

  const handleDetener = async () => {
    setOperacionLoading(true);
    setApiError(null);
    try {
      const res = await api.post<{ estado: string; sesion_id: string }>(
        "/operacion/detener", {}
      );
      void res;
      setSesionId(null);
      setEstadoSesion("FINALIZADA");
      setInicioOperacionMs(0);
      localStorage.removeItem("sesion_operacion_inicio");
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 600));
        try {
          const r = await api.get<ReporteOperacion>("/operacion/reporte");
          setReporteOp(r);
          break;
        } catch {
          /* report not ready yet */
        }
      }
    } catch {
      setApiError("Error al detener operación");
    } finally {
      setOperacionLoading(false);
    }
  };

  // Operacion real (sin sesion de simulacion): la cancelación resuelve
  // automaticamente la sesion EN_VIVO activa via /api/operacion/cancelacion.
  const handleCancelarVuelo = async (id: string, codigo: string) => {
    if (!confirm(`¿Cancelar vuelo ${codigo}?`)) return;
    const causaTexto = prompt("Causa de cancelación:", "Cancelación manual") ?? "Cancelación manual";
    try {
      await api.post("/operacion/cancelacion", {
        vuelo_id: id,
        causa: causaTexto,
      });
    } catch {
      alert("Error al cancelar vuelo");
    }
  };

  const ocupacionGlobal = useMemo(() => {
    const sumOcup = aeropuertos.reduce((s, a) => s + (a.ocupacion_actual || 0), 0);
    const sumCap = aeropuertos.reduce((s, a) => s + (a.capacidad_almacen || 0), 0);
    return sumCap > 0 ? (sumOcup / sumCap) * 100 : 0;
  }, [aeropuertos]);

  // Ocupación agregada de la flota de UT (criterios 84-85), con el mismo
  // semáforo que colorea los aviones en el mapa.
  const ocupacionFlota = useMemo(() => {
    const sumOcup = allVuelos.reduce(
      (s, v) => s + ((v.capacidad_carga || 0) - (v.carga_disponible || 0)),
      0,
    );
    const sumCap = allVuelos.reduce((s, v) => s + (v.capacidad_carga || 0), 0);
    return sumCap > 0 ? (sumOcup / sumCap) * 100 : 0;
  }, [allVuelos]);

  const metricasOpSim = opTelemetria?.metricas_sesion;

  const vuelosActivosOp = allVuelos.filter(
    (v) => v.estado === "EN_RUTA",
  ).length;
  const vuelosProgramadosOp = allVuelos.filter(
    (v) => v.estado === "PROGRAMADO",
  ).length;
  /*const vuelosEntregadosOp = allVuelos.filter(
    (v) => v.estado === "COMPLETADO",
  ).length;*/

  const vuelosFiltradosMapa = useMemo(() => {
    let lista = vuelosMapaFiltrados;
    // filtro equipaje
    if (equipajeFilter !== "todos") {
      lista = lista.filter((v) => {
        const tieneEquipaje = v.carga_disponible < v.capacidad_carga;
        return equipajeFilter === "con_equipaje"
          ? tieneEquipaje
          : !tieneEquipaje;
      });
    }
    return lista;
  }, [vuelosMapaFiltrados, equipajeFilter]);

  const toggleDockOp = useCallback((id: string) => {
    if (id === 'metricas') { setMetricaVisibleOp((v) => !v); return; }
    if (id === 'reloj') { setRelojVisibleOp((v) => !v); return; }
    if (id === 'zoom') { setZoomVisibleOp((v) => !v); return; }
    setDockAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const onDockActionOp = useCallback((id: string) => {
    if (id === 'cambiar-sede') handleCambiarSede();
  }, [handleCambiarSede]);

  const dockAbiertasOp = useMemo(() => {
    const s = new Set(dockAbiertas);
    if (metricaVisibleOp) s.add('metricas');
    if (relojVisibleOp) s.add('reloj');
    if (zoomVisibleOp) s.add('zoom');
    return s;
  }, [dockAbiertas, metricaVisibleOp, relojVisibleOp, zoomVisibleOp]);

  if (stage === "picker") {
    return <SedePicker onPick={handlePickSede} />;
  }
  if (stage === "setup") {
    return (
      <SetupOperacion
        iata={iataOperacion}
        onListo={handleSetupListo}
        onCambiarSede={handleCambiarSede}
      />
    );
  }

  return (
    <div className="relative h-full overflow-hidden">
      <GeoMapa
          aeropuertos={aeropuertos}
          vuelos={vuelosFiltradosMapa}
          mostrarAviones={true}
          animacionActiva={animacionActiva}
          k={k}
          className="h-full w-full"
          umbralesConfig={configUmbrales}
          cargando={aeropuertos.length === 0}
          seguidoVueloId={seguidoVueloId ?? undefined}
          onSalirSeguimiento={() => {
            setSeguidoVueloId(null);
            setSeguidoAeropuertoId(null);
          }}
          onSeguirVuelo={setSeguidoVueloId}
          seguidoAeropuertoId={seguidoAeropuertoId ?? undefined}
          onSalirSeguimientoAeropuerto={() => {
            setSeguidoAeropuertoId(null);
            setSeguidoVueloId(null);
          }}
          rutaDestacada={rutaDestacadaOp}
          onLimpiarRuta={() => setRutaDestacadaOp(null)}
          onAeropuertoClick={handleAeropuertoClickOp}
          onVueloSeleccionado={handleVueloSeleccionadoOp}
          continenteFiltro={filtroContinenteOp || undefined}
          filtroColorAeropuerto={filtroColorAeroOp || undefined}
          filtroColorVuelo={filtroColorVueloOp || undefined}
          coloresAeropuertoVisibles={filtrosColor.aeropuerto}
          coloresVueloVisibles={filtrosColor.vuelo}
          mostrarZoom={zoomVisibleOp}
          onCerrarZoom={() => setZoomVisibleOp(false)}
        >
          {metricaVisibleOp && (
            <BarraMetricasCompacta
              sla={metricasOpSim?.sla_acumulado_pct ?? 100}
              cancelados={metricasOpSim?.vuelos_cancelados ?? 0}
              replanificadas={metricasOpSim?.maletas_replanificadas ?? 0}
              ocupacionGlobal={ocupacionGlobal}
              ocupacionFlota={ocupacionFlota}
              verdeMax={configUmbrales.verdeMax}
              ambarMax={configUmbrales.ambarMax}
              vuelosActivos={vuelosActivosOp}
              vuelosProgramados={vuelosProgramadosOp}
              equipajeFilter={equipajeFilter}
              onEquipajeFilterChange={setEquipajeFilter}
              coloresAeropuerto={filtrosColor.aeropuerto}
              onToggleColorAeropuerto={filtrosColor.toggleAeropuerto}
              coloresVuelo={filtrosColor.vuelo}
              onToggleColorVuelo={filtrosColor.toggleVuelo}
              onClose={() => setMetricaVisibleOp(false)}
            />
          )}
          {relojVisibleOp && (
            <div className="absolute top-4 right-4 z-[1001] pointer-events-none">
              <div className="pointer-events-auto relative p-2 rounded-lg bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm shadow border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 min-w-[150px]">
                <button
                  onClick={() => setRelojVisibleOp(false)}
                  className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 shadow-sm z-10"
                >
                  <X size={10} />
                </button>
                <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-slate-200 dark:border-slate-600">
                  <Clock size={11} />
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    {formatearFechaHora(hora.toISOString(), tzSede)}
                  </span>
                  <span className="ml-auto text-[10px] font-mono text-slate-400" title={`Hora local de ${iataOperacion}`}>
                    {iataOperacion} · {tzAbrev(iataOperacion)}
                  </span>
                </div>
                {inicioOperacionMs > 0 && (
                  <>
                    <div className="flex justify-between gap-2">
                      <span>Inicio:</span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                        {formatearFechaHoraSinSeg(
                          new Date(inicioOperacionMs).toISOString(),
                          tzSede,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Transcurrido:</span>
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                        {formatDuracionHHMMSS(
                          Math.floor((hora.getTime() - inicioOperacionMs) / 1000),
                        )}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between gap-2">
                  <span>Estado:</span>
                  <span className={`inline-flex items-center gap-1 font-mono font-medium ${estadoSesion === "EN_CURSO" ? "text-green-600" : estadoSesion === "PAUSADA" ? "text-amber-600" : "text-slate-600"}`}>
                    {estadoSesion === "EN_CURSO" ? <Activity size={12} /> : estadoSesion === "PAUSADA" ? <Pause size={12} /> : estadoSesion === "FINALIZADA" ? <CheckCircle size={12} /> : <Settings size={12} />}
                    {estadoSesion === "EN_CURSO" ? "ACTIVO" : estadoSesion === "PAUSADA" ? "PAUSADO" : estadoSesion === "FINALIZADA" ? "FINALIZADO" : "INACTIVO"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span>WS:</span>
                  <span className={`font-mono font-medium ${wsConnected ? "text-green-600" : "text-red-500"}`}>
                    {wsConnected ? "Conectado" : "Desconectado"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </GeoMapa>


      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-[1002] flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg border border-slate-200 dark:border-slate-700 rounded-xl">
          <DockIconos
            secciones={[
              { id: 'aeropuertos', icon: Warehouse, label: 'Aeropuertos' },
              { id: 'vuelos', icon: Plane, label: 'Vuelos' },
              { id: 'envios', icon: Luggage, label: 'Envíos' },
              { id: 'manual-envio', icon: Package, label: 'Reg. manual' },
              { id: 'carga-txt', icon: FileSpreadsheet, label: 'Carga TXT' },
              { id: 'cancelacion', icon: XCircle, label: 'Cancelación' },
              { id: 'control', icon: Activity, label: 'Control' },
              { id: 'metricas', icon: BarChart3, label: 'Métricas' },
              { id: 'reloj', icon: Clock, label: 'Reloj' },
              { id: 'zoom', icon: ZoomIn, label: 'Zoom' },
              { id: 'cambiar-sede', icon: LogOut, label: 'Cambiar sede', variant: 'action' },
            ]}
            abiertas={dockAbiertasOp}
            onToggle={toggleDockOp}
            onAction={onDockActionOp}
            collapsed={dockCollapsed}
            onToggleCollapse={() => setDockCollapsed(!dockCollapsed)}
          />
        </div>

        <div className="absolute left-16 top-4 z-1001 flex flex-col gap-2 max-h-[calc(100vh-8rem)] overflow-y-auto pointer-events-none">
          {dockAbiertas.has('aeropuertos') && (
            <PanelFlotante
              title="Aeropuertos"
              onClose={() => toggleDockOp('aeropuertos')}
              className="w-[30rem] shrink-0 pointer-events-auto"
            >
              <PanelAeropuertosOperacion
                aeropuertos={opTelemetria?.nodos ?? []}
                vuelos={opTelemetria?.vuelos ?? []}
                onAeropuertoClick={() => {}}
                onSeguirEnMapa={(vueloId) => setSeguidoVueloId(vueloId)}
                onMostrarRuta={handleMostrarRutaOp}
                onVerEnMapa={(id) => {
                  setSeguidoAeropuertoId(id);
                  setSeguidoVueloId(null);
                }}
                seguidoId={seguidoAeropuertoId ?? undefined}
                seleccionadoId={aeroSeleccionado ?? undefined}
                filtroContinente={filtroContinenteOp}
                onFiltroContinenteChange={setFiltroContinenteOp}
                filtroColor={filtroColorAeroOp}
                onFiltroColorChange={setFiltroColorAeroOp}
              />
            </PanelFlotante>
          )}
          {dockAbiertas.has('vuelos') && (
            <PanelFlotante
              title="Vuelos"
              onClose={() => toggleDockOp('vuelos')}
              className="w-[30rem] shrink-0 pointer-events-auto"
            >
              <PanelVuelosOperacion
                vuelos={opTelemetria?.vuelos ?? []}
                onVueloClick={(id, codigo) =>
                  setSelectedEnvio({ tipo: "vuelo", id, codigo })
                }
                onDownloadManifiesto={async (id, codigo) => {
                  try {
                    const blob = await api.downloadBlob(`/manifiestos/${id}`);
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `manifiesto_${codigo}_${new Date().toISOString().split("T")[0]}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch {
                    alert("Error al descargar manifiesto");
                  }
                }}
                onCancelVuelo={handleCancelarVuelo}
                onVerEnMapa={(id) => {
                  setSeguidoVueloId(id);
                  setSeguidoAeropuertoId(null);
                }}
                seguidoId={seguidoVueloId ?? undefined}
                seleccionadoId={vueloSeleccionadoOp ?? undefined}
                filtroColor={filtroColorVueloOp}
                onFiltroColorChange={setFiltroColorVueloOp}
                origenFilter={vueloFilterOrigen}
                destinoFilter={vueloFilterDestino}
                onFilterChange={({ origen, destino }) => {
                  setVueloFilterOrigen(origen);
                  setVueloFilterDestino(destino);
                }}
              />
            </PanelFlotante>
          )}
          {dockAbiertas.has('envios') && (
            <PanelFlotante
              title="Envíos de Maletas"
              onClose={() => toggleDockOp('envios')}
              className="w-[30rem] shrink-0 pointer-events-auto"
            >
              <PanelEnviosMaletas
                nodos={aeropuertos.map((n) => ({
                  codigo_iata: n.codigo_iata,
                  nombre: n.nombre,
                }))}
                activo={estadoSesion === "EN_CURSO"}
                sesionId={sesionId ?? undefined}
                onSeguirEnMapa={(vueloId) => setSeguidoVueloId(vueloId)}
                onMostrarRuta={handleMostrarRutaOp}
              />
            </PanelFlotante>
          )}
          {dockAbiertas.has('control') && (
            <PanelFlotante
              title="Control"
              onClose={() => toggleDockOp('control')}
              className="w-[30rem] shrink-0 pointer-events-auto"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                    Operación en Vivo
                  </h2>
                  <button
                    onClick={fetchData}
                    disabled={loading}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-xs text-slate-600">WS {wsConnected ? "conectado" : "desconectado"}</span>
                </div>
                {estadoSesion === "EN_CURSO" ? (
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={handlePausar} disabled={operacionLoading} className="flex-1">
                      <Pause size={14} className="mr-1" />{operacionLoading ? "..." : "Pausar"}
                    </Button>
                    <Button variant="danger" size="sm" onClick={handleDetener} disabled={operacionLoading} className="flex-1">
                      <Square size={14} className="mr-1" />{operacionLoading ? "..." : "Detener"}
                    </Button>
                  </div>
                ) : estadoSesion === "PAUSADA" ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleReanudar} disabled={operacionLoading} className="flex-1">
                      <Play size={14} className="mr-1" />{operacionLoading ? "..." : "Reanudar"}
                    </Button>
                    <Button variant="danger" size="sm" onClick={handleDetener} disabled={operacionLoading} className="flex-1">
                      <Square size={14} className="mr-1" />{operacionLoading ? "..." : "Detener"}
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" onClick={handleIniciar} disabled={operacionLoading} className="w-full">
                    <Play size={14} className="mr-1" />{operacionLoading ? "..." : "Iniciar Jornada"}
                  </Button>
                )}
                {apiError && (
                  <div className="flex items-center gap-2 p-2 mt-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                    <XCircle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                    <span className="text-xs text-red-700 dark:text-red-300">{apiError}</span>
                  </div>
                )}
              </div>
            </PanelFlotante>
          )}
          {dockAbiertas.has('manual-envio') && (
            <PanelFlotante
              title="Registro manual de envío"
              onClose={() => toggleDockOp('manual-envio')}
              className="w-[30rem] shrink-0 pointer-events-auto"
            >
              <div className="p-4">
                <form onSubmit={handleSubmit} className="space-y-3 mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 mb-2">Origen: {iataOperacion} (sede actual)</p>
                  <Select label="Destino IATA" placeholder={aeropuertos.length === 0 ? "No hay destinos" : "Seleccionar destino"}
                    options={destinoOptions} value={formData.destinoIata}
                    onChange={(e) => setFormData((prev) => ({ ...prev, destinoIata: e.target.value }))}
                    disabled={aeropuertos.length === 0}
                  />
                  <Input label="Número de Maletas" type="number" min="1" value={formData.cantidad}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cantidad: Math.max(1, parseInt(e.target.value) || 1) }))}
                  />
                  <Input label="Cliente ID" type="text" placeholder="0007729"
                    onChange={(e) => setFormData((prev) => ({ ...prev, clienteId: e.target.value }))}
                  />
                  {formError && (<div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800"><XCircle size={14} className="text-red-600 dark:text-red-400" /><span className="text-xs text-red-700 dark:text-red-300">{formError}</span></div>)}
                  <Button type="submit" disabled={formLoading} className="w-full">{formLoading ? "Registrando..." : "Registrar"}</Button>
                </form>
                {formSuccess && (
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2"><CheckCircle size={16} className="text-green-600 dark:text-green-400" /><span className="font-medium text-sm text-green-900 dark:text-green-100">Equipaje registrado</span></div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">Código:</span><span className="font-medium text-slate-900 dark:text-slate-100">{formSuccess.id_externo || formSuccess.id.slice(0, 8)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">Estado:</span><Badge variant="green"><FileText size={11} className="mr-1" />{formSuccess.estado}</Badge></div>
                    </div>
                  </div>
                )}
              </div>
            </PanelFlotante>
          )}
          {dockAbiertas.has('carga-txt') && (
            <PanelFlotante
              title="Carga TXT de envíos"
              onClose={() => toggleDockOp('carga-txt')}
              className="w-[30rem] shrink-0 pointer-events-auto"
            >
              <div className="p-4 space-y-4">
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
                  <input type="file" accept=".csv,.txt" onChange={handleFileChange} className="hidden" id="csv-upload-op" />
                  <label htmlFor="csv-upload-op" className="cursor-pointer">
                    <Upload size={32} className="mx-auto text-slate-600 mb-2" />
                    <p className="text-sm text-slate-600 dark:text-slate-300">{csvFile ? csvFile.name : "Subir archivo TXT"}</p>
                  </label>
                </div>
                <div className="text-center">
                  <a href="/ejemplo-carga-masiva.csv" download
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline inline-flex items-center gap-1"
                  >
                    <Download size={12} />
                    Descargar ejemplo
                  </a>
                </div>
                {csvLoading && <div className="text-center text-sm text-slate-600">Procesando...</div>}
                {csvError && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                    <AlertTriangle size={16} />
                    <span className="text-sm text-red-700 dark:text-red-300">{csvError}</span>
                  </div>
                )}
                {csvSuccess && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                    <CheckCircle size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="text-sm text-green-700 dark:text-green-300">{csvSuccess}</span>
                  </div>
                )}
                {csvPreview && (
                  <div className="space-y-3">
                    <div className="flex gap-4 text-sm">
                      <span className="text-slate-600 dark:text-slate-300">Total: {csvPreview.total}</span>
                      <span className="text-green-700 dark:text-green-400">Válidos: {csvPreview.validos}</span>
                      <span className="text-yellow-700 dark:text-yellow-400">Revisión: {csvPreview.con_revision}</span>
                    </div>
                    <Button onClick={handleConfirmarCargaMasiva} disabled={csvPreview.validos === 0 || csvConfirmLoading} className="w-full">
                      {csvConfirmLoading ? "Confirmando..." : `Confirmar (${csvPreview.validos})`}
                    </Button>
                  </div>
                )}
              </div>
            </PanelFlotante>
          )}
          {dockAbiertas.has('cancelacion') && (
            <PanelFlotante
              title="Cancelación (plantillas)"
              onClose={() => toggleDockOp('cancelacion')}
              className="w-[40rem] shrink-0 pointer-events-auto"
            >
              {sesionId && plantillasOp.length > 0 ? (
                <SeccionCancelacion
                  plantillas={plantillasOp}
                  sesionId={sesionId}
                  momentoVirtual={realTimeMomentoOp}
                  timezone={tzOperacion}
                  aplicarReglaPlantilla={false}
                  onCancelado={(r) => {
                    setHistorialCancelOp(prev => [...prev, r]);
                    setShowCancelDetalleOp(true);
                    setSelectedCancelDetalleOp(null);
                  }}
                  onVerDetalleEnvio={(vueloId, vueloCodigo, equipajeId) => {
                    setSelectedEnvio({ tipo: 'vuelo', id: vueloId, codigo: vueloCodigo });
                    setHighlightedEquipajeIdOp(equipajeId);
                  }}
                  cancelEndpoint="/operacion/cancelacion"
                />
              ) : (
                <p className="text-xs text-slate-600 p-4">Sin plantillas disponibles</p>
              )}
            </PanelFlotante>
          )}
          {showCancelDetalleOp && (
            <PanelFlotante
              title="Cancelaciones registradas"
              onClose={() => setShowCancelDetalleOp(false)}
              className="w-[35rem] shrink-0 pointer-events-auto"
            >
              <PanelDetalleCancelaciones
                cancelaciones={historialCancelOp}
                selectedId={selectedCancelDetalleOp}
                onSelect={setSelectedCancelDetalleOp}
                onBack={() => setSelectedCancelDetalleOp(null)}
                timezone={tzOperacion}
                onVerDetalleEnvio={(vueloId, vueloCodigo, equipajeId) => {
                  setSelectedEnvio({ tipo: 'vuelo', id: vueloId, codigo: vueloCodigo });
                  setHighlightedEquipajeIdOp(equipajeId);
                }}
              />
            </PanelFlotante>
          )}
        </div>

        {selectedEnvio && (
          <ModalEnvios
            open={!!selectedEnvio}
            selectedEnvio={selectedEnvio}
            onClose={() => {
              setSelectedEnvio(null);
              setHighlightedEquipajeIdOp(null);
            }}
            onSeguirEnMapa={(vueloId) => setSeguidoVueloId(vueloId)}
            onMostrarRuta={handleMostrarRutaOp}
            highlightedEquipajeId={highlightedEquipajeIdOp}
          />
        )}

        {reporteOp && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 w-[28rem] max-h-[90vh] overflow-y-auto">
              <PanelReporte
                reporte={reporteOp}
                sesionId={reporteOp.sesion_id}
                onClose={() => setReporteOp(null)}
                esOperacion={true}
              />
            </div>
          </div>
        )}
    </div>
  );
}

function SimulacionView({
  configUmbrales,
}: {
  configUmbrales: UmbralesConfig;
}) {
  const {
    sesionId,
    estadoSesion,
    inicioRealMs,
    cancelResult,
    loading,
    error,
    finalizandoId,
    reporte,
    plantillas,
    simReady,
    simulacionConfig,
    metricas,
    telemetria,
    wsConnected,
    initialAeropuertos,
    initialVuelos,
    hora,
    currentDeviceId,
    sesionEnCurso,
    sesionPausada,
    isDuenioSesionActual,
    setSesionId,
    setEstadoSesion,
    setInicioRealMs,
    setSimulacionConfig,
    setCancelResult,
    setReporte,
    setLoading,
    setError,
    handleIniciar,
    handlePausar,
    handleReanudar,
    handleDetener,
    handleCancelarVuelo,
    adoptarSesion,
  } = useSimulacionSesion({ configUmbrales });

  const simTelemetria = useMemo(
    () => (telemetria?.sesion_id === sesionId ? telemetria : undefined),
    [telemetria, sesionId],
  );

  const [historialCancelSim, setHistorialCancelSim] = useState<ResultadoCancelacion[]>([]);
  const [showCancelDetalleSim, setShowCancelDetalleSim] = useState(false);
  const [selectedCancelDetalleSim, setSelectedCancelDetalleSim] = useState<string | null>(null);
  const [highlightedEquipajeIdSim, setHighlightedEquipajeIdSim] = useState<string | null>(null);

  // Estado de UI propio de esta vista (paneles, filtros, selección) — no compartido.
  const [dockAbiertas, setDockAbiertas] = useState<Set<string>>(new Set());
  const [dockCollapsed, setDockCollapsed] = useState(false);
  // Arrancan ocultos: el mapa inicia sin overlays levantados (re-abribles desde el dock).
  const [metricaVisibleSim, setMetricaVisibleSim] = useState(false);
  const [relojVisibleSim, setRelojVisibleSim] = useState(false);
  const [zoomVisibleSim, setZoomVisibleSim] = useState(false);
  const filtrosColor = useFiltrosColor();
  const [selectedEnvio, setSelectedEnvio] = useState<SelectedEnvioConsolidado | null>(
    null,
  );
  const [vueloFilterOrigen, setVueloFilterOrigen] = useState("");
  const [vueloFilterDestino, setVueloFilterDestino] = useState("");
  const [equipajeFilter, setEquipajeFilter] = useState<
    "todos" | "con_equipaje" | "sin_equipaje"
  >("todos");
  const [seguidoVueloId, setSeguidoVueloId] = useState<string | null>(null);
  const [seguidoAeropuertoId, setSeguidoAeropuertoId] = useState<string | null>(
    null,
  );
  const [rutaDestacadaSim, setRutaDestacadaSim] = useState<RutaDestacada | null>(null);
  const [aeroSeleccionadoSim, setAeroSeleccionadoSim] = useState<string | null>(null);
  const [vueloSeleccionadoSim, setVueloSeleccionadoSim] = useState<string | null>(null);
  const [filtroContinenteSim, setFiltroContinenteSim] = useState<string>('');
  // Filtros por semáforo: viven en la vista para reflejarse en panel Y mapa.
  const [filtroColorAeroSim, setFiltroColorAeroSim] = useState<'' | ColorSemaforo>('');
  const [filtroColorVueloSim, setFiltroColorVueloSim] = useState<'' | ColorSemaforo>('');

  // Datos del mapa desde una fuente única de verdad (WebSocket en vivo / REST en
  // vista previa). Lógica compartida con la vista de Colapso — ver useMapaData.
  const { aeropuertosMapa, vuelosMapa, vuelosVisibles } = useMapaData({
    telemetria,
    estadoSesion,
    sesionId,
    initialAeropuertos,
    initialVuelos,
    configUmbrales,
    vueloFilterOrigen,
    vueloFilterDestino,
    equipajeFilter,
  });

  const vuelosSimActivos = vuelosMapa.filter(
    (v) => v.estado === "EN_RUTA",
  ).length;
  const vuelosSimProgramados = vuelosMapa.filter(
    (v) => v.estado === "PROGRAMADO",
  ).length;

  const handleAeropuertoClickSim = useCallback((codigoIata: string) => {
    setAeroSeleccionadoSim(codigoIata);
    setSeguidoAeropuertoId(codigoIata);
    setSeguidoVueloId(null);
  }, []);

  const handleVueloSeleccionadoSim = useCallback((id: string, _codigo: string) => {
    setVueloSeleccionadoSim(id);
  }, []);

  const handleMostrarRutaSim = useCallback((segmentos: SegmentoResponse[]) => {
    const vueloIds = segmentos.map(s => s.vuelo_codigo);
    const coordenadas: [number, number][] = [];
    for (const seg of segmentos) {
      const a = aeropuertosMapa.find(a => a.codigo_iata === seg.nodo_origen);
      if (a) coordenadas.push([a.latitud, a.longitud]);
    }
    const ultimo = segmentos[segmentos.length - 1];
    const destAero = aeropuertosMapa.find(a => a.codigo_iata === ultimo?.nodo_destino);
    if (destAero) coordenadas.push([destAero.latitud, destAero.longitud]);
    if (coordenadas.length >= 2) {
      setRutaDestacadaSim({ vueloIds, coordenadas });
    }
  }, [aeropuertosMapa]);

  const k = useMemo(() => simTelemetria?.metricas_sesion?.k ?? 120, [simTelemetria]);
  const animacionActiva =
    estadoSesion !== 'PAUSADA' && wsConnected && (vuelosMapa.some((v) => v.estado === "EN_RUTA") ?? false);

  const ocupacionGlobal = useMemo(() => {
    const sumOcup = aeropuertosMapa.reduce((s, a) => s + (a.ocupacion_actual || 0), 0);
    const sumCap = aeropuertosMapa.reduce((s, a) => s + (a.capacidad_almacen || 0), 0);
    return sumCap > 0 ? (sumOcup / sumCap) * 100 : 0;
  }, [aeropuertosMapa]);

  // Ocupación agregada de la flota de UT (criterios 84-85), con el mismo
  // semáforo que colorea los aviones en el mapa.
  const ocupacionFlota = useMemo(() => {
    const sumOcup = vuelosMapa.reduce(
      (s, v) => s + ((v.capacidad_carga || 0) - (v.carga_disponible || 0)),
      0,
    );
    const sumCap = vuelosMapa.reduce((s, v) => s + (v.capacidad_carga || 0), 0);
    return sumCap > 0 ? (sumOcup / sumCap) * 100 : 0;
  }, [vuelosMapa]);

  const toggleDock = useCallback((id: string) => {
    if (id === 'metricas') { setMetricaVisibleSim((v) => !v); return; }
    if (id === 'reloj') { setRelojVisibleSim((v) => !v); return; }
    if (id === 'zoom') { setZoomVisibleSim((v) => !v); return; }
    if (id === 'cancel_log') { setShowCancelDetalleSim((v) => !v); return; }
    setDockAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const dockAbiertasSim = useMemo(() => {
    const s = new Set(dockAbiertas);
    if (metricaVisibleSim) s.add('metricas');
    if (relojVisibleSim) s.add('reloj');
    if (zoomVisibleSim) s.add('zoom');
    if (showCancelDetalleSim) s.add('cancel_log');
    return s;
  }, [dockAbiertas, metricaVisibleSim, relojVisibleSim, zoomVisibleSim, showCancelDetalleSim]);

  return (
    <div className="relative h-full overflow-hidden flex flex-col">
      <CommandBarSimulacion
        estado={estadoSesion}
        wsConnected={wsConnected}
        diaHoraVirtual={metricas?.dia_hora_virtual}
        loading={loading}
        finalizando={finalizandoId === sesionId}
        esDuenio={!!isDuenioSesionActual}
        onIniciar={handleIniciar}
        onPausar={handlePausar}
        onReanudar={handleReanudar}
        onDetener={() => {
          if (sesionId) handleDetener(sesionId);
        }}
        onAbrirConfig={() => toggleDock("sesion")}
      />
      <div className="relative flex-1 min-h-0 overflow-hidden">
      <GeoMapa
          aeropuertos={aeropuertosMapa}
          vuelos={vuelosVisibles}
          mostrarAviones={true}
          animacionActiva={animacionActiva}
          k={k}
          className="h-full w-full"
          umbralesConfig={configUmbrales}
          cargando={
            (!!sesionId || estadoSesion === "EN_CURSO") &&
            aeropuertosMapa.length === 0
          }
          seguidoVueloId={seguidoVueloId ?? undefined}
          onSalirSeguimiento={() => {
            setSeguidoVueloId(null);
            setSeguidoAeropuertoId(null);
          }}
          onSeguirVuelo={setSeguidoVueloId}
          seguidoAeropuertoId={seguidoAeropuertoId ?? undefined}
          onSalirSeguimientoAeropuerto={() => {
            setSeguidoAeropuertoId(null);
            setSeguidoVueloId(null);
          }}
          rutaDestacada={rutaDestacadaSim}
          onLimpiarRuta={() => setRutaDestacadaSim(null)}
          onAeropuertoClick={handleAeropuertoClickSim}
          onVueloSeleccionado={handleVueloSeleccionadoSim}
          continenteFiltro={filtroContinenteSim || undefined}
          filtroColorAeropuerto={filtroColorAeroSim || undefined}
          filtroColorVuelo={filtroColorVueloSim || undefined}
          coloresAeropuertoVisibles={filtrosColor.aeropuerto}
          coloresVueloVisibles={filtrosColor.vuelo}
          mostrarZoom={zoomVisibleSim}
          onCerrarZoom={() => setZoomVisibleSim(false)}
        >
          {metricaVisibleSim && (
            <BarraMetricasCompacta
              sla={metricas.sla_acumulado_pct ?? 100}
              cancelados={metricas.vuelos_cancelados}
              replanificadas={metricas.maletas_replanificadas}
              ocupacionGlobal={ocupacionGlobal}
              ocupacionFlota={ocupacionFlota}
              verdeMax={configUmbrales.verdeMax}
              ambarMax={configUmbrales.ambarMax}
              vuelosActivos={vuelosSimActivos}
              vuelosProgramados={vuelosSimProgramados}
              maletasEntregadas={metricas.maletas_entregadas}
              equipajeFilter={equipajeFilter}
              onEquipajeFilterChange={setEquipajeFilter}
              coloresAeropuerto={filtrosColor.aeropuerto}
              onToggleColorAeropuerto={filtrosColor.toggleAeropuerto}
              coloresVuelo={filtrosColor.vuelo}
              onToggleColorVuelo={filtrosColor.toggleVuelo}
              onClose={() => setMetricaVisibleSim(false)}
            />
          )}
          {relojVisibleSim && (
            <div className="absolute top-4 right-4 z-[1001] pointer-events-none">
              <TiemposInfo
                inicioRealMs={inicioRealMs}
                inicioSimuladoISO={`${simulacionConfig.fecha_inicio_virtual}T${simulacionConfig.hora_inicio_virtual}:00`}
                actualSimulado={metricas?.dia_hora_virtual ?? null}
                onClose={() => setRelojVisibleSim(false)}
              />
            </div>
          )}
        </GeoMapa>
        {sesionId && estadoSesion === "EN_CURSO" && !simReady && (
          <div className="absolute inset-0 z-50">
            <SimulacionLoadingOverlay visible={true} />
          </div>
        )}

        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-[1002] flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg border border-slate-200 dark:border-slate-700 rounded-xl">
          <DockIconos
            secciones={[
              { id: 'aeropuertos', icon: Warehouse, label: 'Aeropuertos' },
              { id: 'vuelos', icon: Plane, label: 'Vuelos' },
              { id: 'cancelacion', icon: XCircle, label: 'Cancelación' },
              { id: 'cancel_log', icon: AlertTriangle, label: 'Cancelaciones' },
              { id: 'registro', icon: Package, label: 'Registro Equipaje' },
              { id: 'envios', icon: Luggage, label: 'Envíos' },
              { id: 'sesion', icon: Settings, label: 'Sesión' },
              { id: 'reportes', icon: FileText, label: 'Reportes' },
              { id: 'metricas', icon: BarChart3, label: 'Métricas' },
              { id: 'reloj', icon: Clock, label: 'Reloj' },
              { id: 'zoom', icon: ZoomIn, label: 'Zoom' },
            ]}
            abiertas={dockAbiertasSim}
            onToggle={toggleDock}
            collapsed={dockCollapsed}
            onToggleCollapse={() => setDockCollapsed(!dockCollapsed)}
          />
        </div>

        <div className="absolute left-16 top-4 z-[1001] flex flex-col gap-2 max-h-[calc(100vh-8rem)] overflow-y-auto pointer-events-none">
          {dockAbiertas.has('aeropuertos') && (
            <PanelFlotante
              title="Aeropuertos"
              onClose={() => toggleDock('aeropuertos')}
              className="w-[30rem] shrink-0 pointer-events-auto"
            >
              {sesionId && estadoSesion !== "FINALIZADA" ? (
                <div className="p-4">
                  <PanelAeropuertosOperacion
                    aeropuertos={simTelemetria?.nodos ?? []}
                    vuelos={simTelemetria?.vuelos ?? []}
                    onVerEnvios={(iata) => setSelectedEnvio({ tipo: 'nodo', id: iata, codigo: iata })}
                    onAeropuertoClick={() => {}}
                    onSeguirEnMapa={(vueloId) => setSeguidoVueloId(vueloId)}
                    onMostrarRuta={handleMostrarRutaSim}
                    onVerEnMapa={(id) => {
                      setSeguidoAeropuertoId(id);
                      setSeguidoVueloId(null);
                    }}
                    seguidoId={seguidoAeropuertoId ?? undefined}
                    seleccionadoId={aeroSeleccionadoSim ?? undefined}
                    filtroContinente={filtroContinenteSim}
                    onFiltroContinenteChange={setFiltroContinenteSim}
                    filtroColor={filtroColorAeroSim}
                    onFiltroColorChange={setFiltroColorAeroSim}
                    sesionId={sesionId}
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-600 p-4">Sin sesión activa</p>
              )}
            </PanelFlotante>
          )}
          {dockAbiertas.has('vuelos') && (
            <PanelFlotante
              title="Vuelos"
              onClose={() => toggleDock('vuelos')}
              className="w-[30rem] shrink-0 pointer-events-auto"
            >
              <div className="p-4">
                <PanelVuelosOperacion
                  vuelos={simTelemetria?.vuelos ?? []}
                  onVueloClick={(id, codigo) =>
                    setSelectedEnvio({ tipo: "vuelo", id, codigo })
                  }
                  onDownloadManifiesto={async (id, codigo) => {
                    try {
                      const blob = await api.downloadBlob(`/manifiestos/${id}`);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `manifiesto_${codigo}_${new Date().toISOString().split("T")[0]}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch {
                      alert("Error al descargar manifiesto");
                    }
                  }}
                  onCancelVuelo={handleCancelarVuelo}
                  onVerEnMapa={(id) => {
                    setSeguidoVueloId(id);
                    setSeguidoAeropuertoId(null);
                  }}
                  seguidoId={seguidoVueloId ?? undefined}
                  seleccionadoId={vueloSeleccionadoSim ?? undefined}
                  filtroColor={filtroColorVueloSim}
                  onFiltroColorChange={setFiltroColorVueloSim}
                  origenFilter={vueloFilterOrigen}
                  destinoFilter={vueloFilterDestino}
                  onFilterChange={({ origen, destino }) => {
                    setVueloFilterOrigen(origen);
                    setVueloFilterDestino(destino);
                  }}
                />
              </div>
            </PanelFlotante>
          )}
          {dockAbiertas.has('cancelacion') && (
            <PanelFlotante
              title="Cancelación (plantillas)"
              onClose={() => toggleDock('cancelacion')}
              className="w-[40rem] shrink-0 pointer-events-auto"
            >
              {sesionId && plantillas.length > 0 ? (
                <SeccionCancelacion
                  plantillas={plantillas}
                  sesionId={sesionId}
                  momentoVirtual={metricas?.dia_hora_virtual ?? null}
                  onCancelado={(r) => {
                    setHistorialCancelSim(prev => [...prev, r]);
                    setShowCancelDetalleSim(true);
                    setSelectedCancelDetalleSim(null);
                  }}
                  onVerDetalleEnvio={(vueloId, vueloCodigo, equipajeId) => {
                    setSelectedEnvio({ tipo: 'vuelo', id: vueloId, codigo: vueloCodigo });
                    setHighlightedEquipajeIdSim(equipajeId);
                  }}
                />
              ) : (
                <p className="text-xs text-slate-600 p-4">Sin plantillas disponibles</p>
              )}
            </PanelFlotante>
          )}
          {showCancelDetalleSim && (
            <PanelFlotante
              title="Cancelaciones registradas"
              onClose={() => setShowCancelDetalleSim(false)}
              className="w-[35rem] shrink-0 pointer-events-auto"
            >
              <PanelDetalleCancelaciones
                cancelaciones={historialCancelSim}
                selectedId={selectedCancelDetalleSim}
                onSelect={setSelectedCancelDetalleSim}
                onBack={() => setSelectedCancelDetalleSim(null)}
                onVerDetalleEnvio={(vueloId, vueloCodigo, equipajeId) => {
                  setSelectedEnvio({ tipo: 'vuelo', id: vueloId, codigo: vueloCodigo });
                  setHighlightedEquipajeIdSim(equipajeId);
                }}
              />
            </PanelFlotante>
          )}
          {dockAbiertas.has('registro') && (
            <PanelFlotante
              title="Registro de Equipaje"
              onClose={() => toggleDock('registro')}
              className="w-[30rem] shrink-0 pointer-events-auto"
            >
              <RegistroEquipajePanel
                aeropuertos={aeropuertosMapa}
                sesionId={sesionId}
              />
            </PanelFlotante>
          )}
          {dockAbiertas.has('envios') && (
            <PanelFlotante
              title="Envíos de Maletas"
              onClose={() => toggleDock('envios')}
              className="w-[30rem] shrink-0 pointer-events-auto"
            >
              {sesionId && estadoSesion !== "FINALIZADA" ? (
                <PanelEnviosMaletas
                  sesionId={sesionId}
                  activo={estadoSesion === "EN_CURSO"}
                  nodos={aeropuertosMapa.map((n) => ({
                    codigo_iata: n.codigo_iata,
                    nombre: n.nombre,
                  }))}
                  onSeguirEnMapa={(vueloId) => setSeguidoVueloId(vueloId)}
                  onMostrarRuta={handleMostrarRutaSim}
                />
              ) : (
                <p className="text-xs text-slate-600 p-4">Sin sesión activa</p>
              )}
            </PanelFlotante>
          )}
          {dockAbiertas.has('sesion') && (
            <PanelFlotante
              title="Sesión"
              onClose={() => toggleDock('sesion')}
              className="w-[30rem] shrink-0 pointer-events-auto"
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-500" : "bg-red-500"}`}
                  />
                  <span className="text-xs text-slate-600">
                    WS {wsConnected ? "conectado" : "desconectado"}
                  </span>
                </div>
                {sesionEnCurso && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-xs text-blue-600 font-medium">
                      Activa: {sesionEnCurso.fecha_inicio_virtual}
                    </span>
                    {sesionEnCurso.dispositivo_id === currentDeviceId ? (
                      <>
                        <Button variant="danger" size="sm" disabled={finalizandoId === sesionEnCurso.id} onClick={() => handleDetener(sesionEnCurso.id)}>
                          <Square size={12} className="mr-1" />
                          {finalizandoId === sesionEnCurso.id ? "..." : "Detener"}
                        </Button>
                        <Button size="sm" onClick={() => adoptarSesion(sesionEnCurso)}>
                          <Play size={12} className="mr-1" />
                          Reanudar
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => adoptarSesion(sesionEnCurso)}>
                        <Play size={12} className="mr-1" />
                        Unirse
                      </Button>
                    )}
                  </div>
                )}
                {sesionPausada && !sesionEnCurso && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-xs text-yellow-600 font-medium">
                      Pausada: {sesionPausada.fecha_inicio_virtual}
                    </span>
                    {sesionPausada.dispositivo_id === currentDeviceId ? (
                      <>
                        <Button variant="danger" size="sm" disabled={finalizandoId === sesionPausada.id} onClick={() => handleDetener(sesionPausada.id)}>
                          <Square size={12} className="mr-1" />
                          {finalizandoId === sesionPausada.id ? "..." : "Detener"}
                        </Button>
                        <Button size="sm" onClick={async () => {
                          setSesionId(sesionPausada.id);
                          setSimulacionConfig({
                            fecha_inicio_virtual: sesionPausada.fecha_inicio_virtual,
                            hora_inicio_virtual: (sesionPausada.hora_inicio_virtual ?? "08:00").slice(0, 5),
                          });
                          setLoading(true);
                          setError("");
                          try {
                            await api.post(`/sesiones/${sesionPausada.id}/iniciar`, {});
                            setInicioRealMs(hora.getTime());
                            setEstadoSesion("EN_CURSO");
                          } catch (err: unknown) {
                            const e = err as { mensaje?: string; message?: string };
                            setError(e.mensaje || e.message || "Error al reanudar");
                          } finally { setLoading(false); }
                        }}>
                          <Play size={12} className="mr-1" />
                          Continuar
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => adoptarSesion(sesionPausada)}>
                        <Play size={12} className="mr-1" />
                        Unirse
                      </Button>
                    )}
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 p-2 mt-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                    <XCircle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                    <span className="text-xs text-red-700 dark:text-red-300">{error}</span>
                  </div>
                )}
              </div>
              {(estadoSesion === "EN_CURSO" || estadoSesion === "PAUSADA") && (
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    Sesión {sesionId?.slice(0, 8)}
                  </h3>
                  {isDuenioSesionActual ? (
                    <div className="flex gap-2">
                      {estadoSesion === "EN_CURSO" ? (
                        <Button variant="secondary" size="sm" onClick={handlePausar} disabled={loading} className="flex-1">
                          <Pause size={14} className="mr-1" />
                          Pausar
                        </Button>
                      ) : (
                        <Button size="sm" onClick={handleReanudar} disabled={loading} className="flex-1">
                          <Play size={14} className="mr-1" />
                          Reanudar
                        </Button>
                      )}
                      <Button variant="danger" size="sm" onClick={() => sesionId && handleDetener(sesionId)} disabled={finalizandoId === sesionId} className="flex-1">
                        <Square size={14} className="mr-1" />
                        Detener
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Vista de solo lectura</p>
                  )}
                </div>
              )}
              {(!sesionId || estadoSesion === "FINALIZADA") && (
                <div className="p-4 space-y-4">
                  <div className="space-y-3">
                    <Input label="Fecha virtual" type="date" value={simulacionConfig.fecha_inicio_virtual}
                      onChange={(e) => setSimulacionConfig({ ...simulacionConfig, fecha_inicio_virtual: e.target.value })}
                    />
                    <Input label="Hora virtual" type="time" value={simulacionConfig.hora_inicio_virtual}
                      onChange={(e) => setSimulacionConfig({ ...simulacionConfig, hora_inicio_virtual: e.target.value })}
                    />
                  </div>
                  <Button size="lg" onClick={handleIniciar} disabled={loading} className="w-full">
                    <Play size={18} className="mr-2" />
                    {loading ? "Creando..." : "Iniciar Simulación"}
                  </Button>
                </div>
              )}
            </PanelFlotante>
          )}
          {dockAbiertas.has('reportes') && (
            <PanelFlotante
              title="Reportes"
              onClose={() => toggleDock('reportes')}
              className="w-[30rem] shrink-0 pointer-events-auto"
            >
              {reporte ? (
                <div className="p-4">
                  <PanelReporte
                    reporte={reporte}
                    sesionId={sesionId ?? ""}
                    onClose={() => setReporte(null)}
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-600 p-4">No hay reportes disponibles</p>
              )}
            </PanelFlotante>
          )}
        </div>

        {selectedEnvio && sesionId && (
          <ModalEnvios
            open={!!selectedEnvio}
            selectedEnvio={selectedEnvio}
            onClose={() => {
              setSelectedEnvio(null);
              setHighlightedEquipajeIdSim(null);
            }}
            sesionId={sesionId}
            onSeguirEnMapa={(vueloId) => setSeguidoVueloId(vueloId)}
            onMostrarRuta={handleMostrarRutaSim}
            highlightedEquipajeId={highlightedEquipajeIdSim}
          />
        )}

        {cancelResult && (
          <Modal
            open={true}
            onClose={() => setCancelResult(null)}
            title={`Vuelo ${cancelResult.codigo} cancelado`}
            footer={
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setCancelResult(null)}>
                  Cerrar
                </Button>
                <Button onClick={async () => {
                  const blob = await api.downloadBlob(`/sesiones/${sesionId}/replanificaciones/${cancelResult.loteId}/pdf`);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `replanificacion_${cancelResult.loteId}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}>
                  Descargar PDF
                </Button>
              </div>
            }
          >
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              {cancelResult.equipajes.length} equipaje
              {cancelResult.equipajes.length !== 1 ? "s" : ""} afectado
              {cancelResult.equipajes.length !== 1 ? "s" : ""} y re-enrutado
              {cancelResult.equipajes.length !== 1 ? "s" : ""}.
            </p>
            {cancelResult.equipajes.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {cancelResult.equipajes.map((eq) => (
                  <div key={eq.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{eq.codigo}</span>
                    <span className="text-slate-600">{eq.origen_iata} → {eq.destino_iata}</span>
                  </div>
                ))}
              </div>
            )}
          </Modal>
        )}
      </div>
    </div>
  );
}

function ColapsoView({ configUmbrales }: { configUmbrales: UmbralesConfig }) {
  const {
    sesionId,
    estadoSesion,
    inicioRealMs,
    cancelResult,
    loading,
    error,
    finalizandoId,
    reporte,
    plantillas,
    simulacionConfig,
    metricas,
    telemetria,
    wsConnected,
    initialAeropuertos,
    initialVuelos,
    hora,
    currentDeviceId,
    sesionEnCurso,
    sesionPausada,
    isDuenioSesionActual,
    setSesionId,
    setEstadoSesion,
    setInicioRealMs,
    setSimulacionConfig,
    setCancelResult,
    setReporte,
    setLoading,
    setError,
    handleIniciar,
    handlePausar,
    handleReanudar,
    handleDetener,
    handleCancelarVuelo,
    adoptarSesion,
  } = useSimulacionSesion({ configUmbrales, tipoSimulacion: "HASTA_COLAPSO" });

  const simTelemetria = useMemo(
    () => (telemetria?.sesion_id === sesionId ? telemetria : undefined),
    [telemetria, sesionId],
  );

  const [historialCancelCol, setHistorialCancelCol] = useState<ResultadoCancelacion[]>([]);
  const [showCancelDetalleCol, setShowCancelDetalleCol] = useState(false);
  const [selectedCancelDetalleCol, setSelectedCancelDetalleCol] = useState<string | null>(null);
  const [highlightedEquipajeIdCol, setHighlightedEquipajeIdCol] = useState<string | null>(null);

  // Estado de UI propio de esta vista (paneles, filtros, selección) — no compartido.
  const [dockAbiertas, setDockAbiertas] = useState<Set<string>>(new Set());
  const [dockCollapsed, setDockCollapsed] = useState(false);
  // Arrancan ocultos: el mapa inicia sin overlays levantados (re-abribles desde el dock).
  const [metricaVisibleCol, setMetricaVisibleCol] = useState(false);
  const [relojVisibleCol, setRelojVisibleCol] = useState(false);
  const [zoomVisibleCol, setZoomVisibleCol] = useState(false);
  const filtrosColor = useFiltrosColor();
  const [selectedEnvio, setSelectedEnvio] = useState<SelectedEnvioConsolidado | null>(
    null,
  );
  const [vueloFilterOrigen, setVueloFilterOrigen] = useState("");
  const [vueloFilterDestino, setVueloFilterDestino] = useState("");
  const [equipajeFilter, setEquipajeFilter] = useState<
    "todos" | "con_equipaje" | "sin_equipaje"
  >("todos");
  const [seguidoVueloId, setSeguidoVueloId] = useState<string | null>(null);
  const [seguidoAeropuertoId, setSeguidoAeropuertoId] = useState<string | null>(
    null,
  );
  const [rutaDestacadaCol, setRutaDestacadaCol] = useState<RutaDestacada | null>(null);
  const [aeroSeleccionadoCol, setAeroSeleccionadoCol] = useState<string | null>(null);
  const [filtroContinenteCol, setFiltroContinenteCol] = useState<string>('');
  // Filtros por semáforo: viven en la vista para reflejarse en panel Y mapa.
  const [filtroColorAeroCol, setFiltroColorAeroCol] = useState<'' | ColorSemaforo>('');
  const [filtroColorVueloCol, setFiltroColorVueloCol] = useState<'' | ColorSemaforo>('');
  const [vueloSeleccionadoCol, setVueloSeleccionadoCol] = useState<string | null>(null);

  // Datos del mapa desde una fuente única de verdad (WebSocket en vivo / REST en
  // vista previa). Lógica compartida con la vista de Simulación — ver useMapaData.
  const { aeropuertosMapa, vuelosMapa, vuelosVisibles } = useMapaData({
    telemetria,
    estadoSesion,
    sesionId,
    initialAeropuertos,
    initialVuelos,
    configUmbrales,
    vueloFilterOrigen,
    vueloFilterDestino,
    equipajeFilter,
  });

  const vuelosColActivos = vuelosMapa.filter(
    (v) => v.estado === "EN_RUTA",
  ).length;
  const vuelosColProgramados = vuelosMapa.filter(
    (v) => v.estado === "PROGRAMADO",
  ).length;

  const ocupacionGlobal = useMemo(() => {
    const sumOcup = aeropuertosMapa.reduce((s, a) => s + (a.ocupacion_actual || 0), 0);
    const sumCap = aeropuertosMapa.reduce((s, a) => s + (a.capacidad_almacen || 0), 0);
    return sumCap > 0 ? (sumOcup / sumCap) * 100 : 0;
  }, [aeropuertosMapa]);

  // Ocupación agregada de la flota de UT (criterios 84-85), con el mismo
  // semáforo que colorea los aviones en el mapa.
  const ocupacionFlota = useMemo(() => {
    const sumOcup = vuelosMapa.reduce(
      (s, v) => s + ((v.capacidad_carga || 0) - (v.carga_disponible || 0)),
      0,
    );
    const sumCap = vuelosMapa.reduce((s, v) => s + (v.capacidad_carga || 0), 0);
    return sumCap > 0 ? (sumOcup / sumCap) * 100 : 0;
  }, [vuelosMapa]);

  const handleAeropuertoClickCol = useCallback((codigoIata: string) => {
    setAeroSeleccionadoCol(codigoIata);
    setSeguidoAeropuertoId(codigoIata);
    setSeguidoVueloId(null);
  }, []);

  const handleVueloSeleccionadoCol = useCallback((id: string, _codigo: string) => {
    setVueloSeleccionadoCol(id);
  }, []);

  const handleMostrarRutaCol = useCallback((segmentos: SegmentoResponse[]) => {
    const vueloIds = segmentos.map(s => s.vuelo_codigo);
    const coordenadas: [number, number][] = [];
    for (const seg of segmentos) {
      const a = aeropuertosMapa.find(a => a.codigo_iata === seg.nodo_origen);
      if (a) coordenadas.push([a.latitud, a.longitud]);
    }
    const ultimo = segmentos[segmentos.length - 1];
    const destAero = aeropuertosMapa.find(a => a.codigo_iata === ultimo?.nodo_destino);
    if (destAero) coordenadas.push([destAero.latitud, destAero.longitud]);
    if (coordenadas.length >= 2) {
      setRutaDestacadaCol({ vueloIds, coordenadas });
    }
  }, [aeropuertosMapa]);

  const k = useMemo(() => simTelemetria?.metricas_sesion?.k ?? 120, [simTelemetria]);
  const animacionActiva =
    estadoSesion !== 'PAUSADA' && wsConnected && (vuelosMapa.some((v) => v.estado === "EN_RUTA") ?? false);

  const toggleDock = useCallback((id: string) => {
    if (id === 'metricas') { setMetricaVisibleCol((v) => !v); return; }
    if (id === 'reloj') { setRelojVisibleCol((v) => !v); return; }
    if (id === 'zoom') { setZoomVisibleCol((v) => !v); return; }
    if (id === 'cancel_log') { setShowCancelDetalleCol((v) => !v); return; }
    setDockAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const dockAbiertasCol = useMemo(() => {
    const s = new Set(dockAbiertas);
    if (metricaVisibleCol) s.add('metricas');
    if (relojVisibleCol) s.add('reloj');
    if (zoomVisibleCol) s.add('zoom');
    if (showCancelDetalleCol) s.add('cancel_log');
    return s;
  }, [dockAbiertas, metricaVisibleCol, relojVisibleCol, zoomVisibleCol, showCancelDetalleCol]);

  return (
    <div className="relative h-full overflow-hidden flex flex-col">
      <CommandBarSimulacion
        estado={estadoSesion}
        wsConnected={wsConnected}
        diaHoraVirtual={metricas?.dia_hora_virtual}
        loading={loading}
        finalizando={finalizandoId === sesionId}
        esDuenio={!!isDuenioSesionActual}
        onIniciar={handleIniciar}
        onPausar={handlePausar}
        onReanudar={handleReanudar}
        onDetener={() => {
          if (sesionId) handleDetener(sesionId);
        }}
        onAbrirConfig={() => toggleDock("sesion")}
      />
      <div className="relative flex-1 min-h-0 overflow-hidden">
      <GeoMapa
          aeropuertos={aeropuertosMapa}
          vuelos={vuelosVisibles}
          mostrarAviones={true}
          animacionActiva={animacionActiva}
          k={k}
          className="h-full w-full"
          umbralesConfig={configUmbrales}
          cargando={
            (!!sesionId || estadoSesion === "EN_CURSO") &&
            aeropuertosMapa.length === 0
          }
          seguidoVueloId={seguidoVueloId ?? undefined}
          onSalirSeguimiento={() => {
            setSeguidoVueloId(null);
            setSeguidoAeropuertoId(null);
          }}
          onSeguirVuelo={setSeguidoVueloId}
          seguidoAeropuertoId={seguidoAeropuertoId ?? undefined}
          onSalirSeguimientoAeropuerto={() => {
            setSeguidoAeropuertoId(null);
            setSeguidoVueloId(null);
          }}
          rutaDestacada={rutaDestacadaCol}
          onLimpiarRuta={() => setRutaDestacadaCol(null)}
          onAeropuertoClick={handleAeropuertoClickCol}
          onVueloSeleccionado={handleVueloSeleccionadoCol}
          continenteFiltro={filtroContinenteCol || undefined}
          filtroColorAeropuerto={filtroColorAeroCol || undefined}
          filtroColorVuelo={filtroColorVueloCol || undefined}
          coloresAeropuertoVisibles={filtrosColor.aeropuerto}
          coloresVueloVisibles={filtrosColor.vuelo}
          mostrarZoom={zoomVisibleCol}
          onCerrarZoom={() => setZoomVisibleCol(false)}
        >
          {metricaVisibleCol && (
            <BarraMetricasCompacta
              sla={metricas.sla_acumulado_pct ?? 100}
              cancelados={metricas.vuelos_cancelados}
              replanificadas={metricas.maletas_replanificadas}
              ocupacionGlobal={ocupacionGlobal}
              ocupacionFlota={ocupacionFlota}
              verdeMax={configUmbrales.verdeMax}
              ambarMax={configUmbrales.ambarMax}
              vuelosActivos={vuelosColActivos}
              vuelosProgramados={vuelosColProgramados}
              maletasEntregadas={metricas.maletas_entregadas}
              equipajeFilter={equipajeFilter}
              onEquipajeFilterChange={setEquipajeFilter}
              coloresAeropuerto={filtrosColor.aeropuerto}
              onToggleColorAeropuerto={filtrosColor.toggleAeropuerto}
              coloresVuelo={filtrosColor.vuelo}
              onToggleColorVuelo={filtrosColor.toggleVuelo}
              onClose={() => setMetricaVisibleCol(false)}
            />
          )}
          {relojVisibleCol && (
            <div className="absolute top-4 right-4 z-[1001] pointer-events-none">
              <TiemposInfo
                inicioRealMs={inicioRealMs}
                inicioSimuladoISO={`${simulacionConfig.fecha_inicio_virtual}T${simulacionConfig.hora_inicio_virtual}:00`}
                actualSimulado={metricas?.dia_hora_virtual ?? null}
                onClose={() => setRelojVisibleCol(false)}
              />
            </div>
          )}
        </GeoMapa>

        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-[1002] flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg border border-slate-200 dark:border-slate-700 rounded-xl">
          <DockIconos
            secciones={[
              { id: 'sesion', icon: Settings, label: 'Sesión' },
              { id: 'vuelos', icon: Plane, label: 'Vuelos' },
              { id: 'cancelacion', icon: XCircle, label: 'Cancelación' },
              { id: 'cancel_log', icon: AlertTriangle, label: 'Cancelaciones' },
              { id: 'reportes', icon: FileText, label: 'Reportes' },
              { id: 'metricas', icon: BarChart3, label: 'Métricas' },
              { id: 'reloj', icon: Clock, label: 'Reloj' },
              { id: 'zoom', icon: ZoomIn, label: 'Zoom' },
            ]}
            abiertas={dockAbiertasCol}
            onToggle={toggleDock}
            collapsed={dockCollapsed}
            onToggleCollapse={() => setDockCollapsed(!dockCollapsed)}
          />
        </div>

        <div className="absolute left-16 top-4 z-[1001] flex flex-col gap-2 max-h-[calc(100vh-8rem)] overflow-y-auto pointer-events-none">
          {dockAbiertas.has('sesion') && (
            <PanelFlotante
              title="Sesión"
              onClose={() => toggleDock('sesion')}
              className="w-[30rem] shrink-0 pointer-events-auto"
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-500" : "bg-red-500"}`}
                  />
                  <span className="text-xs text-slate-600">
                    WS {wsConnected ? "conectado" : "desconectado"}
                  </span>
                </div>
                {sesionEnCurso && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-xs text-blue-600 font-medium">
                      Activa: {sesionEnCurso.fecha_inicio_virtual}
                    </span>
                    {sesionEnCurso.dispositivo_id === currentDeviceId ? (
                      <>
                        <Button variant="danger" size="sm" disabled={finalizandoId === sesionEnCurso.id} onClick={() => handleDetener(sesionEnCurso.id)}>
                          <Square size={12} className="mr-1" />
                          {finalizandoId === sesionEnCurso.id ? "..." : "Detener"}
                        </Button>
                        <Button size="sm" onClick={() => adoptarSesion(sesionEnCurso)}>
                          <Play size={12} className="mr-1" />
                          Reanudar
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => adoptarSesion(sesionEnCurso)}>
                        <Play size={12} className="mr-1" />
                        Unirse
                      </Button>
                    )}
                  </div>
                )}
                {sesionPausada && !sesionEnCurso && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-xs text-yellow-600 font-medium">
                      Pausada: {sesionPausada.fecha_inicio_virtual}
                    </span>
                    {sesionPausada.dispositivo_id === currentDeviceId ? (
                      <>
                        <Button variant="danger" size="sm" disabled={finalizandoId === sesionPausada.id} onClick={() => handleDetener(sesionPausada.id)}>
                          <Square size={12} className="mr-1" />
                          {finalizandoId === sesionPausada.id ? "..." : "Detener"}
                        </Button>
                        <Button size="sm" onClick={async () => {
                          setSesionId(sesionPausada.id);
                          setSimulacionConfig({
                            fecha_inicio_virtual: sesionPausada.fecha_inicio_virtual,
                            hora_inicio_virtual: (sesionPausada.hora_inicio_virtual ?? "08:00").slice(0, 5),
                          });
                          setLoading(true);
                          setError("");
                          try {
                            await api.post(`/sesiones/${sesionPausada.id}/iniciar`, {});
                            setInicioRealMs(hora.getTime());
                            setEstadoSesion("EN_CURSO");
                          } catch (err: unknown) {
                            const e = err as { mensaje?: string; message?: string };
                            setError(e.mensaje || e.message || "Error al reanudar");
                          } finally { setLoading(false); }
                        }}>
                          <Play size={12} className="mr-1" />
                          Continuar
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => adoptarSesion(sesionPausada)}>
                        <Play size={12} className="mr-1" />
                        Unirse
                      </Button>
                    )}
                  </div>
                )}
                {error && (
                  <div className="flex items-center gap-2 p-2 mt-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                    <XCircle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                    <span className="text-xs text-red-700 dark:text-red-300">{error}</span>
                  </div>
                )}
              </div>
              {(estadoSesion === "EN_CURSO" || estadoSesion === "PAUSADA") && (
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    Sesión {sesionId?.slice(0, 8)}
                  </h3>
                  {isDuenioSesionActual ? (
                    <div className="flex gap-2">
                      {estadoSesion === "EN_CURSO" ? (
                        <Button variant="secondary" size="sm" onClick={handlePausar} disabled={loading} className="flex-1">
                          <Pause size={14} className="mr-1" />
                          Pausar
                        </Button>
                      ) : (
                        <Button size="sm" onClick={handleReanudar} disabled={loading} className="flex-1">
                          <Play size={14} className="mr-1" />
                          Reanudar
                        </Button>
                      )}
                      <Button variant="danger" size="sm" onClick={() => sesionId && handleDetener(sesionId)} disabled={finalizandoId === sesionId} className="flex-1">
                        <Square size={14} className="mr-1" />
                        Detener
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Vista de solo lectura</p>
                  )}
                </div>
              )}
              {(!sesionId || estadoSesion === "FINALIZADA" || estadoSesion === "COLAPSADA") && (
                <div className="p-4 space-y-4">
                  {(estadoSesion === "FINALIZADA" || estadoSesion === "COLAPSADA") && reporte && (
                    <PanelReporte
                      reporte={reporte}
                      sesionId={sesionId ?? ""}
                      onClose={() => setReporte(null)}
                    />
                  )}
                  {estadoSesion === "COLAPSADA" && !reporte && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                      <AlertTriangle size={14} className="text-red-600 dark:text-red-400" />
                      <span className="text-xs text-red-700 dark:text-red-300">
                        Generando reporte de colapso...
                      </span>
                    </div>
                  )}
                  {estadoSesion === "FINALIZADA" && !reporte && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <CheckCircle size={14} className="text-slate-600" />
                      <span className="text-xs text-slate-600">Generando reporte...</span>
                    </div>
                  )}
                  {(!sesionId || !reporte) && (
                    <>
                      {(!sesionId || (estadoSesion !== "FINALIZADA" && estadoSesion !== "COLAPSADA")) && (
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                              Modo: HASTA COLAPSO
                            </span>
                          </div>
                          <p className="text-sm text-amber-600 dark:text-amber-400">
                            La simulación se detendrá automáticamente cuando un almacén supere su capacidad máxima.
                          </p>
                        </div>
                      )}
                      <div className="space-y-3">
                        <Input label="Fecha virtual" type="date" value={simulacionConfig.fecha_inicio_virtual}
                          onChange={(e) => setSimulacionConfig({ ...simulacionConfig, fecha_inicio_virtual: e.target.value })}
                        />
                        <Input label="Hora virtual" type="time" value={simulacionConfig.hora_inicio_virtual}
                          onChange={(e) => setSimulacionConfig({ ...simulacionConfig, hora_inicio_virtual: e.target.value })}
                        />
                      </div>
                      <Button size="lg" onClick={handleIniciar} disabled={loading} className="w-full">
                        <Play size={18} className="mr-2" />
                        {loading ? "Creando..." : "Iniciar Simulación"}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </PanelFlotante>
          )}

          {dockAbiertas.has('vuelos') && (
            <PanelFlotante
              title="Vuelos"
              onClose={() => toggleDock('vuelos')}
              className="w-[30rem] shrink-0 pointer-events-auto"
            >
              {sesionId && estadoSesion !== "FINALIZADA" && estadoSesion !== "COLAPSADA" ? (
                <PanelTabs
                  aeropuertos={simTelemetria?.nodos ?? []}
                  vuelosAeropuerto={simTelemetria?.vuelos ?? []}
                  onAeropuertoClick={() => {}}
                  vuelos={simTelemetria?.vuelos ?? []}
                  onVueloClick={(id, codigo) =>
                    setSelectedEnvio({ tipo: "vuelo", id, codigo })
                  }
                  onDownloadManifiesto={async (id, codigo) => {
                    try {
                      const blob = await api.downloadBlob(`/manifiestos/${id}`);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `manifiesto_${codigo}_${new Date().toISOString().split("T")[0]}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } catch {
                      alert("Error al descargar manifiesto");
                    }
                  }}
                  onVerEnMapa={(id) => {
                    setSeguidoVueloId(id);
                    setSeguidoAeropuertoId(null);
                  }}
                  seguidoVueloId={seguidoVueloId ?? undefined}
                  onAeropuertoVerEnMapa={(id) => {
                    setSeguidoAeropuertoId(id);
                    setSeguidoVueloId(null);
                  }}
                  seguidoAeropuertoId={seguidoAeropuertoId ?? undefined}
                  aeropuertoSeleccionadoId={aeroSeleccionadoCol ?? undefined}
                  vueloSeleccionadoId={vueloSeleccionadoCol ?? undefined}
                  onCancelVuelo={handleCancelarVuelo}
                  vueloFilterOrigen={vueloFilterOrigen}
                  vueloFilterDestino={vueloFilterDestino}
                  onVueloFilterChange={({ origen, destino }) => {
                    setVueloFilterOrigen(origen);
                    setVueloFilterDestino(destino);
                  }}
                  sesionId={sesionId}
                  enviosActivo={estadoSesion === "EN_CURSO"}
                  nodos={aeropuertosMapa.map((n) => ({
                    codigo_iata: n.codigo_iata,
                    nombre: n.nombre,
                  }))}
                  onSeguirEnMapa={(vueloId) => setSeguidoVueloId(vueloId)}
                  onMostrarRuta={handleMostrarRutaCol}
                  filtroContinente={filtroContinenteCol}
                  onFiltroContinenteChange={setFiltroContinenteCol}
                  filtroColorAeropuerto={filtroColorAeroCol}
                  onFiltroColorAeropuertoChange={setFiltroColorAeroCol}
                  filtroColorVuelo={filtroColorVueloCol}
                  onFiltroColorVueloChange={setFiltroColorVueloCol}
                />
              ) : (
                <p className="text-xs text-slate-600 p-4">Sin sesión activa</p>
              )}
            </PanelFlotante>
          )}

          {dockAbiertas.has('cancelacion') && (
            <PanelFlotante
              title="Cancelación (plantillas)"
              onClose={() => toggleDock('cancelacion')}
              className="w-[40rem] shrink-0 pointer-events-auto"
            >
              {sesionId && plantillas.length > 0 ? (
                <SeccionCancelacion
                  plantillas={plantillas}
                  sesionId={sesionId}
                  momentoVirtual={metricas?.dia_hora_virtual ?? null}
                  onCancelado={(r) => {
                    setHistorialCancelCol(prev => [...prev, r]);
                    setShowCancelDetalleCol(true);
                    setSelectedCancelDetalleCol(null);
                  }}
                  onVerDetalleEnvio={(vueloId, vueloCodigo, equipajeId) => {
                    setSelectedEnvio({ tipo: 'vuelo', id: vueloId, codigo: vueloCodigo });
                    setHighlightedEquipajeIdCol(equipajeId);
                  }}
                />
              ) : (
                <p className="text-xs text-slate-600 p-4">Sin plantillas disponibles</p>
              )}
            </PanelFlotante>
          )}

          {showCancelDetalleCol && (
            <PanelFlotante
              title="Cancelaciones registradas"
              onClose={() => setShowCancelDetalleCol(false)}
              className="w-[35rem] shrink-0 pointer-events-auto"
            >
              <PanelDetalleCancelaciones
                cancelaciones={historialCancelCol}
                selectedId={selectedCancelDetalleCol}
                onSelect={setSelectedCancelDetalleCol}
                onBack={() => setSelectedCancelDetalleCol(null)}
                onVerDetalleEnvio={(vueloId, vueloCodigo, equipajeId) => {
                  setSelectedEnvio({ tipo: 'vuelo', id: vueloId, codigo: vueloCodigo });
                  setHighlightedEquipajeIdCol(equipajeId);
                }}
              />
            </PanelFlotante>
          )}

          {dockAbiertas.has('reportes') && (
            <PanelFlotante
              title="Reportes"
              onClose={() => toggleDock('reportes')}
              className="w-[30rem] shrink-0 pointer-events-auto"
            >
              {reporte ? (
                <div className="p-4">
                  <PanelReporte
                    reporte={reporte}
                    sesionId={sesionId ?? ""}
                    onClose={() => setReporte(null)}
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-600 p-4">No hay reportes disponibles</p>
              )}
            </PanelFlotante>
          )}
        </div>

        {selectedEnvio && sesionId && (
          <ModalEnvios
            open={!!selectedEnvio}
            selectedEnvio={selectedEnvio}
            onClose={() => {
              setSelectedEnvio(null);
              setHighlightedEquipajeIdCol(null);
            }}
            sesionId={sesionId}
            onSeguirEnMapa={(vueloId) => setSeguidoVueloId(vueloId)}
            onMostrarRuta={handleMostrarRutaCol}
            highlightedEquipajeId={highlightedEquipajeIdCol}
          />
        )}

        {cancelResult && (
          <Modal
            open={true}
            onClose={() => setCancelResult(null)}
            title={`Vuelo ${cancelResult.codigo} cancelado`}
            footer={
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setCancelResult(null)}>
                  Cerrar
                </Button>
                <Button onClick={async () => {
                  const blob = await api.downloadBlob(`/sesiones/${sesionId}/replanificaciones/${cancelResult.loteId}/pdf`);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `replanificacion_${cancelResult.loteId}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}>
                  Descargar PDF
                </Button>
              </div>
            }
          >
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              {cancelResult.equipajes.length} equipaje
              {cancelResult.equipajes.length !== 1 ? "s" : ""} afectado
              {cancelResult.equipajes.length !== 1 ? "s" : ""} y re-enrutado
              {cancelResult.equipajes.length !== 1 ? "s" : ""}.
            </p>
            {cancelResult.equipajes.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {cancelResult.equipajes.map((eq) => (
                  <div
                    key={eq.id}
                    className="flex items-center justify-between text-xs px-2 py-1 rounded bg-slate-50 dark:bg-slate-800/50"
                  >
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {eq.codigo}
                    </span>
                    <span className="text-slate-600">
                      {eq.origen_iata} → {eq.destino_iata}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Modal>
        )}
      </div>
      </div>
    );
  };
