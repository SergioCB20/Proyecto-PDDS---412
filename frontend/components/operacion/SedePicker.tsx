'use client';

import { ArrowLeft, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { tzAbrev } from '@/lib/timezone';

const SEDES = [
  { id: 'spim', codigo_iata: 'SPIM', nombre: 'Lima (Perú)' },
  { id: 'sabe', codigo_iata: 'SABE', nombre: 'Buenos Aires (Argentina)' },
  { id: 'ekch', codigo_iata: 'EKCH', nombre: 'Copenhague (Dinamarca)' },
  { id: 'vidp', codigo_iata: 'VIDP', nombre: 'Delhi (India)' },
];

export default function SedePicker({ onPick }: { onPick: (iata: string) => void }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <button
        onClick={() => router.push('/')}
        className="mb-4 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 shadow border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
      >
        <ArrowLeft size={13} />
        Volver
      </button>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Building2 size={48} className="mx-auto text-blue-600 mb-3" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Operación — Seleccionar Sede
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            ¿En qué aeropuerto se encuentra esta computadora?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SEDES.map(s => (
            <button
              key={s.id}
              onClick={() => onPick(s.codigo_iata)}
              className="p-5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
            >
              <div className="text-2xl font-bold text-blue-600 font-mono">{s.codigo_iata}</div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-1">
                {s.nombre}
              </div>
              <div className="text-xs text-slate-500 mt-1">{tzAbrev(s.codigo_iata)}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
