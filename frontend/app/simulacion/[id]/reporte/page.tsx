'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, RefreshCw, MapPin, FileText } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Dot,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { MOCK_REPORTE_SESION } from '@/lib/mock';
import { api } from '@/lib/api';
import type { ReporteSesion, PuntoSLA } from '@/lib/types';

function formatearMomento(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-ES', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CustomDot(props: { cx?: number; cy?: number; index?: number; payload?: PuntoSLA }) {
  const { cx, cy, payload } = props;
  if (!payload?.hubo_cancelacion || cx == null || cy == null) return null;
  return (
    <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />
  );
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; payload: PuntoSLA }[]; label?: string;
}) {
  if (!active || !payload || !payload.length) return null;
  const punto = payload[0].payload;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-slate-900 dark:text-slate-100">
        {formatearMomento(punto.momento_virtual)}
      </p>
      <p className="text-slate-600 dark:text-slate-300">
        SLA: <span className="font-semibold">{punto.sla_pct}%</span>
      </p>
      <p className="text-slate-600 dark:text-slate-300">
        Cancelacion: <span className={`font-semibold ${punto.hubo_cancelacion ? 'text-red-500' : 'text-green-500'}`}>
          {punto.hubo_cancelacion ? 'Si' : 'No'}
        </span>
      </p>
    </div>
  );
}

function ResumenCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
        <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
      </div>
    </Card>
  );
}

export default function ReportePage() {
  const params = useParams();
  const sesionId = params.id as string;

  const [reporte, setReporte] = useState<ReporteSesion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ReporteSesion>(`/sesiones/${sesionId}/reporte`)
      .then(setReporte)
      .catch(() => {
        setReporte({
          ...MOCK_REPORTE_SESION,
          sesion_id: sesionId,
        });
      })
      .finally(() => setLoading(false));
  }, [sesionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Cargando reporte...</div>
      </div>
    );
  }

  if (!reporte) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">No se pudo cargar el reporte</div>
      </div>
    );
  }

  const slaLabel = `${reporte.sla_incumplido_pct.toFixed(1)}%`;
  const colapsoLabel = reporte.punto_colapso_virtual
    ? formatearMomento(reporte.punto_colapso_virtual)
    : 'Sin colapso';
  const causaLabel = reporte.causa_colapso || '—';

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/simulacion/${sesionId}`}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Reporte de Simulacion
          </h1>
          <p className="text-sm text-slate-500 font-mono">
            Sesion: {reporte.sesion_id}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ResumenCard
          label="SLA Incumplido"
          value={slaLabel}
          icon={AlertTriangle}
          color="bg-red-500"
        />
        <ResumenCard
          label="Replanificadas"
          value={reporte.total_replanificadas}
          icon={RefreshCw}
          color="bg-blue-500"
        />
        <ResumenCard
          label="Punto de Colapso"
          value={colapsoLabel}
          icon={MapPin}
          color="bg-orange-500"
        />
        <ResumenCard
          label="Causa de Colapso"
          value={causaLabel}
          icon={FileText}
          color="bg-purple-500"
        />
      </div>

      <Card title="Evolucion SLA vs Tiempo">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={reporte.serie_sla}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="momento_virtual"
                tickFormatter={formatearMomento}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                unit="%"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="sla_pct"
                name="SLA %"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={{ r: 4, fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
