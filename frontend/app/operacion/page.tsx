'use client';

import { useEffect, useState, useCallback } from 'react';
import { Package, Clock, MapPin, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { MOCK_NODOS, MOCK_VUELOS, nodoToEnMapa } from '@/lib/mock';
import { Badge } from '@/components/ui/Badge';
import type { Nodo, Vuelo, NodoEnMapa } from '@/lib/types';

const GeoMapa = dynamic(() => import('@/components/mapa/GeoMapa'), { ssr: false });

interface EquipajeReciente {
  id_externo: string;
  destino: string;
  estado: string;
  tiempo: string;
}

export default function OperacionPage() {
  const [nodos, setNodos] = useState<NodoEnMapa[]>(MOCK_NODOS.map(nodoToEnMapa));
  const [vuelos, setVuelos] = useState<Vuelo[]>(MOCK_VUELOS);
  const [equipajesRecientes, setEquipajesRecientes] = useState<EquipajeReciente[]>([
    { id_externo: 'MAL-2025-001', destino: 'MIA', estado: 'EN_VUELO', tiempo: 'hace 2 min' },
    { id_externo: 'MAL-2025-002', destino: 'BOG', estado: 'ENRUTADO', tiempo: 'hace 5 min' },
    { id_externo: 'MAL-2025-003', destino: 'GRU', estado: 'EN_VUELO', tiempo: 'hace 8 min' },
    { id_externo: 'MAL-2025-004', destino: 'SCL', estado: 'REGISTRADO', tiempo: 'hace 12 min' },
    { id_externo: 'MAL-2025-005', destino: 'MIA', estado: 'EN_ALMACEN', tiempo: 'hace 15 min' },
    { id_externo: 'MAL-2025-006', destino: 'LIM', estado: 'ENTREGADO', tiempo: 'hace 20 min' },
    { id_externo: 'MAL-2025-007', destino: 'BOG', estado: 'EN_VUELO', tiempo: 'hace 25 min' },
    { id_externo: 'MAL-2025-008', destino: 'GRU', estado: 'EN_REPLANIFICACION', tiempo: 'hace 30 min' },
  ]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [nodosData, vuelosData] = await Promise.all([
        api.get<Nodo[]>('/nodos').catch(() => MOCK_NODOS),
        api.get<{ content: Vuelo[] }>('/vuelos?size=50').catch(() => ({ content: MOCK_VUELOS })),
      ]);
      setNodos(Array.isArray(nodosData) ? nodosData.map(nodoToEnMapa) : MOCK_NODOS.map(nodoToEnMapa));
      const vuelosArray = 'content' in vuelosData ? vuelosData.content : (Array.isArray(vuelosData) ? vuelosData : MOCK_VUELOS);
      setVuelos(vuelosArray);
      setLastUpdate(new Date());
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const estadoColor = (estado: string): 'green' | 'yellow' | 'red' | 'blue' | 'default' => {
    if (estado === 'ENTREGADO') return 'green';
    if (estado === 'EN_VUELO' || estado === 'EN_ALMACEN') return 'blue';
    if (estado === 'EN_REPLANIFICACION') return 'yellow';
    if (estado === 'INCUMPLIMIENTO_SLA') return 'red';
    return 'default';
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="flex-1 p-4">
        <GeoMapa
          nodos={nodos}
          vuelos={vuelos}
          mostrarAviones={true}
          animacionActiva={false}
          className="h-full"
        />
      </div>

      <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-slate-100">Operacion en Vivo</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ultima actualizacion: {lastUpdate ? lastUpdate.toLocaleTimeString('es-ES') : '...'}
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 disabled:opacity-50"
              title="Actualizar"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <Package size={16} className="text-slate-400" />
            <h3 className="font-medium text-sm text-slate-700 dark:text-slate-300">
              Equipajes Recientes
            </h3>
            <Badge variant="blue">{equipajesRecientes.length}</Badge>
          </div>

          <div className="space-y-2">
            {equipajesRecientes.map((eq, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700">
                  <Package size={14} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {eq.id_externo}
                    </span>
                    <Badge variant={estadoColor(eq.estado)}>{eq.estado.replace('_', ' ')}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <MapPin size={11} className="text-slate-400" />
                    <span className="text-xs text-slate-500">{eq.destino}</span>
                    <Clock size={11} className="text-slate-400 ml-2" />
                    <span className="text-xs text-slate-400">{eq.tiempo}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="font-medium text-sm text-slate-700 dark:text-slate-300 mb-3">
              Resumen de Nodos
            </h3>
            <div className="space-y-2">
              {nodos.map((nodo) => (
                <div key={nodo.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {nodo.codigo_iata}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {nodo.ocupacion_actual}/{nodo.capacidad_almacen}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: nodo.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-400 text-center">
            Polling cada 5s — preparado para Redis
          </p>
        </div>
      </div>
    </div>
  );
}