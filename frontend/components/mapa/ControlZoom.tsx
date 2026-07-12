'use client';

import { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import { Minus, Plus } from 'lucide-react';

const MIN_ZOOM = 2;
const MAX_ZOOM = 14;
const SLIDER_MIN = 0;
const SLIDER_MAX = 200;
const SLIDER_STEP = 1;

const toLeaflet = (slider: number) =>
  MIN_ZOOM + (slider / SLIDER_MAX) * (MAX_ZOOM - MIN_ZOOM);

const toSlider = (leafletZoom: number) =>
  Math.round(((leafletZoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * SLIDER_MAX);

export default function ControlZoom() {
  const map = useMap();
  const [display, setDisplay] = useState(() => toSlider(map.getZoom()));

  useEffect(() => {
    const onZoom = () => setDisplay(toSlider(map.getZoom()));
    map.on('zoomend', onZoom);
    return () => { map.off('zoomend', onZoom); };
  }, [map]);

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    map.setZoom(toLeaflet(Number(e.target.value)));
  };

  const handleZoomIn = () => {
    const current = toSlider(map.getZoom());
    const next = Math.min(current + 1, SLIDER_MAX);
    map.setZoom(toLeaflet(next));
  };

  const handleZoomOut = () => {
    const current = toSlider(map.getZoom());
    const next = Math.max(current - 1, SLIDER_MIN);
    map.setZoom(toLeaflet(next));
  };

  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg p-3 min-w-[180px]">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Zoom</span>
        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 ml-auto">{display}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleZoomOut}
          disabled={display <= SLIDER_MIN}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
        >
          <Minus size={14} />
        </button>
        <input
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={SLIDER_STEP}
          value={display}
          onChange={handleSlider}
          className="flex-1 h-1.5 accent-blue-600 cursor-pointer"
        />
        <button
          onClick={handleZoomIn}
          disabled={display >= SLIDER_MAX}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
