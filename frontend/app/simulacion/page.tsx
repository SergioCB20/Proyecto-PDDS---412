'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Settings, AlertCircle, ArrowRight, Clock, Square } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

interface SesionListaItem {
  id: string;
  tipo: string;
  tipo_simulacion: string;
  estado: string;
  fecha_inicio_virtual: string;
  created_at: string;
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
  const [sesionesActivas, setSesionesActivas] = useState<SesionListaItem[]>([]);
  const [finalizandoId, setFinalizandoId] = useState<string | null>(null);

  const [config, setConfig] = useState<Configuracion>({
    fecha_inicio_virtual: '2025-06-01',
    hora_inicio_virtual: '08:00',
    prob_cancelacion: 15,
    umbral_almacen_verde: 70,
    umbral_almacen_ambar: 90,
    umbral_vuelo_verde: 75,
    umbral_vuelo_ambar: 90,
  });

  useEffect(() => {
    api.get<SesionListaItem[]>('/sesiones?estado=EN_CURSO').then(enCurso =>
      api.get<SesionListaItem[]>('/sesiones?estado=PAUSADA').then(pausadas => {
        setSesionesActivas([...enCurso, ...pausadas]);
      })
    ).catch(() => {});
  }, []);

  const sesionEnCurso = sesionesActivas.find(s => s.estado === 'EN_CURSO');
  const sesionPausada = sesionesActivas.find(s => s.estado === 'PAUSADA');

  const handleFinalizar = async (id: string) => {
    setFinalizandoId(id);
    setError('');
    try {
      await api.post(`/sesiones/${id}/detener`, {});
      setSesionesActivas(prev => prev.filter(s => s.id !== id));
    } catch (err: unknown) {
      const e = err as { mensaje?: string; message?: string };
      setError(e.mensaje || e.message || 'Error al finalizar la sesion');
    } finally {
      setFinalizandoId(null);
    }
  };

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
            Simulacion
          </h1>
          <p className="text-sm text-slate-500">
            Configura los parametros de la sesion de simulacion
          </p>
        </div>
      </div>

      {sesionEnCurso && (
        <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Simulacion activa detectada
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Fecha virtual: {sesionEnCurso.fecha_inicio_virtual} &middot; Creada: {new Date(sesionEnCurso.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              disabled={finalizandoId === sesionEnCurso.id}
              onClick={() => handleFinalizar(sesionEnCurso.id)}
            >
              <Square size={14} className="mr-1" />
              {finalizandoId === sesionEnCurso.id ? 'Finalizando...' : 'Finalizar'}
            </Button>
            <Button size="sm" onClick={() => router.push(`/simulacion/${sesionEnCurso.id}?fecha_inicio_virtual=${sesionEnCurso.fecha_inicio_virtual}`)}>
              <ArrowRight size={14} className="mr-1" />
              Reanudar
            </Button>
          </div>
        </div>
      )}

      {sesionPausada && !sesionEnCurso && (
        <div className="mb-6 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Square size={20} className="text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Simulacion pausada detectada
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Fecha virtual: {sesionPausada.fecha_inicio_virtual} &middot; Creada: {new Date(sesionPausada.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              disabled={finalizandoId === sesionPausada.id}
              onClick={() => handleFinalizar(sesionPausada.id)}
            >
              <Square size={14} className="mr-1" />
              {finalizandoId === sesionPausada.id ? 'Finalizando...' : 'Finalizar'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => router.push(`/simulacion/${sesionPausada.id}?fecha_inicio_virtual=${sesionPausada.fecha_inicio_virtual}`)}>
              <ArrowRight size={14} className="mr-1" />
              Continuar
            </Button>
          </div>
        </div>
      )}

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

interface SesionResponse {
  id: string;
}
