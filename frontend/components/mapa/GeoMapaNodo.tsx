'use client';

import { CircleMarker, Tooltip, Popup } from 'react-leaflet';
import type { NodoEnMapa } from '@/lib/types';

interface GeoMapaNodoProps {
  nodo: NodoEnMapa;
}

export default function GeoMapaNodo({ nodo }: GeoMapaNodoProps) {
  const radius = 10;
  const pct = nodo.ocupacionPorcentaje;

  return (
    <CircleMarker
      key={`${nodo.id}-${nodo.color}-${Math.round(pct)}`}
      center={[nodo.latitud, nodo.longitud]}
      radius={radius}
      pathOptions={{
        color: nodo.color,
        fillColor: nodo.color,
        fillOpacity: 0.8,
        weight: 2,
      }}
    >
      <Tooltip permanent direction="top" offset={[0, -10]}>
        <div className="text-center min-w-[80px]">
          <div className="font-bold text-sm">{nodo.codigo_iata}</div>
          <div className="text-xs font-mono" style={{ color: nodo.color }}>
            {pct.toFixed(0)}%
          </div>
        </div>
      </Tooltip>
      <Popup>
        <div className="min-w-[180px]">
          <div className="font-bold text-base mb-1">{nodo.codigo_iata}</div>
          {nodo.capacidad_almacen > 0 && (
            <div className="text-sm text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span>Capacidad:</span>
                <span className="font-mono">{nodo.capacidad_almacen}</span>
              </div>
              <div className="flex justify-between">
                <span>Ocupado:</span>
                <span className="font-mono">{nodo.ocupacion_actual}</span>
              </div>
              <div className="flex justify-between">
                <span>Disponible:</span>
                <span className="font-mono">{nodo.capacidad_almacen - nodo.ocupacion_actual}</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    backgroundColor: nodo.color,
                  }}
                />
              </div>
              <div className="text-right text-xs font-semibold" style={{ color: nodo.color }}>
                {pct.toFixed(0)}% ocupado
              </div>
            </div>
          )}
          {nodo.capacidad_almacen === 0 && (
            <div className="text-sm text-slate-500">
              <div className="font-semibold" style={{ color: nodo.color }}>{pct.toFixed(0)}%</div>
            </div>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
}