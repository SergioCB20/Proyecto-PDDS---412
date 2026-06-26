'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, Package, Plane, RefreshCw } from 'lucide-react';
import { fetchMetricasOperacion } from '@/lib/api';
import type { MetricasOperacion as MetricasOp } from '@/lib/types';

function MetricaCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{value}</div>
      </div>
    </div>
  );
}

export function MetricasOperacion() {
  const [metricas, setMetricas] = useState<MetricasOp | null>(null);

  const cargar = useCallback(async () => {
    const key = 'sesion_operacion_inicio';
    let saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    if (!saved) {
      saved = new Date().toISOString();
      if (typeof window !== 'undefined') localStorage.setItem(key, saved);
    }
    try {
      const data = await fetchMetricasOperacion(saved);
      setMetricas(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
    const interval = setInterval(cargar, 10000);
    return () => clearInterval(interval);
  }, [cargar]);

  const reiniciar = () => {
    const nuevo = new Date().toISOString();
    if (typeof window !== 'undefined') localStorage.setItem('sesion_operacion_inicio', nuevo);
    cargar();
  };

  if (!metricas) {
    return (
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Métricas</h3>
        <p className="text-xs text-slate-400 italic text-center py-2">Cargando métricas...</p>
      </div>
    );
  }

  const totalVuelos = metricas.vuelos_programados + metricas.vuelos_en_ruta + metricas.vuelos_completados + metricas.vuelos_cancelados;

  return (
    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Métricas de la Sesión</h3>
        <button onClick={reiniciar} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800" title="Reiniciar sesión">
          <RefreshCw size={14} className="text-slate-400" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MetricaCard
          label="Total Equipajes"
          value={metricas.total_equipajes}
          icon={Package}
          color="bg-slate-500"
        />
        <MetricaCard
          label="Entregados"
          value={metricas.equipajes_entregados}
          icon={Activity}
          color="bg-green-500"
        />
        <MetricaCard
          label="En Vuelo"
          value={metricas.equipajes_en_vuelo}
          icon={Plane}
          color="bg-blue-500"
        />
        <MetricaCard
          label="Replanificación"
          value={metricas.equipajes_replanificacion}
          icon={AlertTriangle}
          color="bg-yellow-500"
        />
      </div>
      <div className="mt-2 text-xs text-slate-400 text-center">
        {totalVuelos} vuelos totales · {metricas.vuelos_cancelados} cancelados
      </div>
    </div>
  );
}
