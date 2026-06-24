'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Package, Plane } from 'lucide-react';
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

  useEffect(() => {
    let mounted = true;
    const cargar = async () => {
      try {
        const data = await fetchMetricasOperacion();
        if (mounted) setMetricas(data);
      } catch { /* ignore */ }
    };
    cargar();
    const interval = setInterval(cargar, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

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
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Métricas del Día</h3>
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
