'use client';

import { X } from 'lucide-react';

export interface UmbralesConfig {
  verdeMax: number;
  ambarMax: number;
}

interface ConfigUmbralesProps {
  config: UmbralesConfig;
  onConfigChange: (config: UmbralesConfig) => void;
  onClose: () => void;
}

export function ConfigUmbrales({ config, onConfigChange, onClose }: ConfigUmbralesProps) {
  const set = (key: keyof UmbralesConfig, val: number) =>
    onConfigChange({ ...config, [key]: Math.max(0, Math.min(100, val)) });

  return (
    <div className="absolute bottom-16 right-4 z-40 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Umbrales de Ocupación</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
          <X size={14} />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">VERDE</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400">Máx %</label>
              <input type="number" min={0} max={100} value={config.verdeMax}
                onChange={e => set('verdeMax', Number(e.target.value))}
                className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs" />
            </div>
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">ÁMBAR</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400">Máx %</label>
              <input type="number" min={0} max={100} value={config.ambarMax}
                onChange={e => set('ambarMax', Number(e.target.value))}
                className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
