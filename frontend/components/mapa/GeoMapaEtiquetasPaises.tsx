'use client';

import { Marker, Tooltip, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { useEffect, useState, useCallback } from 'react';
import { PAISES_ES } from '@/lib/paises-es';

function ZoomListener({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMap();
  const handleZoom = useCallback(() => onZoom(map.getZoom()), [map, onZoom]);
  useEffect(() => {
    handleZoom();
    map.on('zoom', handleZoom);
    return () => {
      map.off('zoom', handleZoom);
    };
  }, [map, handleZoom]);
  return null;
}

export default function GeoMapaEtiquetasPaises() {
  const [zoom, setZoom] = useState(0);

  return (
    <>
      <ZoomListener onZoom={setZoom} />
      {zoom >= 3 &&
        Object.entries(PAISES_ES).map(([code, pais]) => (
          <Marker
            key={code}
            position={[pais.lat, pais.lng]}
            icon={divIcon({
              className: 'pais-hitarea',
              html: '',
              iconSize: [120, 120],
              iconAnchor: [60, 60],
            })}
          >
            <Tooltip direction="center" offset={[0, 0]} className="pais-tooltip">
              {pais.nombre}
            </Tooltip>
          </Marker>
        ))}
    </>
  );
}
