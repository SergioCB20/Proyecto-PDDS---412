"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  Package,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Plane,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  Menu,
  ChevronLeft,
  Play,
  Pause,
  Square,
  Clock,
  Settings,
  Activity,
  Luggage,
  Warehouse,
  FileText,
  Filter,
} from "lucide-react";
import dynamic from "next/dynamic";
import { api, fetchReporte } from "@/lib/api";
import { aeropuertoToEnMapa } from "@/lib/mock";
import { useTelemetria } from "@/lib/useTelemetria";
import { colorAeropuertoPorOcupacion, determinarColorSemaforo, type ColorSemaforo } from "@/lib/colors";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { PanelEnviosOperacion } from "@/components/operacion/PanelEnviosOperacion";
import { PanelAeropuertosOperacion } from "@/components/operacion/PanelAeropuertosOperacion";
import { PanelVuelosOperacion } from "@/components/operacion/PanelVuelosOperacion";
import { PanelEnviosMaletas } from "@/components/shared/PanelEnviosMaletas";
import { PanelEnvios } from "@/components/simulacion/PanelEnvios";
import { PanelReporte } from "@/components/simulacion/PanelReporte";
import { SeccionCancelacion } from "@/components/simulacion/SeccionCancelacion";
import { SimulacionLoadingOverlay } from "@/components/simulacion/SimulacionLoadingOverlay";
import { PanelTabs } from "@/components/shared/PanelTabs";
import {
  ConfigUmbrales,
  type UmbralesConfig,
} from "@/components/mapa/ConfigUmbrales";
import type { SelectedEnvioOperacion } from "@/components/operacion/PanelEnviosOperacion";
import DockIconos from "@/components/mapa/DockIconos";
import PanelFlotante from "@/components/mapa/PanelFlotante";
import BarraMetricasCompacta from "@/components/mapa/BarraMetricasCompacta";
import TiemposInfo from "@/components/mapa/TiemposInfo";
import { formatearFechaHora } from "@/lib/formatearHora";
import type { SelectedEnvio } from "@/components/simulacion/PanelEnvios";
import type {
  Aeropuerto,
  Vuelo,
  VueloEnMapa,
  VueloPageResponse,
  AeropuertoEnMapa,
  CrearEquipajeResponse,
  CargaMasivaPreview,
  CargaMasivaConfirmResponse,
  MetricasSimulacion,
  ReporteSesion,
  RutaDestacada,
  SegmentoResponse,
  PlantillaResumen,
} from "@/lib/types";

interface CancelResultEquipaje {
  id: string;
  codigo: string;
  origen_iata: string;
  destino_iata: string;
}

interface CancelResult {
  vueloId: string;
  codigo: string;
  loteId: string;
  equipajes: CancelResultEquipaje[];
}

interface CancelResultResponse {
  vuelo_id: string;
  estado_nuevo: string;
  equipajes_afectados: number;
  lote_replanificacion_id: string;
  equipajes: CancelResultEquipaje[];
}

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

const ESTADOS_VUELO_VALIDOS = [
  "PROGRAMADO",
  "EN_RUTA",
  "CANCELADO",
  "COMPLETADO",
] as const;

function matchEstadoVuelo(valor: string): VueloEnMapa["estado"] {
  if (
    ESTADOS_VUELO_VALIDOS.includes(
      valor as (typeof ESTADOS_VUELO_VALIDOS)[number],
    )
  ) {
    return valor as VueloEnMapa["estado"];
  }
  return "PROGRAMADO";
}

type DashboardMode = "operacion" | "simulacion" | "colapso";

interface SesionListaItem {
  id: string;
  tipo: string;
  tipo_simulacion: string;
  estado: string;
  fecha_inicio_virtual: string;
  created_at: string;
}

interface SesionResponse {
  id: string;
}

