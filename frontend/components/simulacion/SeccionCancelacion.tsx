"use client";

import { useState } from "react";
import { XCircle, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import {
  type PlantillaResumen,
  type ResultadoCancelacion,
  type CancelResultResponse,
} from "@/lib/types";
import { minutosHastaSalidaPlantilla } from "@/lib/horasVirtuales";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface SeccionCancelacionProps {
  plantillas: PlantillaResumen[];
  sesionId: string;
  momentoVirtual: string | null;
  onCancelado?: (r: ResultadoCancelacion) => void;
}

function fmtHora(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
  const [filtroCodigo, setFiltroCodigo] = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

  // Re-anchora la hora de la plantilla al día virtual actual antes de medir la
  // diferencia. Ver `lib/horasVirtuales.ts` para el razonamiento.
  const minutosHastaSalida = (p: PlantillaResumen): number | null => {
    if (!momentoVirtual) return null;
    return minutosHastaSalidaPlantilla(p.hora_salida, momentoVirtual);
  };

  const plantillasFiltradas = (() => {
    const q = filtroCodigo.trim().toLowerCase();
    return plantillas.filter(p => {
      if (q && !p.codigo_vuelo.toLowerCase().includes(q)) return false;
      if (filtroFechaDesde || filtroFechaHasta) {
        // Comparamos por la fecha virtual "anclada" de la plantilla: como las
        // plantillas vienen con hora_salida absoluta del dia 1 (V20, 2026-01-15),
        // el dia virtual del panel es lo que el usuario ve al filtrar. Si quiere
        // ver las que salen entre el 5 y el 7 del mes, leemos ese patron.
        const d = new Date(p.hora_salida);
        if (isNaN(d.getTime())) return true;
        const mes = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        if (filtroFechaDesde && mes < filtroFechaDesde) return false;
        if (filtroFechaHasta && mes > filtroFechaHasta) return false;
      }
      return true;
    });
  })();

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
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
      >
        <span className="flex items-center gap-2">
          <XCircle size={14} className="text-red-500" />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Cancelación (plantillas)
          </span>
          <span className="text-xs text-slate-600">
            {plantillasFiltradas.length} / {plantillas.length} vuelo{plantillas.length !== 1 ? "s" : ""}
          </span>
        </span>
        <span className="text-sm text-slate-600">{open ? "▾" : "▸"}</span>
      </button>

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

          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[120px]">
              <Input
                placeholder="Código de vuelo (ej. TAS0001)..."
                value={filtroCodigo}
                onChange={e => setFiltroCodigo(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="flex items-end gap-1.5">
              <Input
                type="date"
                aria-label="Fecha de salida desde"
                value={filtroFechaDesde}
                onChange={e => setFiltroFechaDesde(e.target.value)}
                className="text-sm w-[130px]"
                title="Salida desde (fecha virtual del reloj)"
              />
              <span className="text-xs text-slate-600 pb-1.5">→</span>
              <Input
                type="date"
                aria-label="Fecha de salida hasta"
                value={filtroFechaHasta}
                onChange={e => setFiltroFechaHasta(e.target.value)}
                className="text-sm w-[130px]"
                title="Salida hasta (fecha virtual del reloj)"
              />
            </div>
            {(filtroCodigo || filtroFechaDesde || filtroFechaHasta) && (
              <button
                onClick={() => {
                  setFiltroCodigo("");
                  setFiltroFechaDesde("");
                  setFiltroFechaHasta("");
                }}
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline pb-1.5"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium text-slate-600">Código</th>
                  <th className="text-left px-2 py-1.5 font-medium text-slate-600">Ruta</th>
                  <th className="text-left px-2 py-1.5 font-medium text-slate-600">Salida</th>
                  <th className="text-left px-2 py-1.5 font-medium text-slate-600">Llegada</th>
                  <th className="text-left px-2 py-1.5 font-medium text-slate-600">Acción</th>
                </tr>
              </thead>
              <tbody>
                {plantillasFiltradas.map((p) => {
                  const min = minutosHastaSalida(p);
                  const caliente = min !== null && min <= 60;
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
                    <td colSpan={5} className="px-2 py-3 text-center text-slate-600">
                      Ningún vuelo coincide con los filtros.
                    </td>
                  </tr>
                )}
                {plantillas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-2 py-3 text-center text-slate-600">
                      No hay plantillas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-tight">
            <strong>Regla:</strong> &gt;1h antes de la salida → cancela hoy y replanifica.
            ≤1h antes (o ya despegado) → cancela la instancia del día siguiente sin replan.
            Filtra por código o por rango de fechas de salida para acotar la lista.
          </p>
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
