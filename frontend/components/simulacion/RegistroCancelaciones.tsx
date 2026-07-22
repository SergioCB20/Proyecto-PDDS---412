"use client";

import { XCircle, AlertTriangle, CheckCircle2, Luggage } from "lucide-react";
import type { ResultadoCancelacion } from "@/lib/types";
import { formatearFechaHoraSeparado } from "@/lib/formatearHora";

interface RegistroCancelacionesProps {
  cancelaciones: ResultadoCancelacion[];
}

function fmtHora(iso: string): string {
  const f = formatearFechaHoraSeparado(iso);
  return `${f.fecha} ${f.hora}`;
}

export function RegistroCancelaciones({
  cancelaciones,
}: RegistroCancelacionesProps) {
  if (cancelaciones.length === 0) {
    return (
      <div className="p-4 text-xs text-slate-500 text-center">
        No hay cancelaciones registradas.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-[30rem] overflow-y-auto">
      {[...cancelaciones].reverse().map((c, i) => (
        <div key={c.vuelo_cancelado_id + "-" + i} className="px-4 py-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle size={14} className="text-red-500 shrink-0" />
              <span className="font-mono font-semibold text-sm text-slate-800 dark:text-slate-200">
                {c.codigo_vuelo}
              </span>
            </div>
            <span className={`flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${
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
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            {c.fue_diferido && c.hora_salida_cancelada && (
              <span>Próxima salida: {fmtHora(c.hora_salida_cancelada)}</span>
            )}
            {c.equipajes_afectados > 0 && (
              <span className="flex items-center gap-1">
                <Luggage size={11} />
                {c.equipajes_afectados} maleta{c.equipajes_afectados !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {c.equipajes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {c.equipajes.map((eq) => (
                <span key={eq.id} className="inline-flex text-[0.65rem] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                  {eq.codigo}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
