'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plane, Settings, AlertTriangle, Monitor } from 'lucide-react';
import { device } from '@/lib/device';
import { useMode, type DashboardMode } from '@/lib/mode-context';

const TABS: { id: DashboardMode; label: string; icon: React.ReactNode }[] = [
  { id: 'operacion', label: 'Operación', icon: <Plane size={14} /> },
  { id: 'simulacion', label: 'Simulación', icon: <Settings size={14} /> },
  { id: 'colapso', label: 'Colapso', icon: <AlertTriangle size={14} /> },
];

export function Navbar() {
  const [deviceId] = useState(() => device.getId().slice(0, 8));
  const { mode, setMode } = useMode();

  return (
    <nav className="h-11 bg-slate-800 text-white flex items-center px-4 gap-4 shadow-md">
      <Link href="/" className="flex items-center gap-2 font-bold text-base shrink-0">
        <Plane size={18} className="text-blue-400" />
        <span>TASF B2B</span>
      </Link>

      <div className="flex items-center gap-1">
        {TABS.map((t) => {
          const activo = mode === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activo
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
        <Monitor size={13} />
        <span>Device: {deviceId}</span>
      </div>
    </nav>
  );
}
