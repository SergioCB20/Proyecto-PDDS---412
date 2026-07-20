'use client';

import { Marker, useMap } from 'react-leaflet';
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

// Escape básico para evitar romper el HTML del divIcon con nombres con caracteres especiales.
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Nombres de países en español ESCRITOS sobre el mapa (etiqueta permanente, no tooltip/hover).
 * El tile base es "sin etiquetas", así que estas son las únicas etiquetas de país. Se dibujan
 * como divIcon no interactivo con halo blanco para legibilidad sobre los tiles.
 */
export default function GeoMapaEtiquetasPaises() {
  const [zoom, setZoom] = useState(0);

  return (
    <>
      <ZoomListener onZoom={setZoom} />
      {zoom >= 2 &&
        Object.entries(PAISES_ES).map(([code, pais]) => (
          <Marker
            key={code}
            position={[pais.lat, pais.lng]}
            interactive={false}
            keyboard={false}
            icon={divIcon({
              className: 'pais-label',
              html: `<span>${esc(pais.nombre)}</span>`,
              iconSize: [140, 16],
              iconAnchor: [70, 8],
            })}
          />
        ))}
    </>
  );
}
