"use client";

import { AlertCircle, Download, X } from "lucide-react";
import type { ReporteSesion } from "@/lib/types";
import { api } from "@/lib/api";
import { formatearHoraLocal } from "@/lib/formatearHora";

interface PanelReporteProps {
  reporte: ReporteSesion;
  sesionId: string;
  onClose: () => void;
}

function formatMomento(s: string): string {
  return formatearHoraLocal(s);
}

export function PanelReporte({
  reporte,
  sesionId,
  onClose,
}: PanelReporteProps) {
  const slaOk = (reporte.sla_incumplido_pct ?? 0) < 10;
  const huboColapso = !!reporte.punto_colapso_virtual;
  const serieSla = reporte.serie_sla ?? [];

  const handleDescargarCsv = async () => {
    // Detener sesion vacia el `sesionId` del estado antes de mostrar el reporte;
    // usamos `reporte.sesion_id` (siempre presente en el payload) como respaldo.
    const id = sesionId || reporte.sesion_id;
    if (!id) {
      alert("No se puede descargar el CSV: identificador de sesion no disponible.");
      return;
    }
    try {
      const blob = await api.downloadBlob(`/sesiones/${id}/rutas/csv`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rutas_sesion_${id.slice(0, 8)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const mensaje =
        err && typeof err === "object" && "mensaje" in err
          ? (err as { mensaje?: string }).mensaje
          : null;
      alert(mensaje || "Error al descargar CSV");
    }
  };

  return (
    <div className="border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Reporte de Simulación
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div
            className={`p-3 rounded-lg ${slaOk ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}
          >
            <div className="text-xs text-slate-500">SLA Incumplido</div>
            <div
              className={`text-lg font-bold ${slaOk ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}
            >
              {(reporte.sla_incumplido_pct ?? 0).toFixed(1)}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
            <div className="text-xs text-slate-500">Replanificadas</div>
            <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
              {reporte.total_replanificadas}
            </div>
          </div>
        </div>

        {huboColapso && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle
                size={14}
                className="text-red-600 dark:text-red-400"
              />
              <span className="text-xs font-medium text-red-700 dark:text-red-300">
                Colapso
              </span>
            </div>
            <div className="text-xs text-red-600 dark:text-red-400 space-y-0.5">
              <div>
                Virtual:{" "}
                {reporte.punto_colapso_virtual
                  ? formatMomento(reporte.punto_colapso_virtual)
                  : "-"}
              </div>
              <div>Causa: {reporte.causa_colapso || "N/A"}</div>
            </div>
          </div>
        )}

        {serieSla.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">
              SLA por hora virtual
            </p>
            <div className="flex items-end gap-0.5 h-16">
              {serieSla.map((p, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end relative group"
                >
                  <div
                    className={`w-full rounded-t transition-all ${p.hubo_cancelacion ? "bg-red-400" : "bg-blue-400"}`}
                    style={{ height: `${Math.max(p.sla_pct, 2)}%` }}
                  />
                  <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
                    {formatMomento(p.momento_virtual)} —{" "}
                    {(p.sla_pct ?? 0).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-blue-400" />
                <span className="text-[10px] text-slate-400">
                  Sin cancelación
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-red-400" />
                <span className="text-[10px] text-slate-400">
                  Con cancelación
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleDescargarCsv}
          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm text-slate-700 dark:text-slate-300"
        >
          <Download size={14} />
          Descargar CSV de rutas
        </button>
      </div>
    </div>
  );
}
