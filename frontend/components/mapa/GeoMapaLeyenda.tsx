'use client';

export default function GeoMapaLeyenda() {
  return (
    <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg p-3 text-xs">
      <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Ocupación Aeropuertos</div>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
        <span className="text-slate-600 dark:text-slate-400">&lt; 70%</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span>
        <span className="text-slate-600 dark:text-slate-400">70-90%</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
        <span className="text-slate-600 dark:text-slate-400">&gt; 90%</span>
      </div>
      <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2">
        <div className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Estado Vuelos</div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-0.5 bg-blue-500 inline-block"></span>
          <span className="text-slate-600 dark:text-slate-400">Programado</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-0.5 bg-green-500 inline-block"></span>
          <span className="text-slate-600 dark:text-slate-400">En ruta</span>
        </div>
      </div>
    </div>
  );
}