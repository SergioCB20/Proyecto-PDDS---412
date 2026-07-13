"use client";

import { AlertCircle, Download, X, Plane, Package, Warehouse } from "lucide-react";
import type { ReporteSesion, ReporteOperacion } from "@/lib/types";
import { api } from "@/lib/api";
import { formatearHoraLocal } from "@/lib/formatearHora";

interface PanelReporteProps {
  reporte: ReporteSesion | ReporteOperacion;
  sesionId: string;
  onClose: () => void;
  esOperacion?: boolean;
}

function formatMomento(s: string): string {
  return formatearHoraLocal(s);
}

function isReporteSesion(r: ReporteSesion | ReporteOperacion): r is ReporteSesion {
  return "sla_incumplido_pct" in r;
}

export function PanelReporte({
  reporte,
  sesionId,
  onClose,
  esOperacion,
}: PanelReporteProps) {
  const handleDescargarCsv = async () => {
    const id = sesionId || reporte.sesion_id;
    if (!id) {
      alert("No se puede descargar el CSV: identificador de sesion no disponible.");
      return;
    }
    try {
      const path = esOperacion ? `/operacion/reporte/csv` : `/sesiones/${id}/rutas/csv`;
      const blob = await api.downloadBlob(path);
      if (blob.size < 100) {
        alert("El archivo CSV no contiene datos.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = esOperacion
        ? `operacion_sesion_${id.slice(0, 8)}.csv`
        : `replanificados_sesion_${id.slice(0, 8)}.csv`;
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
          {esOperacion ? "Reporte de Jornada" : "Reporte de Simulación"}
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {esOperacion ? (
          <ReporteOperacionBody
            reporte={reporte as ReporteOperacion}
            onDescargarCsv={handleDescargarCsv}
          />
        ) : (
          <ReporteSimulacionBody
            reporte={reporte as ReporteSesion}
            onDescargarCsv={handleDescargarCsv}
          />
        )}
      </div>
    </div>
  );
}

function ReporteOperacionBody({
  reporte,
  onDescargarCsv,
}: {
  reporte: ReporteOperacion;
  onDescargarCsv: () => void;
}) {
  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center gap-1 mb-1">
            <Package size={12} className="text-blue-600" />
            <div className="text-xs text-slate-600">Registrados</div>
          </div>
          <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
            {reporte.total_equipajes}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-1 mb-1">
            <Warehouse size={12} className="text-green-600" />
            <div className="text-xs text-slate-600">Entregados</div>
          </div>
          <div className="text-lg font-bold text-green-700 dark:text-green-300">
            {reporte.equipajes_entregados}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center gap-1 mb-1">
            <Plane size={12} className="text-amber-600" />
            <div className="text-xs text-slate-600">En Vuelo</div>
          </div>
          <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
            {reporte.equipajes_en_vuelo}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <div className="text-xs text-slate-600">Vuelos Programados</div>
          <div className="text-lg font-bold text-slate-700 dark:text-slate-300">
            {reporte.vuelos_programados}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <div className="text-xs text-slate-600">Vuelos en Ruta</div>
          <div className="text-lg font-bold text-slate-700 dark:text-slate-300">
            {reporte.vuelos_en_ruta}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <div className="text-xs text-slate-600">Vuelos Completados</div>
          <div className="text-lg font-bold text-slate-700 dark:text-slate-300">
            {reporte.vuelos_completados}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
          <div className="text-xs text-slate-600">Vuelos Cancelados</div>
          <div className="text-lg font-bold text-slate-700 dark:text-slate-300">
            {reporte.vuelos_cancelados}
          </div>
        </div>
      </div>
      <button
        onClick={onDescargarCsv}
        className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm text-slate-700 dark:text-slate-300"
      >
        <Download size={14} />
        Descargar CSV diario
      </button>
    </>
  );
}

function ReporteSimulacionBody({
  reporte,
  onDescargarCsv,
}: {
  reporte: ReporteSesion;
  onDescargarCsv: () => void;
}) {
  const slaOk = (reporte.sla_incumplido_pct ?? 0) < 10;
  const huboColapso = !!reporte.punto_colapso_virtual;
  const serieSla = reporte.serie_sla ?? [];

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div
          className={`p-3 rounded-lg ${slaOk ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}
        >
          <div className="text-xs text-slate-600">SLA Incumplido</div>
          <div
            className={`text-lg font-bold ${slaOk ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}
          >
            {(reporte.sla_incumplido_pct ?? 0).toFixed(1)}%
          </div>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
          <div className="text-xs text-slate-600">Replanificadas</div>
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
          <p className="text-xs font-medium text-slate-600 mb-2">
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
                <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 bg-slate-800 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
                  {formatMomento(p.momento_virtual)} —{" "}
                  {(p.sla_pct ?? 0).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-blue-400" />
              <span className="text-xs text-slate-600">
                Sin cancelación
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-red-400" />
              <span className="text-xs text-slate-600">
                Con cancelación
              </span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onDescargarCsv}
        className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm text-slate-700 dark:text-slate-300"
      >
        <Download size={14} />
        Descargar CSV de replanificados
      </button>
    </>
  );
}
