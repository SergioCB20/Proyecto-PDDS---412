'use client';

import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import { Minus, Plus } from 'lucide-react';

const MIN_ZOOM = 2;
const MAX_ZOOM = 14;

export default function ControlZoom() {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on('zoomend', onZoom);
    return () => { map.off('zoomend', onZoom); };
  }, [map]);

  const pct = ((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100;

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    map.setZoom(val);
  };

  const handleZoomIn = () => {
    map.setZoom(Math.min(zoom + 0.5, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    map.setZoom(Math.max(zoom - 0.5, MIN_ZOOM));
  };

  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg p-3 min-w-[180px]">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Zoom</span>
        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 ml-auto">{pct.toFixed(0)}%</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-400"
        >
          <Minus size={14} />
        </button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.5}
          value={zoom}
          onChange={handleSlider}
          className="flex-1 h-1.5 accent-blue-600 cursor-pointer"
        />
        <button
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-400"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