export default function DashboardPage() {
  const [mode, setMode] = useState<DashboardMode>("operacion");
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
  const [modeBarVisible, setModeBarVisible] = useState(true);

  useEffect(() => {
    localStorage.setItem("umbrales-config", JSON.stringify(configUmbrales));
  }, [configUmbrales]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="flex-1 flex flex-col">
        <div
          className={`overflow-hidden transition-all duration-300 ${
            modeBarVisible ? "max-h-16 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="flex items-center gap-1 px-4 pt-2 pb-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setMode("operacion")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                mode === "operacion"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500"
                  : "text-slate-600 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Plane size={14} className="inline mr-1.5" />
              Operación
            </button>
            <button
              onClick={() => setMode("simulacion")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                mode === "simulacion"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500"
                  : "text-slate-600 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <Settings size={14} className="inline mr-1.5" />
              Simulación
            </button>
            <button
              onClick={() => setMode("colapso")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                mode === "colapso"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500"
                  : "text-slate-600 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <AlertTriangle size={14} className="inline mr-1.5" />
              Colapso
            </button>
            <div className="flex-1" />
            <button
              onClick={() => setModeBarVisible(false)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600"
              title="Ocultar barra de modos"
            >
              <ChevronUp size={16} />
            </button>
          </div>
        </div>
        {!modeBarVisible && (
          <div className="flex justify-center bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setModeBarVisible(true)}
              className="py-0.5 px-4 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 rounded"
              title="Mostrar barra de modos"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        )}
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
  const [estadoOperacion, setEstadoOperacion] = useState<
    "INACTIVO" | "ACTIVO" | "PAUSADO"
  >("INACTIVO");
  const [operacionLoading, setOperacionLoading] = useState(false);
  const [aeropuertos, setAeropuertos] = useState<AeropuertoEnMapa[]>([]);
  const [allVuelos, setAllVuelos] = useState<VueloEnMapa[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    origenIata: "",
    destinoIata: "",
    cantidad: 1,
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState<CrearEquipajeResponse | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const [cargaMasivaOpen, setCargaMasivaOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CargaMasivaPreview | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvConfirmLoading, setCsvConfirmLoading] = useState(false);

  const { data: telemetria, connected: wsConnected } = useTelemetria(
    estadoOperacion === "ACTIVO",
  );
  const hora = useReloj();

  useEffect(() => {
    api
      .get<{ estado: string }>("/operacion/estado")
      .then((r) => {
        if (r.estado === "ACTIVO" || r.estado === "PAUSADO")
          setEstadoOperacion(r.estado);
      })
      .catch(() => {});
  }, []);
  const k = 1;
  const animacionActiva =
    wsConnected &&
    (telemetria?.vuelos?.some((v) => v.estado === "EN_RUTA") ?? false);

  const [dockAbiertas, setDockAbiertas] = useState<Set<string>>(new Set());
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [selectedEnvio, setSelectedEnvio] =
    useState<SelectedEnvioOperacion | null>(null);
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
  const [filtroColor, setFiltroColor] = useState<'' | ColorSemaforo>('');
  const [filtroContinenteOp, setFiltroContinenteOp] = useState<string>('');
  const [aeroSeleccionado, setAeroSeleccionado] = useState<string | null>(null);
  const [vueloSeleccionadoOp, setVueloSeleccionadoOp] = useState<string | null>(null);

  const handleAeropuertoClickOp = useCallback((codigoIata: string) => {
    setAeroSeleccionado(codigoIata);
    setSeguidoAeropuertoId(codigoIata);
    setSeguidoVueloId(null);
  }, []);

  const handleVueloSeleccionadoOp = useCallback((id: string) => {
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
      const baseDate = "2026-01-15";
      const ahora = new Date();
      const wStart = `${baseDate}T${ahora.toISOString().slice(11, 19)}Z`;
      const wEnd = new Date(
        new Date(wStart).getTime() + 4 * 3600000,
      ).toISOString();
      const [aeropuertosData, vuelosData] = await Promise.all([
        api.get<Aeropuerto[]>("/nodos"),
        api.get<VueloPageResponse>(
          `/vuelos?size=300&fecha_desde=${encodeURIComponent(wStart)}&fecha_hasta=${encodeURIComponent(wEnd)}`,
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
    if (!telemetria?.nodos || telemetria.nodos.length === 0) return;
    const telemetriaAeropuertos: AeropuertoEnMapa[] = telemetria.nodos.map(
      (n) => ({
        id: n.id,
        codigo_iata: n.codigo_iata,
        nombre: n.codigo_iata,
        latitud: n.lat,
        longitud: n.lon,
        capacidad_almacen: n.capacidad_almacen,
        ocupacion_actual: n.ocupacion_actual,
        zona_horaria: "",
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
    if (telemetria.vuelos && telemetria.vuelos.length > 0) {
      const vuelosMapped = telemetria.vuelos.map((v) => ({
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
    }
  }, [telemetria, configUmbrales]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormLoading(true);
    try {
      const aeropuerto = aeropuertos.find(
        (n) => n.codigo_iata === formData.origenIata,
      );
      if (!aeropuerto) {
        setFormError("Seleccione un aeropuerto origen");
        setFormLoading(false);
        return;
      }
      const response = await api.post<CrearEquipajeResponse>(
        "/equipajes",
        {
          destino_iata: formData.destinoIata,
          cantidad: formData.cantidad,
        },
        { "X-Device-Nodo-Id": aeropuerto.id },
      );
      setFormSuccess(response);
      setFormData({ origenIata: "", destinoIata: "", cantidad: 1 });
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
    setCsvFile(file);
    setCsvError(null);
    setCsvLoading(true);
    try {
      const formData = new FormData();
      formData.append("archivo", file);
      const preview = await api.upload<CargaMasivaPreview>(
        "/equipajes/carga-masiva",
        formData,
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
    setCsvConfirmLoading(true);
    setCsvError(null);
    try {
      await api.post<CargaMasivaConfirmResponse>(
        "/equipajes/carga-masiva/confirmar",
        {},
      );
      setCargaMasivaOpen(false);
      setCsvFile(null);
      setCsvPreview(null);
    } catch (err: unknown) {
      const error = err as { mensaje?: string; message?: string };
      setCsvError(error.mensaje || error.message || "Error al confirmar carga");
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
    try {
      await api.post("/operacion/iniciar", {});
      localStorage.setItem("sesion_operacion_inicio", new Date().toISOString());
      setEstadoOperacion("ACTIVO");
    } catch {
      setApiError("Error al iniciar operación");
    } finally {
      setOperacionLoading(false);
    }
  };

  const handlePausar = async () => {
    setOperacionLoading(true);
    try {
      await api.post("/operacion/pausar", {});
      setEstadoOperacion("PAUSADO");
    } catch {
      setApiError("Error al pausar operación");
    } finally {
      setOperacionLoading(false);
    }
  };

  const handleReanudar = async () => {
    setOperacionLoading(true);
    try {
      await api.post("/operacion/reanudar", {});
      setEstadoOperacion("ACTIVO");
    } catch {
      setApiError("Error al reanudar operación");
    } finally {
      setOperacionLoading(false);
    }
  };

  const handleDetener = async () => {
    setOperacionLoading(true);
    try {
      await api.post("/operacion/detener", {});
      setEstadoOperacion("INACTIVO");
    } catch {
      setApiError("Error al detener operación");
    } finally {
      setOperacionLoading(false);
    }
  };

  // Operacion real (sin sesion de simulacion): camino legacy, sin sesion_id.
  const handleCancelarVuelo = async (id: string, codigo: string) => {
    if (!confirm(`¿Cancelar vuelo ${codigo}?`)) return;
    try {
      await api.post("/simulacion/cancelacion", {
        vuelo_id: id,
        causa: "Cancelación manual",
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

  const metricasOpSim = telemetria?.metricas_sesion;

  const vuelosActivosOp = allVuelos.filter(
    (v) => v.estado === "EN_RUTA",
  ).length;
  const vuelosProgramadosOp = allVuelos.filter(
    (v) => v.estado === "PROGRAMADO",
  ).length;
  const vuelosEntregadosOp = allVuelos.filter(
    (v) => v.estado === "COMPLETADO",
  ).length;

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
    setDockAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
          filtroColor={filtroColor}
          onAeropuertoClick={handleAeropuertoClickOp}
          onVueloSeleccionado={handleVueloSeleccionadoOp}
          continenteFiltro={filtroContinenteOp || undefined}
        >
          <BarraMetricasCompacta
            sla={metricasOpSim?.sla_acumulado_pct ?? 100}
            cancelados={metricasOpSim?.vuelos_cancelados ?? 0}
            replanificadas={metricasOpSim?.maletas_replanificadas ?? 0}
            ocupacionGlobal={ocupacionGlobal}
            verdeMax={configUmbrales.verdeMax}
            ambarMax={configUmbrales.ambarMax}
            vuelosActivos={vuelosActivosOp}
            vuelosProgramados={vuelosProgramadosOp}
            equipajeFilter={equipajeFilter}
            onEquipajeFilterChange={setEquipajeFilter}
          />
          <div className="absolute top-4 right-4 z-[1001] pointer-events-none">
            <div className="pointer-events-auto p-2 rounded-lg bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm shadow border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 min-w-[150px]">
              <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-slate-200 dark:border-slate-600">
                <Clock size={11} />
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {formatearFechaHora(hora.toISOString())}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Estado:</span>
                <span className={`font-mono font-medium ${estadoOperacion === "ACTIVO" ? "text-green-600" : estadoOperacion === "PAUSADO" ? "text-amber-600" : "text-slate-600"}`}>
                  {estadoOperacion}
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
        </GeoMapa>


      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-[1002] flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg border border-slate-200 dark:border-slate-700 rounded-xl">
          <DockIconos
            secciones={[
              { id: 'datos', icon: Plane, label: 'Aeropuertos, Vuelos, Envíos' },
              { id: 'control', icon: Activity, label: 'Control' },
              { id: 'registro', icon: Package, label: 'Registro Equipaje' },
              { id: 'filtro', icon: Filter, label: 'Filtro Ocupación' },
            ]}
            abiertas={dockAbiertas}
            onToggle={toggleDockOp}
            collapsed={dockCollapsed}
            onToggleCollapse={() => setDockCollapsed(!dockCollapsed)}
          />
        </div>

        <div className="absolute left-16 top-4 z-[1001] flex flex-col gap-2 max-h-[calc(100vh-8rem)] overflow-y-auto pointer-events-none">
          {dockAbiertas.has('datos') && (
            <PanelFlotante
              title="Aeropuertos, Vuelos, Envíos"
              onClose={() => toggleDockOp('datos')}
              className="w-80 shrink-0 pointer-events-auto"
            >
              <PanelTabs
                aeropuertos={telemetria?.nodos ?? []}
                vuelosAeropuerto={telemetria?.vuelos ?? []}
                onAeropuertoClick={(id, codigo) =>
                  setSelectedEnvio({ tipo: "nodo", id, codigo })
                }
                vuelos={telemetria?.vuelos ?? []}
                onVueloClick={(id, codigo) =>
                  setSelectedEnvio({ tipo: "vuelo", id, codigo })
                }
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
                aeropuertoSeleccionadoId={aeroSeleccionado ?? undefined}
                vueloSeleccionadoId={vueloSeleccionadoOp ?? undefined}
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
                vueloFilterOrigen={vueloFilterOrigen}
                vueloFilterDestino={vueloFilterDestino}
                onVueloFilterChange={({ origen, destino }) => {
                  setVueloFilterOrigen(origen);
                  setVueloFilterDestino(destino);
                }}
                enviosActivo={estadoOperacion === "ACTIVO"}
                nodos={aeropuertos.map((n) => ({
                  codigo_iata: n.codigo_iata,
                  nombre: n.nombre,
                }))}
                onSeguirEnMapa={(vueloId) => setSeguidoVueloId(vueloId)}
                onMostrarRuta={handleMostrarRutaOp}
                filtroColor={filtroColor}
                onFilterColorChange={setFiltroColor}
                umbralesConfig={configUmbrales}
                filtroContinente={filtroContinenteOp}
                onFiltroContinenteChange={setFiltroContinenteOp}
              />
            </PanelFlotante>
          )}
          {dockAbiertas.has('control') && (
            <PanelFlotante
              title="Control"
              onClose={() => toggleDockOp('control')}
              className="w-80 shrink-0 pointer-events-auto"
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
                {estadoOperacion === "ACTIVO" ? (
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={handlePausar} disabled={operacionLoading} className="flex-1">
                      <Pause size={14} className="mr-1" />{operacionLoading ? "..." : "Pausar"}
                    </Button>
                    <Button variant="danger" size="sm" onClick={handleDetener} disabled={operacionLoading} className="flex-1">
                      <Square size={14} className="mr-1" />{operacionLoading ? "..." : "Detener"}
                    </Button>
                  </div>
                ) : estadoOperacion === "PAUSADO" ? (
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
                    <Play size={14} className="mr-1" />{operacionLoading ? "..." : "Iniciar Operación"}
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
          {dockAbiertas.has('registro') && (
            <PanelFlotante
              title="Registro de Equipaje"
              onClose={() => toggleDockOp('registro')}
              className="w-80 shrink-0 pointer-events-auto"
            >
              <div className="p-4">
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
                    <Select label="Aeropuerto Origen" placeholder={aeropuertos.length === 0 ? "No hay aeropuertos" : "Seleccionar aeropuerto origen"}
                      options={destinoOptions} value={formData.origenIata}
                      onChange={(e) => setFormData((prev) => ({ ...prev, origenIata: e.target.value }))}
                      disabled={aeropuertos.length === 0}
                    />
                    <Select label="Destino IATA" placeholder={aeropuertos.length === 0 ? "No hay destinos" : "Seleccionar destino"}
                      options={destinoOptions} value={formData.destinoIata}
                      onChange={(e) => setFormData((prev) => ({ ...prev, destinoIata: e.target.value }))}
                      disabled={aeropuertos.length === 0}
                    />
                    <Input label="Número de Maletas" type="number" min="1" value={formData.cantidad}
                      onChange={(e) => setFormData((prev) => ({ ...prev, cantidad: Math.max(1, parseInt(e.target.value) || 1) }))}
                    />
                    {formError && (<div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800"><XCircle size={14} className="text-red-600 dark:text-red-400" /><span className="text-xs text-red-700 dark:text-red-300">{formError}</span></div>)}
                    <Button type="submit" disabled={formLoading} className="w-full">{formLoading ? "Registrando..." : "Registrar"}</Button>
                  </form>
                )}
                {formSuccess && (
                  <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2"><CheckCircle size={16} className="text-green-600 dark:text-green-400" /><span className="font-medium text-sm text-green-900 dark:text-green-100">Equipaje registrado</span></div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">Código:</span><span className="font-medium text-slate-900 dark:text-slate-100">{formSuccess.id_externo || formSuccess.id.slice(0, 8)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-300">Estado:</span><Badge variant="green">{formSuccess.estado}</Badge></div>
                    </div>
                  </div>
                )}
              </div>
            </PanelFlotante>
          )}
          {dockAbiertas.has('filtro') && (
            <PanelFlotante
              title="Filtro por Ocupación"
              onClose={() => toggleDockOp('filtro')}
              className="w-80 shrink-0 pointer-events-auto"
            >
              <div className="p-4">
                <div className="flex items-center gap-1 flex-wrap">
                  {(['', 'VACIO', 'VERDE', 'AMBAR', 'ROJO'] as const).map((opt) => (
                    <button key={opt} onClick={() => setFiltroColor(opt)}
                      className={`px-2 py-1 text-sm font-medium rounded-md transition-colors flex items-center gap-1 ${
                        filtroColor === opt
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                          : 'text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200'
                      }`}
                    >
                      {opt === '' ? 'Todos' : (
                        <span className="w-3 h-3 rounded-full inline-block"
                          style={{ backgroundColor: opt === 'VACIO' ? '#9ca3af' : opt === 'VERDE' ? '#22c55e' : opt === 'AMBAR' ? '#eab308' : '#ef4444' }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </PanelFlotante>
          )}
        </div>

        {selectedEnvio && (
          <div className="absolute left-16 bottom-4 z-[1001]">
            <PanelFlotante title="Detalle de Envío" onClose={() => setSelectedEnvio(null)} className="w-80 pointer-events-auto">
              <PanelEnviosOperacion selectedEnvio={selectedEnvio} onClose={() => setSelectedEnvio(null)}
                onSeguirEnMapa={(vueloId) => setSeguidoVueloId(vueloId)} onMostrarRuta={handleMostrarRutaOp}
              />
            </PanelFlotante>
          </div>
        )}

        <Modal open={cargaMasivaOpen}
          onClose={() => { setCargaMasivaOpen(false); setCsvFile(null); setCsvPreview(null); setCsvError(null); }}
          title="Carga Masiva de Equipaje"
          footer={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => { setCargaMasivaOpen(false); setCsvFile(null); setCsvPreview(null); setCsvError(null); }}>Cancelar</Button>
              <Button onClick={handleConfirmarCargaMasiva} disabled={!csvPreview || csvPreview.validos === 0 || csvConfirmLoading}>
                {csvConfirmLoading ? "Confirmando..." : `Confirmar (${csvPreview?.validos || 0})`}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" id="csv-upload" />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload size={32} className="mx-auto text-slate-600 mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-300">{csvFile ? csvFile.name : "Subir archivo CSV"}</p>
              </label>
            </div>
            {csvLoading && <div className="text-center text-sm text-slate-600">Procesando...</div>}
            {csvError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                <AlertTriangle size={16} />
                <span className="text-sm text-red-700 dark:text-red-300">{csvError}</span>
              </div>
            )}
            {csvPreview && (
              <div className="space-y-3">
                <div className="flex gap-4 text-sm">
                  <span className="text-slate-600 dark:text-slate-300">Total: {csvPreview.total}</span>
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

function SimulacionView({
  configUmbrales,
}: {
  configUmbrales: UmbralesConfig;
}) {
  const [sesionId, setSesionId] = useState<string | null>(null);
  const [inicioRealMs, setInicioRealMs] = useState(0);
  const [estadoSesion, setEstadoSesion] = useState<
    "CONFIGURADA" | "EN_CURSO" | "PAUSADA" | "FINALIZADA"
  >("CONFIGURADA");
  const [cancelResult, setCancelResult] = useState<CancelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sesionesActivas, setSesionesActivas] = useState<SesionListaItem[]>([]);
  const [finalizandoId, setFinalizandoId] = useState<string | null>(null);
  const [dockAbiertas, setDockAbiertas] = useState<Set<string>>(new Set());
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [reporte, setReporte] = useState<ReporteSesion | null>(null);

  const [simulacionConfig, setSimulacionConfig] = useState({
    fecha_inicio_virtual: "2026-01-02",
    hora_inicio_virtual: "08:00",
  });

  const { data: telemetria, connected: wsConnected } = useTelemetria(
    estadoSesion === "EN_CURSO",
  );
  const [initialAeropuertos, setInitialAeropuertos] = useState<
    AeropuertoEnMapa[]
  >([]);
  const [initialVuelos, setInitialVuelos] = useState<VueloEnMapa[]>([]);
  const [selectedEnvio, setSelectedEnvio] = useState<SelectedEnvio | null>(
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
  const [plantillas, setPlantillas] = useState<PlantillaResumen[]>([]);

  const [metricasPoll, setMetricasPoll] = useState<MetricasSimulacion>({
    sesion_id: "",
    estado: "CONFIGURADA",
    dia_hora_virtual: "",
    segundos_reales_transcurridos: 0,
    sla_acumulado_pct: 100,
    vuelos_cancelados: 0,
    maletas_replanificadas: 0,
  });

  const sesionIdRef = useRef<string | null>(null);
  useEffect(() => {
    sesionIdRef.current = sesionId;
  }, [sesionId]);

  const metricas = telemetria?.metricas_sesion ?? metricasPoll;
  const hora = useReloj();

  // Plantillas: una fila por codigo_vuelo. Solo se cargan cuando la sesion ya esta
  // en movimiento (no en CONFIGURADA), porque la regla hoy/mañana requiere el reloj
  // virtual que solo existe una vez arrancada.
  useEffect(() => {
    if (!sesionId || estadoSesion === "CONFIGURADA" || estadoSesion === "FINALIZADA") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlantillas([]);
      return;
    }
    api
      .get<VueloPageResponse>("/vuelos?es_plantilla=true&size=500")
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

  const [simReady, setSimReady] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSimReady(false);
  }, [sesionId]);
  useEffect(() => {
    if (
      sesionId &&
      estadoSesion === "EN_CURSO" &&
      telemetria?.sesion_id === sesionId &&
      (telemetria?.metricas_sesion?.segundos_reales_transcurridos ?? 0) > 0
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSimReady(true);
    }
  }, [telemetria, sesionId, estadoSesion]);

  useEffect(() => {
    api
      .get<SesionListaItem[]>("/sesiones?estado=EN_CURSO")
      .then((enCurso) =>
        api
          .get<SesionListaItem[]>("/sesiones?estado=PAUSADA")
          .then((pausadas) => {
            setSesionesActivas([...enCurso, ...pausadas]);
          }),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!sesionId || estadoSesion === "FINALIZADA") return;
    const targetSesionId = sesionId;
    const interval = setInterval(() => {
      api
        .get<MetricasSimulacion>(`/sesiones/${targetSesionId}/metricas`)
        .then((m) => {
          if (!sesionIdRef.current || sesionIdRef.current !== targetSesionId)
            return;
          setMetricasPoll(m);
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [sesionId, estadoSesion]);

  // Aeropuertos visibles aun antes de iniciar la simulacion (solo nodos, sin vuelos).
  useEffect(() => {
    api
      .get<Aeropuerto[]>("/nodos")
      .then((aeropuertosData) => {
        setInitialAeropuertos(
          aeropuertosData.map((n) => {
            const pct =
              n.capacidad_almacen > 0
                ? (n.ocupacion_actual / n.capacidad_almacen) * 100
                : 0;
            return {
              ...n,
              color: colorAeropuertoPorOcupacion(pct, {
                verdeMax: configUmbrales.verdeMax,
                ambarMax: configUmbrales.ambarMax,
              }),
              ocupacionPorcentaje: pct,
            };
          }),
        );
      })
      .catch(() => {});
  }, [configUmbrales.verdeMax, configUmbrales.ambarMax]);

  useEffect(() => {
    if (!sesionId) return;
    const cargar = () => {
      api
        .get<Aeropuerto[]>("/nodos")
        .then((aeropuertosData) => {
          setInitialAeropuertos(
            aeropuertosData.map((n) => {
              const pct =
                n.capacidad_almacen > 0
                  ? (n.ocupacion_actual / n.capacidad_almacen) * 100
                  : 0;
              return {
                ...n,
                color: colorAeropuertoPorOcupacion(pct, {
                  verdeMax: configUmbrales.verdeMax,
                  ambarMax: configUmbrales.ambarMax,
                }),
                ocupacionPorcentaje: pct,
              };
            }),
          );
        })
        .catch(() => {});
      api
        .get<VueloPageResponse>("/vuelos?size=200&estado=PROGRAMADO")
        .then((r1) => {
          api
            .get<VueloPageResponse>("/vuelos?size=200&estado=EN_RUTA")
            .then((r2) => {
              setInitialVuelos(
                [...r1.content, ...r2.content].map((v: Vuelo): VueloEnMapa => ({
                  ...v,
                })),
              );
            })
            .catch(() => {});
        })
        .catch(() => {});
    };
    cargar();
    const interval = setInterval(cargar, 5000);
    return () => clearInterval(interval);
  }, [sesionId, configUmbrales.verdeMax, configUmbrales.ambarMax]);

  const sesionEnCurso = sesionesActivas.find((s) => s.estado === "EN_CURSO");
  const sesionPausada = sesionesActivas.find((s) => s.estado === "PAUSADA");

  const aeropuertosMapa: AeropuertoEnMapa[] =
    (telemetria?.nodos ?? []).length > 0
      ? (telemetria?.nodos ?? []).map((n) => ({
          id: n.id,
          codigo_iata: n.codigo_iata,
          nombre: n.codigo_iata,
          latitud: n.lat,
          longitud: n.lon,
          capacidad_almacen: n.capacidad_almacen,
          ocupacion_actual: n.ocupacion_actual,
          zona_horaria: "",
          color: colorAeropuertoPorOcupacion(n.ocupacion_pct, {
            verdeMax: configUmbrales.verdeMax,
            ambarMax: configUmbrales.ambarMax,
          }),
          ocupacionPorcentaje: n.ocupacion_pct,
          continente: n.continente,
        }))
      : initialAeropuertos;

  const vuelosMapa: VueloEnMapa[] =
    (telemetria?.vuelos ?? []).length > 0
      ? telemetria!.vuelos.map((v) => ({
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
          hora_salida: v.hora_salida ?? "",
          hora_llegada: v.hora_llegada ?? "",
          capacidad_carga: v.capacidad_carga,
          carga_disponible: v.carga_disponible,
          es_plantilla: false,
          fecha_operacion: "",
          posicionActual: { lat: v.lat_actual, lon: v.lon_actual },
          progreso: v.progreso,
        }))
      : initialVuelos;

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

  const handleVueloSeleccionadoSim = useCallback((id: string) => {
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

  const handleIniciar = async () => {
    setError("");
    setLoading(true);
    setReporte(null);
    try {
      const activas = await api.get<SesionListaItem[]>(
        "/sesiones?estado=EN_CURSO",
      );
      for (const s of activas) {
        try {
          await api.post(`/sesiones/${s.id}/detener`, {});
        } catch {
          /* ignore */
        }
      }
      const pausadas = await api.get<SesionListaItem[]>(
        "/sesiones?estado=PAUSADA",
      );
      for (const s of pausadas) {
        try {
          await api.post(`/sesiones/${s.id}/detener`, {});
        } catch {
          /* ignore */
        }
      }
      const res = await api.post<SesionResponse>("/sesiones", {
        tipo: "SIMULADA",
        fecha_inicio_virtual: simulacionConfig.fecha_inicio_virtual,
        hora_inicio_virtual: simulacionConfig.hora_inicio_virtual + ":00",
        umbrales_almacen: {
          verde_min: 0,
          verde_max: configUmbrales.verdeMax,
          ambar_min: configUmbrales.verdeMax,
          ambar_max: configUmbrales.ambarMax,
          rojo_min: configUmbrales.ambarMax,
          rojo_max: 100,
        },
        umbrales_vuelo: {
          verde_min: 0,
          verde_max: configUmbrales.verdeMax,
          ambar_min: configUmbrales.verdeMax,
          ambar_max: configUmbrales.ambarMax,
          rojo_min: configUmbrales.ambarMax,
          rojo_max: 100,
        },
      });
      await api.post(`/sesiones/${res.id}/iniciar`, {});
      setSesionId(res.id);
      setInicioRealMs(hora.getTime());
      setEstadoSesion("EN_CURSO");
      setSesionesActivas([]);
      setMetricasPoll({
        sesion_id: res.id,
        estado: "EN_CURSO",
        dia_hora_virtual: "",
        segundos_reales_transcurridos: 0,
        sla_acumulado_pct: 100,
        vuelos_cancelados: 0,
        maletas_replanificadas: 0,
      });
      setInitialVuelos([]);
      setInitialAeropuertos([]);
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || "Error al crear sesion");
    } finally {
      setLoading(false);
    }
  };

  const handlePausar = async () => {
    if (!sesionId) return;
    setLoading(true);
    try {
      await api.post(`/sesiones/${sesionId}/pausar`, {});
      setEstadoSesion("PAUSADA");
    } catch {
      setError("Error al pausar");
    } finally {
      setLoading(false);
    }
  };

  const handleReanudar = async () => {
    if (!sesionId) return;
    setLoading(true);
    setError("");
    try {
      const otrasActivas = await api
        .get<SesionListaItem[]>("/sesiones?estado=EN_CURSO")
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
      setEstadoSesion("EN_CURSO");
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || "Error al reanudar");
    } finally {
      setLoading(false);
    }
  };

  const handleDetener = async (id: string) => {
    setFinalizandoId(id);
    setError("");
    try {
      await api.post(`/sesiones/${id}/detener`, {});
      setSesionesActivas((prev) => prev.filter((s) => s.id !== id));
      if (id === sesionId) {
        setSesionId(null);
        setEstadoSesion("FINALIZADA");
        setInicioRealMs(0);
      }
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 600));
        try {
          const r = await fetchReporte(id);
          setReporte(r);
          break;
        } catch {
          /* report not ready yet */
        }
      }
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || "Error al detener");
    } finally {
      setFinalizandoId(null);
    }
  };

  const handleCancelarVuelo = async (id: string, codigo: string) => {
    if (!confirm(`¿Cancelar vuelo ${codigo}?`)) return;
    try {
      const res = await api.post<CancelResultResponse>(
        "/simulacion/cancelacion",
        { vuelo_id: id, causa: "Cancelación manual", sesion_id: sesionId },
      );
      setCancelResult({
        vueloId: res.vuelo_id,
        codigo,
        loteId: res.lote_replanificacion_id,
        equipajes: res.equipajes ?? [],
      });
    } catch {
      alert("Error al cancelar vuelo");
    }
  };

  const k = useMemo(() => telemetria?.metricas_sesion?.k ?? 120, [telemetria]);
  const animacionActiva =
    wsConnected && (vuelosMapa.some((v) => v.estado === "EN_RUTA") ?? false);

  const ocupacionGlobal = useMemo(() => {
    const sumOcup = aeropuertosMapa.reduce((s, a) => s + (a.ocupacion_actual || 0), 0);
    const sumCap = aeropuertosMapa.reduce((s, a) => s + (a.capacidad_almacen || 0), 0);
    return sumCap > 0 ? (sumOcup / sumCap) * 100 : 0;
  }, [aeropuertosMapa]);

  const toggleDock = useCallback((id: string) => {
    setDockAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="relative h-full overflow-hidden">
      <GeoMapa
          aeropuertos={aeropuertosMapa}
          vuelos={
            estadoSesion === "EN_CURSO" || estadoSesion === "PAUSADA"
              ? vuelosMapa.filter(
                  (v) =>
                    (v.estado === "EN_RUTA" || v.estado === "PROGRAMADO") &&
                    (!vueloFilterOrigen ||
                      v.origen.codigo_iata === vueloFilterOrigen) &&
                    (!vueloFilterDestino ||
                      v.destino.codigo_iata === vueloFilterDestino) &&
                    (equipajeFilter === "todos" ||
                      (equipajeFilter === "con_equipaje"
                        ? v.carga_disponible < v.capacidad_carga
                        : v.carga_disponible >= v.capacidad_carga)),
                )
              : []
          }
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
        >
          <BarraMetricasCompacta
            sla={metricas.sla_acumulado_pct ?? 100}
            cancelados={metricas.vuelos_cancelados}
            replanificadas={metricas.maletas_replanificadas}
            ocupacionGlobal={ocupacionGlobal}
            verdeMax={configUmbrales.verdeMax}
            ambarMax={configUmbrales.ambarMax}
            vuelosActivos={vuelosSimActivos}
            vuelosProgramados={vuelosSimProgramados}
            maletasEntregadas={metricas.maletas_entregadas}
            equipajeFilter={equipajeFilter}
            onEquipajeFilterChange={setEquipajeFilter}
          />
          <div className="absolute top-4 right-4 z-[1001] pointer-events-none">
            <TiemposInfo
              inicioRealMs={inicioRealMs}
              inicioSimuladoISO={`${simulacionConfig.fecha_inicio_virtual}T${simulacionConfig.hora_inicio_virtual}:00`}
              actualSimulado={metricas?.dia_hora_virtual ?? null}
            />
          </div>
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
              { id: 'envios', icon: Luggage, label: 'Envíos' },
              { id: 'sesion', icon: Settings, label: 'Sesión' },
              { id: 'reportes', icon: FileText, label: 'Reportes' },
            ]}
            abiertas={dockAbiertas}
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
              className="w-80 shrink-0 pointer-events-auto"
            >
              {sesionId && estadoSesion !== "FINALIZADA" ? (
                <div className="p-4">
                  <PanelAeropuertosOperacion
                    aeropuertos={telemetria?.nodos ?? []}
                    onAeropuertoClick={(id, codigo) =>
                      setSelectedEnvio({ tipo: "nodo", id, codigo })
                    }
                    onVerEnMapa={(id) => {
                      setSeguidoAeropuertoId(id);
                      setSeguidoVueloId(null);
                    }}
                    seguidoId={seguidoAeropuertoId ?? undefined}
                    seleccionadoId={aeroSeleccionadoSim ?? undefined}
                    filtroContinente={filtroContinenteSim}
                    onFiltroContinenteChange={setFiltroContinenteSim}
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
              className="w-80 shrink-0 pointer-events-auto"
            >
              <div className="p-4">
                <PanelVuelosOperacion
                  vuelos={telemetria?.vuelos ?? []}
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
                  origenFilter={vueloFilterOrigen}
                  destinoFilter={vueloFilterDestino}
                  onFilterChange={({ origen, destino }) => {
                    setVueloFilterOrigen(origen);
                    setVueloFilterDestino(destino);
                  }}
                />
                {sesionId && plantillas.length > 0 && (
                  <SeccionCancelacion
                    plantillas={plantillas}
                    sesionId={sesionId}
                    momentoVirtual={metricas?.dia_hora_virtual ?? null}
                  />
                )}
              </div>
            </PanelFlotante>
          )}
          {dockAbiertas.has('envios') && (
            <PanelFlotante
              title="Envíos de Maletas"
              onClose={() => toggleDock('envios')}
              className="w-80 shrink-0 pointer-events-auto"
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
              className="w-80 shrink-0 pointer-events-auto"
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
                    <Button variant="danger" size="sm" disabled={finalizandoId === sesionEnCurso.id} onClick={() => handleDetener(sesionEnCurso.id)}>
                      <Square size={12} className="mr-1" />
                      {finalizandoId === sesionEnCurso.id ? "..." : "Detener"}
                    </Button>
                    <Button size="sm" onClick={() => { setSesionId(sesionEnCurso.id); setEstadoSesion("EN_CURSO"); }}>
                      <Play size={12} className="mr-1" />
                      Reanudar
                    </Button>
                  </div>
                )}
                {sesionPausada && !sesionEnCurso && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-xs text-yellow-600 font-medium">
                      Pausada: {sesionPausada.fecha_inicio_virtual}
                    </span>
                    <Button variant="danger" size="sm" disabled={finalizandoId === sesionPausada.id} onClick={() => handleDetener(sesionPausada.id)}>
                      <Square size={12} className="mr-1" />
                      {finalizandoId === sesionPausada.id ? "..." : "Detener"}
                    </Button>
                    <Button size="sm" onClick={async () => {
                      setSesionId(sesionPausada.id);
                      setLoading(true);
                      setError("");
                      try {
                        const otrasActivas = await api.get<SesionListaItem[]>("/sesiones?estado=EN_CURSO").catch(() => [] as SesionListaItem[]);
                        for (const s of otrasActivas) {
                          if (s.id !== sesionPausada.id) {
                            try { await api.post(`/sesiones/${s.id}/detener`, {}); } catch { /* ignore */ }
                          }
                        }
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
              className="w-80 shrink-0 pointer-events-auto"
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
          <div className="absolute left-16 bottom-4 z-[1001]">
            <PanelFlotante
              title="Detalle de Envío"
              onClose={() => setSelectedEnvio(null)}
              className="w-80 pointer-events-auto"
            >
              <PanelEnvios
                selectedEnvio={selectedEnvio}
                sesionId={sesionId}
                onClose={() => setSelectedEnvio(null)}
                onSeguirEnMapa={(vueloId) => setSeguidoVueloId(vueloId)}
                onMostrarRuta={handleMostrarRutaSim}
              />
            </PanelFlotante>
          </div>
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
  );
}

function ColapsoView({ configUmbrales }: { configUmbrales: UmbralesConfig }) {
  const [sesionId, setSesionId] = useState<string | null>(null);
  const [inicioRealMs, setInicioRealMs] = useState(0);
  const [estadoSesion, setEstadoSesion] = useState<
    "CONFIGURADA" | "EN_CURSO" | "PAUSADA" | "FINALIZADA" | "COLAPSADA"
  >("CONFIGURADA");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sesionesActivas, setSesionesActivas] = useState<SesionListaItem[]>([]);
  const [finalizandoId, setFinalizandoId] = useState<string | null>(null);
  const [dockAbiertas, setDockAbiertas] = useState<Set<string>>(new Set());
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [reporte, setReporte] = useState<ReporteSesion | null>(null);
  const [cancelResult, setCancelResult] = useState<CancelResult | null>(null);
  const [plantillas, setPlantillas] = useState<PlantillaResumen[]>([]);

  const [simulacionConfig, setSimulacionConfig] = useState({
    fecha_inicio_virtual: "2026-01-02",
    hora_inicio_virtual: "08:00",
  });

  const { data: telemetria, connected: wsConnected } = useTelemetria(
    estadoSesion === "EN_CURSO",
  );
  const [initialAeropuertos, setInitialAeropuertos] = useState<
    AeropuertoEnMapa[]
  >([]);
  const [initialVuelos, setInitialVuelos] = useState<VueloEnMapa[]>([]);
  const [selectedEnvio, setSelectedEnvio] = useState<SelectedEnvio | null>(
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
  const [vueloSeleccionadoCol, setVueloSeleccionadoCol] = useState<string | null>(null);

  const [metricasPoll, setMetricasPoll] = useState<MetricasSimulacion>({
    sesion_id: "",
    estado: "CONFIGURADA",
    dia_hora_virtual: "",
    segundos_reales_transcurridos: 0,
    sla_acumulado_pct: 100,
    vuelos_cancelados: 0,
    maletas_replanificadas: 0,
  });

  const sesionIdRef = useRef<string | null>(null);
  useEffect(() => {
    sesionIdRef.current = sesionId;
  }, [sesionId]);

  const metricas = telemetria?.metricas_sesion ?? metricasPoll;
  const hora = useReloj();

  useEffect(() => {
    api
      .get<SesionListaItem[]>("/sesiones?estado=EN_CURSO")
      .then((enCurso) =>
        api
          .get<SesionListaItem[]>("/sesiones?estado=PAUSADA")
          .then((pausadas) => {
            setSesionesActivas([...enCurso, ...pausadas]);
          }),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (
      !sesionId ||
      estadoSesion === "FINALIZADA" ||
      estadoSesion === "COLAPSADA"
    )
      return;
    const targetSesionId = sesionId;
    const interval = setInterval(() => {
      api
        .get<MetricasSimulacion>(`/sesiones/${sesionId}/metricas`)
        .then((m) => {
          if (!sesionIdRef.current || sesionIdRef.current !== targetSesionId)
            return;
          setMetricasPoll(m);
          if (m.estado === "COLAPSADA") {
            setEstadoSesion("COLAPSADA");
            fetchReportWithRetry(sesionId);
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [sesionId, estadoSesion]);

  // Aeropuertos visibles aun antes de iniciar la simulacion (solo nodos, sin vuelos).
  useEffect(() => {
    api
      .get<Aeropuerto[]>("/nodos")
      .then((aeropuertosData) => {
        setInitialAeropuertos(
          aeropuertosData.map((n) => {
            const pct =
              n.capacidad_almacen > 0
                ? (n.ocupacion_actual / n.capacidad_almacen) * 100
                : 0;
            return {
              ...n,
              color: colorAeropuertoPorOcupacion(pct, {
                verdeMax: configUmbrales.verdeMax,
                ambarMax: configUmbrales.ambarMax,
              }),
              ocupacionPorcentaje: pct,
            };
          }),
        );
      })
      .catch(() => {});
  }, [configUmbrales.verdeMax, configUmbrales.ambarMax]);

  useEffect(() => {
    if (!sesionId) return;
    const cargar = () => {
      api
        .get<Aeropuerto[]>("/nodos")
        .then((aeropuertosData) => {
          setInitialAeropuertos(
            aeropuertosData.map((n) => {
              const pct =
                n.capacidad_almacen > 0
                  ? (n.ocupacion_actual / n.capacidad_almacen) * 100
                  : 0;
              return {
                ...n,
                color: colorAeropuertoPorOcupacion(pct, {
                  verdeMax: configUmbrales.verdeMax,
                  ambarMax: configUmbrales.ambarMax,
                }),
                ocupacionPorcentaje: pct,
              };
            }),
          );
        })
        .catch(() => {});
      api
        .get<VueloPageResponse>("/vuelos?size=200&estado=PROGRAMADO")
        .then((r1) => {
          api
            .get<VueloPageResponse>("/vuelos?size=200&estado=EN_RUTA")
            .then((r2) => {
              setInitialVuelos(
                [...r1.content, ...r2.content].map((v: Vuelo): VueloEnMapa => ({
                  ...v,
                })),
              );
            })
            .catch(() => {});
        })
        .catch(() => {});
    };
    cargar();
    const interval = setInterval(cargar, 5000);
    return () => clearInterval(interval);
  }, [sesionId, configUmbrales.verdeMax, configUmbrales.ambarMax]);

  const sesionEnCurso = sesionesActivas.find((s) => s.estado === "EN_CURSO");
  const sesionPausada = sesionesActivas.find((s) => s.estado === "PAUSADA");

  const aeropuertosMapa: AeropuertoEnMapa[] =
    (telemetria?.nodos ?? []).length > 0
      ? (telemetria?.nodos ?? []).map((n) => ({
          id: n.id,
          codigo_iata: n.codigo_iata,
          nombre: n.codigo_iata,
          latitud: n.lat,
          longitud: n.lon,
          capacidad_almacen: n.capacidad_almacen,
          ocupacion_actual: n.ocupacion_actual,
          zona_horaria: "",
          color: colorAeropuertoPorOcupacion(n.ocupacion_pct, {
            verdeMax: configUmbrales.verdeMax,
            ambarMax: configUmbrales.ambarMax,
          }),
          ocupacionPorcentaje: n.ocupacion_pct,
          continente: n.continente,
        }))
      : initialAeropuertos;

  const vuelosMapa: VueloEnMapa[] =
    (telemetria?.vuelos ?? []).length > 0
      ? telemetria!.vuelos.map((v) => ({
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
          hora_salida: v.hora_salida ?? "",
          hora_llegada: v.hora_llegada ?? "",
          capacidad_carga: v.capacidad_carga,
          carga_disponible: v.carga_disponible,
          es_plantilla: false,
          fecha_operacion: "",
          posicionActual: { lat: v.lat_actual, lon: v.lon_actual },
          progreso: v.progreso,
        }))
      : initialVuelos;

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

  const handleAeropuertoClickCol = useCallback((codigoIata: string) => {
    setAeroSeleccionadoCol(codigoIata);
    setSeguidoAeropuertoId(codigoIata);
    setSeguidoVueloId(null);
  }, []);

  const handleVueloSeleccionadoCol = useCallback((id: string) => {
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

  async function fetchReportWithRetry(id: string) {
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

  const handleIniciar = async () => {
    setError("");
    setLoading(true);
    setReporte(null);
    try {
      const activas = await api.get<SesionListaItem[]>(
        "/sesiones?estado=EN_CURSO",
      );
      for (const s of activas) {
        try {
          await api.post(`/sesiones/${s.id}/detener`, {});
        } catch {
          /* ignore */
        }
      }
      const pausadas = await api.get<SesionListaItem[]>(
        "/sesiones?estado=PAUSADA",
      );
      for (const s of pausadas) {
        try {
          await api.post(`/sesiones/${s.id}/detener`, {});
        } catch {
          /* ignore */
        }
      }
      const res = await api.post<SesionResponse>("/sesiones", {
        tipo: "SIMULADA",
        tipo_simulacion: "HASTA_COLAPSO",
        fecha_inicio_virtual: simulacionConfig.fecha_inicio_virtual,
        hora_inicio_virtual: simulacionConfig.hora_inicio_virtual + ":00",
        umbrales_almacen: {
          verde_min: 0,
          verde_max: configUmbrales.verdeMax,
          ambar_min: configUmbrales.verdeMax,
          ambar_max: configUmbrales.ambarMax,
          rojo_min: configUmbrales.ambarMax,
          rojo_max: 100,
        },
        umbrales_vuelo: {
          verde_min: 0,
          verde_max: configUmbrales.verdeMax,
          ambar_min: configUmbrales.verdeMax,
          ambar_max: configUmbrales.ambarMax,
          rojo_min: configUmbrales.ambarMax,
          rojo_max: 100,
        },
      });
      await api.post(`/sesiones/${res.id}/iniciar`, {});
      setSesionId(res.id);
      setInicioRealMs(hora.getTime());
      setEstadoSesion("EN_CURSO");
      setSesionesActivas([]);
      setMetricasPoll({
        sesion_id: res.id,
        estado: "EN_CURSO",
        dia_hora_virtual: "",
        segundos_reales_transcurridos: 0,
        sla_acumulado_pct: 100,
        vuelos_cancelados: 0,
        maletas_replanificadas: 0,
      });
      setInitialVuelos([]);
      setInitialAeropuertos([]);
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || "Error al crear sesion");
    } finally {
      setLoading(false);
    }
  };

  const handlePausar = async () => {
    if (!sesionId) return;
    setLoading(true);
    try {
      await api.post(`/sesiones/${sesionId}/pausar`, {});
      setEstadoSesion("PAUSADA");
    } catch {
      setError("Error al pausar");
    } finally {
      setLoading(false);
    }
  };

  const handleReanudar = async () => {
    if (!sesionId) return;
    setLoading(true);
    setError("");
    try {
      const otrasActivas = await api
        .get<SesionListaItem[]>("/sesiones?estado=EN_CURSO")
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
      setEstadoSesion("EN_CURSO");
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || "Error al reanudar");
    } finally {
      setLoading(false);
    }
  };

  const handleDetener = async (id: string) => {
    setFinalizandoId(id);
    setError("");
    try {
      await api.post(`/sesiones/${id}/detener`, {});
      setSesionesActivas((prev) => prev.filter((s) => s.id !== id));
      if (id === sesionId) {
        setSesionId(null);
        setEstadoSesion("FINALIZADA");
        setInicioRealMs(0);
      }
      await fetchReportWithRetry(id);
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || "Error al detener");
    } finally {
      setFinalizandoId(null);
    }
  };

  const handleCancelarVuelo = async (id: string, codigo: string) => {
    if (!confirm(`¿Cancelar vuelo ${codigo}?`)) return;
    try {
      const res = await api.post<CancelResultResponse>(
        "/simulacion/cancelacion",
        { vuelo_id: id, causa: "Cancelación manual", sesion_id: sesionId },
      );
      setCancelResult({
        vueloId: res.vuelo_id,
        codigo,
        loteId: res.lote_replanificacion_id,
        equipajes: res.equipajes ?? [],
      });
      setCancelResult({
        vueloId: res.vuelo_id,
        codigo,
        loteId: res.lote_replanificacion_id,
        equipajes: res.equipajes ?? [],
      });
    } catch {
      alert("Error al cancelar vuelo");
    }
  };

  useEffect(() => {
    if (!sesionId || estadoSesion === "CONFIGURADA" || estadoSesion === "FINALIZADA" || estadoSesion === "COLAPSADA") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlantillas([]);
      return;
    }
    api
      .get<VueloPageResponse>("/vuelos?es_plantilla=true&size=500")
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

  const k = useMemo(() => telemetria?.metricas_sesion?.k ?? 120, [telemetria]);
  const animacionActiva =
    wsConnected && (vuelosMapa.some((v) => v.estado === "EN_RUTA") ?? false);

  const toggleDock = useCallback((id: string) => {
    setDockAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="relative h-full overflow-hidden">
      <GeoMapa
          aeropuertos={aeropuertosMapa}
          vuelos={
            estadoSesion === "EN_CURSO" || estadoSesion === "PAUSADA"
              ? vuelosMapa.filter(
                  (v) =>
                    (v.estado === "EN_RUTA" || v.estado === "PROGRAMADO") &&
                    (!vueloFilterOrigen ||
                      v.origen.codigo_iata === vueloFilterOrigen) &&
                    (!vueloFilterDestino ||
                      v.destino.codigo_iata === vueloFilterDestino) &&
                    (equipajeFilter === "todos" ||
                      (equipajeFilter === "con_equipaje"
                        ? v.carga_disponible < v.capacidad_carga
                        : v.carga_disponible >= v.capacidad_carga)),
                )
              : []
          }
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
        >
          <BarraMetricasCompacta
            sla={metricas.sla_acumulado_pct ?? 100}
            cancelados={metricas.vuelos_cancelados}
            replanificadas={metricas.maletas_replanificadas}
            ocupacionGlobal={ocupacionGlobal}
            verdeMax={configUmbrales.verdeMax}
            ambarMax={configUmbrales.ambarMax}
            vuelosActivos={vuelosColActivos}
            vuelosProgramados={vuelosColProgramados}
            maletasEntregadas={metricas.maletas_entregadas}
            equipajeFilter={equipajeFilter}
            onEquipajeFilterChange={setEquipajeFilter}
          />
          <div className="absolute top-4 right-4 z-[1001] pointer-events-none">
            <TiemposInfo
              inicioRealMs={inicioRealMs}
              inicioSimuladoISO={`${simulacionConfig.fecha_inicio_virtual}T${simulacionConfig.hora_inicio_virtual}:00`}
              actualSimulado={metricas?.dia_hora_virtual ?? null}
            />
          </div>
        </GeoMapa>

        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-[1002] flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-lg border border-slate-200 dark:border-slate-700 rounded-xl">
          <DockIconos
            secciones={[
              { id: 'sesion', icon: Settings, label: 'Sesión' },
              { id: 'vuelos', icon: Plane, label: 'Vuelos' },
              { id: 'reportes', icon: FileText, label: 'Reportes' },
            ]}
            abiertas={dockAbiertas}
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
              className="w-80 shrink-0 pointer-events-auto"
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
                    <Button variant="danger" size="sm" disabled={finalizandoId === sesionEnCurso.id} onClick={() => handleDetener(sesionEnCurso.id)}>
                      <Square size={12} className="mr-1" />
                      {finalizandoId === sesionEnCurso.id ? "..." : "Detener"}
                    </Button>
                    <Button size="sm" onClick={() => { setSesionId(sesionEnCurso.id); setEstadoSesion("EN_CURSO"); }}>
                      <Play size={12} className="mr-1" />
                      Reanudar
                    </Button>
                  </div>
                )}
                {sesionPausada && !sesionEnCurso && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-xs text-yellow-600 font-medium">
                      Pausada: {sesionPausada.fecha_inicio_virtual}
                    </span>
                    <Button variant="danger" size="sm" disabled={finalizandoId === sesionPausada.id} onClick={() => handleDetener(sesionPausada.id)}>
                      <Square size={12} className="mr-1" />
                      {finalizandoId === sesionPausada.id ? "..." : "Detener"}
                    </Button>
                    <Button size="sm" onClick={async () => {
                      setSesionId(sesionPausada.id);
                      setLoading(true);
                      setError("");
                      try {
                        const otrasActivas = await api.get<SesionListaItem[]>("/sesiones?estado=EN_CURSO").catch(() => [] as SesionListaItem[]);
                        for (const s of otrasActivas) {
                          if (s.id !== sesionPausada.id) {
                            try { await api.post(`/sesiones/${s.id}/detener`, {}); } catch { /* ignore */ }
                          }
                        }
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
              className="w-80 shrink-0 pointer-events-auto"
            >
              {sesionId && estadoSesion !== "FINALIZADA" && estadoSesion !== "COLAPSADA" ? (
                <PanelTabs
                  aeropuertos={telemetria?.nodos ?? []}
                  vuelosAeropuerto={telemetria?.vuelos ?? []}
                  onAeropuertoClick={(id, codigo) =>
                    setSelectedEnvio({ tipo: "nodo", id, codigo })
                  }
                  vuelos={telemetria?.vuelos ?? []}
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
                  plantillas={plantillas}
                  fechaVirtual={metricas?.dia_hora_virtual ?? null}
                />
              ) : (
                <p className="text-xs text-slate-600 p-4">Sin sesión activa</p>
              )}
            </PanelFlotante>
          )}

          {dockAbiertas.has('reportes') && (
            <PanelFlotante
              title="Reportes"
              onClose={() => toggleDock('reportes')}
              className="w-80 shrink-0 pointer-events-auto"
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
          <div className="absolute left-16 bottom-4 z-[1001]">
            <PanelFlotante
              title="Detalle de Envío"
              onClose={() => setSelectedEnvio(null)}
              className="w-80 pointer-events-auto"
            >
              <PanelEnvios
                selectedEnvio={selectedEnvio}
                sesionId={sesionId}
                onClose={() => setSelectedEnvio(null)}
                onSeguirEnMapa={(vueloId) => setSeguidoVueloId(vueloId)}
                onMostrarRuta={handleMostrarRutaCol}
              />
            </PanelFlotante>
          </div>
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
    );
  };
