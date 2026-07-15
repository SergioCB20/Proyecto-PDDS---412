'use client';

import type { ReactNode, CSSProperties } from 'react';
import {
  Activity,
  XCircle,
  RefreshCw,
  Luggage,
  Plane,
  Warehouse,
  CheckCircle,
  X,
} from 'lucide-react';
import { colorAeropuertoPorOcupacion, colorVueloPorOcupacion } from '@/lib/colors';

interface BarraMetricasCompactaProps {
  sla: number;
  cancelados: number;
  replanificadas: number;
  /** Ocupación agregada de los almacenes (aeropuertos), 0–100. */
  ocupacionGlobal: number;
  /** Ocupación agregada de la flota de unidades de transporte, 0–100. */
  ocupacionFlota?: number;
  verdeMax: number;
  ambarMax: number;
  vuelosActivos: number;
  vuelosProgramados: number;
  maletasEntregadas?: number;
  equipajeFilter: 'todos' | 'con_equipaje' | 'sin_equipaje';
  onEquipajeFilterChange: (v: 'todos' | 'con_equipaje' | 'sin_equipaje') => void;
  onClose?: () => void;
}

/** Tile de KPI: etiqueta pequeña en mayúsculas + valor prominente. Jerarquía
 *  visual clara para que el operario lea el estado en segundos. */
function Stat({
  icon,
  label,
  value,
  colorClass,
  valueStyle,
  children,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  colorClass?: string;
  valueStyle?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-2.5 min-w-[3.5rem]">
      <div className="flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 leading-none">
        <span className={colorClass}>{icon}</span>
        {label}
      </div>
      <span
        className={`mt-0.5 text-base font-bold tabular-nums leading-none ${
          colorClass ?? 'text-slate-900 dark:text-slate-100'
        }`}
        style={valueStyle}
      >
        {value}
      </span>
      {children}
    </div>
  );
}

function Sep() {
  return <div className="w-px self-stretch bg-slate-200 dark:bg-slate-700 my-1" />;
}

export default function BarraMetricasCompacta({
  sla,
  cancelados,
  replanificadas,
  ocupacionGlobal,
  ocupacionFlota,
  verdeMax,
  ambarMax,
  vuelosActivos,
  vuelosProgramados,
  maletasEntregadas,
  equipajeFilter,
  onEquipajeFilterChange,
  onClose,
}: BarraMetricasCompactaProps) {
  // Semáforo de ocupación: MISMA función que los marcadores del mapa, para que el
  // color del KPI coincida exactamente con el que ve el operario en los aeropuertos.
  const colorOcup = colorAeropuertoPorOcupacion(ocupacionGlobal, {
    verdeMax,
    ambarMax,
  });
  // Semáforo de la flota: misma función que colorea los aviones en el mapa.
  const colorFlota = colorVueloPorOcupacion(ocupacionFlota ?? 0, {
    verdeMax,
    ambarMax,
  });

  return (
    <div className="absolute top-4 left-4 z-[1001] pointer-events-none flex flex-col gap-1.5">
      {/* Fila de KPIs, agrupados por significado: salud · flota · incidencias */}
      <div className="pointer-events-auto relative flex items-stretch py-2 px-2 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-700">
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Ocultar métricas"
            className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 shadow-sm z-10"
          >
            <X size={10} />
          </button>
        )}

        {/* Salud */}
        <Stat
          icon={<Activity size={12} />}
          label="SLA"
          value={`${(sla ?? 0).toFixed(1)}%`}
          colorClass="text-info"
        />
        <Stat
          icon={<Warehouse size={12} />}
          label="Ocup"
          value={`${ocupacionGlobal.toFixed(1)}%`}
          valueStyle={{ color: colorOcup }}
        >
          <div className="w-11 h-1 mt-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(ocupacionGlobal, 100)}%`,
                backgroundColor: colorOcup,
              }}
            />
          </div>
        </Stat>
        {ocupacionFlota !== undefined && (
          <Stat
            icon={<Plane size={12} />}
            label="Flota"
            value={`${ocupacionFlota.toFixed(1)}%`}
            valueStyle={{ color: colorFlota }}
          >
            <div className="w-11 h-1 mt-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(ocupacionFlota, 100)}%`,
                  backgroundColor: colorFlota,
                }}
              />
            </div>
          </Stat>
        )}

        <Sep />

        {/* Flota */}
        <Stat
          icon={<Plane size={12} />}
          label="Activos"
          value={vuelosActivos}
          colorClass="text-info"
        />
        <Stat
          icon={<Plane size={12} className="opacity-50" />}
          label="Prog"
          value={vuelosProgramados}
        />
        {maletasEntregadas !== undefined && (
          <Stat
            icon={<CheckCircle size={12} />}
            label="Entreg"
            value={maletasEntregadas}
            colorClass="text-success"
          />
        )}

        <Sep />

        {/* Incidencias */}
        <Stat
          icon={<XCircle size={12} />}
          label="Cancel"
          value={cancelados}
          colorClass="text-danger"
        />
        <Stat
          icon={<RefreshCw size={12} />}
          label="Replan"
          value={replanificadas}
          colorClass="text-warning"
        />
      </div>

      {/* Filtro de equipaje — control segmentado compacto */}
      <div className="pointer-events-auto flex items-center gap-1.5 py-1 px-2 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-lg border border-slate-200 dark:border-slate-700">
        <Luggage size={13} className="text-slate-500 dark:text-slate-400" />
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
          {(['todos', 'con_equipaje', 'sin_equipaje'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => onEquipajeFilterChange(opt)}
              className={`px-2.5 py-0.5 text-xs font-medium rounded-md transition-colors ${
                equipajeFilter === opt
                  ? 'bg-white dark:bg-slate-700 text-info shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {opt === 'todos'
                ? 'Todos'
                : opt === 'con_equipaje'
                  ? 'Con eq'
                  : 'Sin eq'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
