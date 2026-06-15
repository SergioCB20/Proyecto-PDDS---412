'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchEntregadosRecientes } from '@/lib/api';
import type { EnvioEntregadoResponse } from '@/lib/types';

interface PanelEntregadosProps {
  sesionId: string;
  activo: boolean;
}

export function PanelEntregados({ sesionId, activo }: PanelEntregadosProps) {
  const [data, setData] = useState<EnvioEntregadoResponse[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const cargar = async () => {
    try {
      const result = await fetchEntregadosRecientes(sesionId, 4);
      setData(result);
      setError('');
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || 'Error al cargar entregados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    cargar();

    if (activo) {
      intervalRef.current = setInterval(cargar, 5000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sesionId, activo]);

  return (
    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Ultimos entregados (4h)
        </h3>
        {activo && (
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Actualizando..." />
        )}
      </div>

      {loading && (
        <p className="text-xs text-slate-400 italic text-center py-2">Cargando entregados...</p>
      )}

      {error && (
        <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-2 rounded">
          {error}
        </div>
      )}

      {!loading && !error && data && data.length === 0 && (
        <p className="text-xs text-slate-400 italic text-center py-2">Sin entregas recientes</p>
      )}

      {!loading && !error && data && data.length > 0 && (
        <div className="space-y-1 max-h-56 overflow-y-auto">
          {data.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-50 dark:bg-slate-800/50 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-medium text-slate-700 dark:text-slate-300">{item.codigo_vuelo}</span>
                <span className="text-slate-400">
                  {item.origen_iata}&rarr;{item.destino_iata}
                </span>
              </div>
              <span className="text-slate-500 shrink-0">{item.cantidad} maleta{item.cantidad !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
