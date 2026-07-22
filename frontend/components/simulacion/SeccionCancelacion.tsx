"use client";

import { useState } from "react";
import {
  XCircle, Clock, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, Search,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  type PlantillaResumen,
  type ResultadoCancelacion,
  type CancelResultResponse,
} from "@/lib/types";
import { minutosHastaSalidaPlantilla } from "@/lib/horasVirtuales";
import { formatearFechaHoraSeparado } from "@/lib/formatearHora";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface SeccionCancelacionProps {
  plantillas: PlantillaResumen[];
  sesionId: string;
  momentoVirtual: string | null;
  onCancelado?: (r: ResultadoCancelacion) => void;
}

const ESTADOS = ["PROGRAMADO", "EN_RUTA", "COMPLETADO", "CANCELADO"] as const;
type FiltroEstado = "" | (typeof ESTADOS)[number];

const ETIQUETA_ESTADO: Record<string, string> = {
  PROGRAMADO: "Programado",
  EN_RUTA: "En ruta",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
};

const COLOR_ESTADO: Record<string, string> = {
  PROGRAMADO: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  EN_RUTA: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  COMPLETADO: "bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400",
  CANCELADO: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function fmtHora(iso: string): string {
  const f = formatearFechaHoraSeparado(iso);
  return `${f.fecha} ${f.hora}`;
}

function fmtFechaCorta(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

export function SeccionCancelacion({
  plantillas,
  sesionId,
  momentoVirtual,
  onCancelado,
}: SeccionCancelacionProps) {
  const [open, setOpen] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoCancelacion | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("");

  const minutosHastaSalida = (p: PlantillaResumen): number | null => {
    if (!momentoVirtual) return null;
    return minutosHastaSalidaPlantilla(p.hora_salida, momentoVirtual);
  };

  const hayFiltros = busqueda.trim() || filtroEstado;

  const plantillasFiltradas = plantillas.filter(p => {
    const q = busqueda.trim().toLowerCase();
    if (q) {
      const coincideCodigo = p.codigo_vuelo.toLowerCase().includes(q);
      const coincideOrigen = p.origen_iata.toLowerCase().includes(q);
      const coincideDestino = p.destino_iata.toLowerCase().includes(q);
      if (!coincideCodigo && !coincideOrigen && !coincideDestino) return false;
    }
    if (filtroEstado && p.estado !== filtroEstado) return false;
    return true;
  });

  async function handleCancelar(p: PlantillaResumen) {
    if (!momentoVirtual) {
      setError("Sin reloj virtual: inicia la sesión para cancelar plantillas.");
      return;
    }
    setError(null);
    setLoadingId(p.id);
    try {
      const res = await api.post<CancelResultResponse>("/simulacion/cancelacion", {
        vuelo_id: p.id,
        causa: "Cancelación manual desde panel de plantillas",
        sesion_id: sesionId,
        aplicar_regla_plantilla: true,
      });
      const fueDiferido = res.vuelo_id !== p.id;
      const r: ResultadoCancelacion = {
        vuelo_solicitado_id: p.id,
        vuelo_cancelado_id: res.vuelo_id,
        fue_diferido: fueDiferido,
        fecha_operacion_cancelada: res.fecha_operacion ?? null,
        hora_salida_cancelada: res.hora_salida_cancelada ?? null,
        estado_nuevo: res.estado_nuevo,
        equipajes_afectados: res.equipajes_afectados,
        lote_replanificacion_id: res.lote_replanificacion_id,
      };
      setResultado(r);
      onCancelado?.(r);
    } catch (err) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || "Error al cancelar");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <div className="flex items-center gap-2">
          <XCircle size={14} className="text-red-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Cancelación
          </h3>
          <button onClick={() => setOpen(!open)}
            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors"
            title={open ? "Ocultar filtros" : "Mostrar filtros"}
          >
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
        <span className="text-xs text-slate-600">
          {plantillasFiltradas.length} / {plantillas.length} vuelo{plantillas.length !== 1 ? "s" : ""}
        </span>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-2">
          {!momentoVirtual && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-300">
              <AlertTriangle size={12} />
              <span>Sin reloj virtual. Inicia la sesión para habilitar la cancelación.</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
              <XCircle size={12} />
              <span>{error}</span>
            </div>
          )}

          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Buscar por código, origen o destino (ej: TAS, SPIM, BOG)..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="text-sm pl-7"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFiltroEstado("")}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                !filtroEstado
                  ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/40 dark:border-blue-600 dark:text-blue-300"
                  : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              Todos
            </button>
            {ESTADOS.map(est => {
              const activo = filtroEstado === est;
              return (
                <button
                  key={est}
                  onClick={() => setFiltroEstado(activo ? "" : est)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    activo
                      ? `${COLOR_ESTADO[est]} border-current`
                      : "border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {ETIQUETA_ESTADO[est]}
                </button>
              );
            })}
            {hayFiltros && (
              <button
                onClick={() => { setBusqueda(""); setFiltroEstado(""); }}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline ml-1"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium text-slate-600">Código</th>
                  <th className="text-left px-2 py-1.5 font-medium text-slate-600">Ruta</th>
                  <th className="text-left px-2 py-1.5 font-medium text-slate-600">Salida</th>
                  <th className="text-left px-2 py-1.5 font-medium text-slate-600">Llegada</th>
                  <th className="text-left px-2 py-1.5 font-medium text-slate-600">Estado</th>
                  <th className="text-left px-2 py-1.5 font-medium text-slate-600">Acción</th>
                </tr>
              </thead>
              <tbody>
                {plantillasFiltradas.map((p) => {
                  const min = minutosHastaSalida(p);
                  const caliente = min !== null && min < 60;
                  const deshabilitado = loadingId === p.id || !momentoVirtual;
                  return (
                    <tr
                      key={p.id}
                      className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    >
                      <td className="px-2 py-1.5 font-mono font-semibold text-slate-700 dark:text-slate-200">
                        {p.codigo_vuelo}
                      </td>
                      <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300">
                        {p.origen_iata} → {p.destino_iata}
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <Clock size={10} />
                          {fmtHora(p.hora_salida)}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300">
                        {fmtHora(p.hora_llegada)}
                      </td>
                      <td className="px-2 py-1.5">
                        <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full font-medium ${COLOR_ESTADO[p.estado] || "bg-slate-100 text-slate-600"}`}>
                          {ETIQUETA_ESTADO[p.estado] || p.estado}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">
                        <Button
                          variant={caliente ? "secondary" : "danger"}
                          size="sm"
                          disabled={deshabilitado}
                          onClick={() => handleCancelar(p)}
                          className="text-xs px-2 py-0.5"
                          title={
                            caliente
                              ? "Faltan ≤ 60 min: se cancelará la instancia del día siguiente"
                              : "Faltan > 60 min: se cancela hoy + replan"
                          }
                        >
                          {loadingId === p.id ? "..." : caliente ? "→ Mañana" : "Cancelar"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {plantillasFiltradas.length === 0 && plantillas.length > 0 && (
                  <tr>
                    <td colSpan={6} className="px-2 py-3 text-center text-slate-600">
                      Ningún vuelo coincide con los filtros.
                    </td>
                  </tr>
                )}
                {plantillas.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-2 py-3 text-center text-slate-600">
                      No hay plantillas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      <Modal
        open={!!resultado}
        onClose={() => setResultado(null)}
        title={
          resultado?.fue_diferido
            ? "Cancelación diferida al día siguiente"
            : "Cancelación aplicada al vuelo de hoy"
        }
        footer={
          <Button variant="secondary" onClick={() => setResultado(null)}>
            Cerrar
          </Button>
        }
      >
        {resultado && (
          <div className="space-y-3 text-sm">
            <div
              className={`flex items-start gap-2 p-3 rounded-lg border ${
                resultado.fue_diferido
                  ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                  : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              }`}
            >
              {resultado.fue_diferido ? (
                <AlertTriangle size={16} className="text-amber-600 mt-0.5" />
              ) : (
                <CheckCircle2 size={16} className="text-green-600 mt-0.5" />
              )}
              <div className="flex-1 text-xs space-y-1">
                {resultado.fue_diferido ? (
                  <>
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      El vuelo de hoy está demasiado próximo a su salida.
                    </p>
                    <p className="text-amber-800 dark:text-amber-300">
                      Se canceló la instancia del{" "}
                      <strong>
                        {fmtFechaCorta(resultado.fecha_operacion_cancelada)} (
                        {resultado.hora_salida_cancelada
                          ? fmtHora(resultado.hora_salida_cancelada)
                          : "—"}
                        )
                      </strong>{" "}
                      del mismo código de vuelo.
                    </p>
                    <p className="text-amber-700 dark:text-amber-400">
                      0 equipajes afectados (los envíos del vuelo de hoy siguen su curso).
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-green-900 dark:text-green-200">
                      Vuelo de hoy cancelado y replanificado.
                    </p>
                    <p className="text-green-800 dark:text-green-300">
                      {resultado.equipajes_afectados} equipaje
                      {resultado.equipajes_afectados !== 1 ? "s" : ""} re-enrutado
                      {resultado.equipajes_afectados !== 1 ? "s" : ""}.
                    </p>
                    {resultado.lote_replanificacion_id && (
                      <p className="text-green-700 dark:text-green-400 font-mono text-xs">
                        Lote: {resultado.lote_replanificacion_id.slice(0, 8)}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
