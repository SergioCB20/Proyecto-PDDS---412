'use client';

import { Play, Pause, Square, Clock, Settings, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatearFechaHoraSinSeg } from '@/lib/formatearHora';

export type EstadoSesionSim =
  | 'CONFIGURADA'
  | 'EN_CURSO'
  | 'PAUSADA'
  | 'FINALIZADA'
  | 'COLAPSADA';

interface CommandBarSimulacionProps {
  estado: EstadoSesionSim;
  wsConnected: boolean;
  diaHoraVirtual?: string | null;
  /** Operación en curso (crear/pausar/reanudar) — deshabilita los controles. */
  loading?: boolean;
  /** Deteniendo la sesión — deshabilita "Detener". */
  finalizando?: boolean;
  /** Solo el dueño de la sesión puede controlarla; los demás la ven en solo lectura. */
  esDuenio?: boolean;
  onIniciar: () => void;
  onPausar: () => void;
  onReanudar: () => void;
  onDetener: () => void;
  /** Abre el panel de configuración (fecha/hora virtual) antes de iniciar. */
  onAbrirConfig?: () => void;
}

const STATUS: Record<
  EstadoSesionSim,
  { label: string; dot: string; text: string; pulse: boolean; icon: React.ReactNode }
> = {
  CONFIGURADA: {
    label: 'Sin iniciar',
    dot: 'bg-slate-400',
    text: 'text-slate-600 dark:text-slate-300',
    pulse: false,
    icon: <Settings size={14} />,
  },
  EN_CURSO: {
    label: 'En ejecución',
    dot: 'bg-success',
    text: 'text-success',
    pulse: true,
    icon: <Activity size={14} />,
  },
  PAUSADA: {
    label: 'Pausada',
    dot: 'bg-warning',
    text: 'text-warning',
    pulse: false,
    icon: <Pause size={14} />,
  },
  FINALIZADA: {
    label: 'Detenida',
    dot: 'bg-slate-400',
    text: 'text-slate-500 dark:text-slate-400',
    pulse: false,
    icon: <CheckCircle size={14} />,
  },
  COLAPSADA: {
    label: 'Colapsada',
    dot: 'bg-danger',
    text: 'text-danger',
    pulse: false,
    icon: <AlertTriangle size={14} />,
  },
};

/**
 * Barra de comando persistente de la simulación. Reúne en un solo lugar visible:
 * estado (con color e indicador de "en ejecución"), reloj virtual y los controles
 * primarios (Iniciar / Pausar / Reanudar / Detener). Antes estos controles estaban
 * enterrados dentro de un panel flotante del dock.
 */
export default function CommandBarSimulacion({
  estado,
  wsConnected,
  diaHoraVirtual,
  loading = false,
  finalizando = false,
  esDuenio = true,
  onIniciar,
  onReanudar,
  onDetener,
  onAbrirConfig,
}: CommandBarSimulacionProps) {
  const st = STATUS[estado];
  const activa = estado === 'EN_CURSO' || estado === 'PAUSADA';
  const relojVirtual = diaHoraVirtual
    ? formatearFechaHoraSinSeg(diaHoraVirtual)
    : '—';

  return (
    <div className="w-full flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-1.5 px-3 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-700 shadow-sm">
        {/* Estado */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            {st.pulse && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 animate-ping" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${st.dot}`}
            />
          </span>
          <span className={`${st.text}`}>{st.icon}</span>
          <span className={`text-xs font-semibold ${st.text}`}>{st.label}</span>
        </div>

        {activa && (
          <>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
            {/* Reloj virtual */}
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <Clock size={13} className="text-slate-400 dark:text-slate-500" />
              <span className="text-xs font-mono font-medium tabular-nums">
                {relojVirtual}
              </span>
            </div>
          </>
        )}

        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />

        {/* Controles primarios */}
        {!activa ? (
          <div className="flex items-center gap-1.5">
            {onAbrirConfig && (
              <button
                onClick={onAbrirConfig}
                title="Configurar fecha/hora virtual"
                aria-label="Configurar simulación"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Settings size={16} />
              </button>
            )}
            <Button size="sm" onClick={onIniciar} disabled={loading}>
              <Play size={14} className="mr-1" />
              {loading ? 'Iniciando…' : 'Iniciar'}
            </Button>
          </div>
        ) : esDuenio ? (
          <div className="flex items-center gap-1.5">
            {estado === 'EN_CURSO' && (
              <Button size="sm" variant="secondary" onClick={onPausar} disabled={loading}>
                <Pause size={14} className="mr-1" />
                Pausa
              </Button>
            )}
            {estado === 'PAUSADA' && (
              <Button size="sm" onClick={onReanudar} disabled={loading}>
                <Play size={14} className="mr-1" />
                Reanudar
              </Button>
            )}
            <Button
              size="sm"
              variant="danger"
              onClick={onDetener}
              disabled={finalizando}
            >
              <Square size={14} className="mr-1" />
              {finalizando ? '…' : 'Detener'}
            </Button>
          </div>
        ) : (
          <span className="text-xs text-slate-500 dark:text-slate-400 px-1">
            Solo lectura
          </span>
        )}

        {/* Conexión WS */}
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
        <div
          className="flex items-center gap-1.5 pr-1"
          title={wsConnected ? 'Telemetría conectada' : 'Telemetría desconectada'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              wsConnected ? 'bg-success' : 'bg-danger'
            }`}
          />
          <span className="text-[0.7rem] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            WS
          </span>
        </div>
    </div>
  );
}
