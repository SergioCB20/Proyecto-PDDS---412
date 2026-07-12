'use client';

import { X } from 'lucide-react';
import type { UmbralesConfig } from './ConfigUmbrales';

interface Props {
  umbralesConfig?: UmbralesConfig;
  onClose?: () => void;
}

export default function GeoMapaLeyenda({ umbralesConfig, onClose }: Props) {
  const vm = umbralesConfig?.verdeMax ?? 70;
  const am = umbralesConfig?.ambarMax ?? 90;

  return (
    <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-slate-700 dark:text-slate-300">Ocupación</span>
        {onClose && (
          <button onClick={onClose} className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={12} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
        <span className="text-slate-600 dark:text-slate-300">&lt; {vm}%</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span>
        <span className="text-slate-600 dark:text-slate-300">{vm}–{am}%</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
        <span className="text-slate-600 dark:text-slate-300">&gt; {am}%</span>
      </div>
      <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
        <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Estado Vuelos</div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-0.5 bg-blue-500 inline-block"></span>
          <span className="text-slate-600 dark:text-slate-300">Programado</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-0.5 bg-green-500 inline-block"></span>
          <span className="text-slate-600 dark:text-slate-300">En ruta</span>
        </div>
      </div>
    </div>
  );
}
