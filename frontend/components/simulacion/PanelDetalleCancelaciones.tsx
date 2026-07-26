"use client";

import { useState, useEffect } from "react";
import {
  XCircle, AlertTriangle, CheckCircle2, Clock, Luggage,
  ArrowLeft, Loader2, Plane,
} from "lucide-react";
import type { ResultadoCancelacion, EquipajePlanViaje } from "@/lib/types";
import { fetchPlanViaje } from "@/lib/api";
import { formatearFechaHoraSeparado } from "@/lib/formatearHora";

interface PanelDetalleCancelacionesProps {
  cancelaciones: ResultadoCancelacion[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onBack: () => void;
  onVerDetalleEnvio?: (vueloId: string, vueloCodigo: string, equipajeId: string) => void;
}

function fmtHoraCorta(iso: string): string {
  const f = formatearFechaHoraSeparado(iso);
  return `${f.fecha} ${f.hora}`;
}

function fmtHoraMin(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function calcularDiferencia(salidaISO: string, cancelISO: string): {
  minutos: number; label: string; esAntes: boolean; esLimite: boolean;
} {
  const salida = new Date(salidaISO).getTime();
  const cancel = new Date(cancelISO).getTime();
  const diffMin = Math.floor((salida - cancel) / 60000);
  const absMin = Math.abs(diffMin);
  const horas = Math.floor(absMin / 60);
  const mins = absMin % 60;
  let label = "";
  if (horas > 0) label = `${horas}h `;
  label += `${mins} min`;
  return { minutos: diffMin, label, esAntes: diffMin >= 0, esLimite: diffMin >= 0 && diffMin < 60 };
}

export function PanelDetalleCancelaciones({
  cancelaciones,
  selectedId,
  onSelect,
  onBack,
  onVerDetalleEnvio,
}: PanelDetalleCancelacionesProps) {
  const r = selectedId
    ? cancelaciones.find((c) => c.vuelo_cancelado_id === selectedId) ?? null
    : null;

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
      {selectedId && r ? (
        <DetalleCancelacion
          cancelacion={r}
          onBack={() => onSelect(null)}
          onVerDetalleEnvio={onVerDetalleEnvio}
        />
      ) : (
        <>
          {cancelaciones.length === 0 ? (
            <div className="p-6 text-xs text-slate-500 text-center">
              No hay cancelaciones registradas.
            </div>
          ) : (
            <div className="max-h-[30rem] overflow-y-auto">
              {[...cancelaciones].reverse().map((c) => (
                <button
                  key={c.vuelo_cancelado_id}
                  onClick={() => onSelect(c.vuelo_cancelado_id)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-b-0"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {c.fue_diferido ? (
                        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                      ) : (
                        <XCircle size={14} className="text-red-500 shrink-0" />
                      )}
                      <span className="font-mono font-semibold text-sm text-slate-800 dark:text-slate-200">
                        {c.codigo_vuelo}
                      </span>
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                      c.fue_diferido
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    }`}>
                      {c.fue_diferido ? (
                        <><AlertTriangle size={10} /> Diferido</>
                      ) : (
                        <><CheckCircle2 size={10} /> Cancelado</>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 ml-6">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {c.equipajes[0]?.origen_iata ?? "—"} → {c.equipajes[0]?.destino_iata ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 ml-6 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      Cancelado: {fmtHoraMin(c.momento_cancelacion)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      Salida: {fmtHoraMin(c.hora_salida_programada)}
                    </span>
                    {c.equipajes_afectados > 0 && (
                      <span className="flex items-center gap-1 ml-auto">
                        <Luggage size={10} />
                        {c.equipajes_afectados}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DetalleCancelacion({
  cancelacion: c,
  onBack,
  onVerDetalleEnvio,
}: {
  cancelacion: ResultadoCancelacion;
  onBack: () => void;
  onVerDetalleEnvio?: (vueloId: string, vueloCodigo: string, equipajeId: string) => void;
}) {
  const [planes, setPlanes] = useState<Map<string, EquipajePlanViaje | null>>(new Map());
  const [loadingPlanes, setLoadingPlanes] = useState(false);

  useEffect(() => {
    if (c.equipajes.length === 0) return;
    let cancelled = false;
    (async () => {
      setLoadingPlanes(true);
      const m = new Map<string, EquipajePlanViaje | null>();
      for (const eq of c.equipajes) {
        if (cancelled) break;
        try {
          const plan = await fetchPlanViaje(eq.id);
          if (!cancelled) m.set(eq.id, plan);
        } catch {
          if (!cancelled) m.set(eq.id, null);
        }
      }
      if (!cancelled) {
        setPlanes(m);
        setLoadingPlanes(false);
      }
    })();
    return () => { cancelled = true; };
  }, [c]);

  const diff = calcularDiferencia(c.hora_salida_programada, c.momento_cancelacion);

  return (
    <div className="max-h-[30rem] overflow-y-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border-b border-slate-100 dark:border-slate-700/50 w-full text-left transition-colors"
      >
        <ArrowLeft size={14} />
        Volver al índice
      </button>

      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle size={16} className="text-red-500" />
            <span className="font-mono font-bold text-base text-slate-800 dark:text-slate-200">
              {c.codigo_vuelo}
            </span>
          </div>
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
            c.fue_diferido
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
          }`}>
            {c.fue_diferido ? (
              <><AlertTriangle size={11} /> Diferido (mañana)</>
            ) : (
              <><CheckCircle2 size={11} /> Cancelado (hoy)</>
            )}
          </span>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
          <span className="text-slate-500 dark:text-slate-400">Cancelado:</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {fmtHoraCorta(c.momento_cancelacion)}
          </span>

          <span className="text-slate-500 dark:text-slate-400">Salida programada:</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {fmtHoraCorta(c.hora_salida_programada)}
          </span>

          <span className="text-slate-500 dark:text-slate-400">Ruta:</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {c.equipajes[0]?.origen_iata ?? "—"} → {c.equipajes[0]?.destino_iata ?? "—"}
          </span>

          <span className="text-slate-500 dark:text-slate-400">Diferencia:</span>
          <span className={`font-semibold flex items-center gap-1 ${
            c.fue_diferido
              ? "text-amber-600 dark:text-amber-400"
              : diff.esLimite
                ? "text-amber-600 dark:text-amber-400"
                : "text-green-600 dark:text-green-400"
          }`}>
            {diff.label}
            {c.fue_diferido
              ? " → diferido al día siguiente"
              : diff.esAntes
                ? " antes de la salida ✅"
                : " después de la salida"}
          </span>
        </div>

        {c.equipajes_afectados > 0 && (
          <>
            <div className="border-t border-slate-100 dark:border-slate-700/50 pt-3">
              <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                <Luggage size={12} />
                Equipajes re-enrutados ({c.equipajes.length})
              </h4>
              <div className="space-y-1">
                {c.equipajes.map((eq) => {
                  const plan = planes.get(eq.id);
                  const nuevoVuelo = plan?.segmentos?.[0]?.vuelo_codigo;
                  const vueloId = eq.vuelo_replanificado_id;
                  const vueloCodigo = eq.vuelo_replanificado_codigo ?? nuevoVuelo;
                  return (
                    <div
                      key={eq.id}
                      className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-slate-50 dark:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300 shrink-0">
                          {eq.codigo}
                        </span>
                        <span className="text-slate-500 truncate">
                          {eq.origen_iata} → {eq.destino_iata}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {loadingPlanes && !vueloId ? (
                          <Loader2 size={11} className="animate-spin text-slate-400" />
                        ) : vueloId && vueloCodigo ? (
                          <button
                            onClick={() => onVerDetalleEnvio?.(vueloId, vueloCodigo, eq.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-1.5 py-0.5 rounded transition-colors"
                            title="Ver detalle del vuelo de replanificación"
                          >
                            <Plane size={10} />
                            {vueloCodigo}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {c.lote_replanificacion_id && (
              <div className="pt-1 text-xs text-slate-500 dark:text-slate-400">
                Lote: <span className="font-mono text-slate-600 dark:text-slate-300">
                  {c.lote_replanificacion_id.slice(0, 8)}
                </span>
              </div>
            )}
          </>
        )}

        {c.equipajes_afectados === 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
            <AlertTriangle size={12} />
            <span>0 equipajes afectados (los envíos del vuelo de hoy siguen su curso).</span>
          </div>
        )}
      </div>
    </div>
  );
}
