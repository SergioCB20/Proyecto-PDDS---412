'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Settings, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

interface SesionResponse {
  id: string;
}

interface Configuracion {
  fecha_inicio_virtual: string;
  hora_inicio_virtual: string;
  prob_cancelacion: number;
  umbral_almacen_verde: number;
  umbral_almacen_ambar: number;
  umbral_vuelo_verde: number;
  umbral_vuelo_ambar: number;
}

export default function SimulacionPage() {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<Configuracion>({
    fecha_inicio_virtual: '2025-06-01',
    hora_inicio_virtual: '08:00',
    prob_cancelacion: 15,
    umbral_almacen_verde: 70,
    umbral_almacen_ambar: 90,
    umbral_vuelo_verde: 75,
    umbral_vuelo_ambar: 90,
  });

  const handleIniciar = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post<SesionResponse>('/sesiones', {
        tipo: 'SIMULADA',
        fecha_inicio_virtual: config.fecha_inicio_virtual,
        hora_inicio_virtual: config.hora_inicio_virtual + ':00',
        prob_cancelacion: config.prob_cancelacion / 100,
        umbrales_almacen: {
          verde_min: 0, verde_max: config.umbral_almacen_verde,
          ambar_min: config.umbral_almacen_verde, ambar_max: config.umbral_almacen_ambar,
          rojo_min: config.umbral_almacen_ambar, rojo_max: 100,
        },
        umbrales_vuelo: {
          verde_min: 0, verde_max: config.umbral_vuelo_verde,
          ambar_min: config.umbral_vuelo_verde, ambar_max: config.umbral_vuelo_ambar,
          rojo_min: config.umbral_vuelo_ambar, rojo_max: 100,
        },
      });
      const params = new URLSearchParams({
        ...config,
        prob_cancelacion: config.prob_cancelacion.toString(),
        umbral_almacen_verde: config.umbral_almacen_verde.toString(),
        umbral_almacen_ambar: config.umbral_almacen_ambar.toString(),
        umbral_vuelo_verde: config.umbral_vuelo_verde.toString(),
        umbral_vuelo_ambar: config.umbral_vuelo_ambar.toString(),
      });
      router.push(`/simulacion/${res.id}?${params}`);
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || 'Error al crear la sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <Settings size={24} className="text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Nueva Simulacion
          </h1>
          <p className="text-sm text-slate-500">
            Configura los parametros de la sesion de simulacion
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Fecha y Hora">
          <div className="space-y-4">
            <Input
              label="Fecha de inicio virtual"
              type="date"
              value={config.fecha_inicio_virtual}
              onChange={(e) => setConfig({ ...config, fecha_inicio_virtual: e.target.value })}
            />
            <Input
              label="Hora de inicio virtual"
              type="time"
              value={config.hora_inicio_virtual}
              onChange={(e) => setConfig({ ...config, hora_inicio_virtual: e.target.value })}
            />
          </div>
        </Card>

        <Card title="Probabilidad de Cancelacion">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Probabilidad de cancelacion de vuelos
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {config.prob_cancelacion}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={config.prob_cancelacion}
              onChange={(e) => setConfig({ ...config, prob_cancelacion: Number(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </Card>

        <Card title="Umbrales de Almacen">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Verde maximo (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={config.umbral_almacen_verde}
                onChange={(e) => setConfig({ ...config, umbral_almacen_verde: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Ambar maximo (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={config.umbral_almacen_ambar}
                onChange={(e) => setConfig({ ...config, umbral_almacen_ambar: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
          </div>
        </Card>

        <Card title="Umbrales de Vuelo">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Verde maximo (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={config.umbral_vuelo_verde}
                onChange={(e) => setConfig({ ...config, umbral_vuelo_verde: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Ambar maximo (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={config.umbral_vuelo_ambar}
                onChange={(e) => setConfig({ ...config, umbral_vuelo_ambar: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
          </div>
        </Card>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <Button size="lg" onClick={handleIniciar} disabled={loading}>
          <Play size={18} className="mr-2" />
          {loading ? 'Creando sesion...' : 'Iniciar Simulacion'}
        </Button>
      </div>
    </div>
  );
}