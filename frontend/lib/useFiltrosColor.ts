'use client';

import { useCallback, useState } from 'react';
import type { ColorSemaforo } from './colors';

/** Colores de ocupación filtrables (los que existen como marcador en el mapa). */
export const COLORES_OCUPACION: ColorSemaforo[] = ['VACIO', 'VERDE', 'AMBAR', 'ROJO'];

function toggle(set: Set<ColorSemaforo>, color: ColorSemaforo): Set<ColorSemaforo> {
  const next = new Set(set);
  if (next.has(color)) next.delete(color);
  else next.add(color);
  return next;
}

/**
 * Estado multi-select (checkboxes) de colores de ocupación visibles para almacenes
 * (aeropuertos) y vuelos. Arranca con todos visibles → sin efecto hasta destildar.
 * Se comparte entre la barra de métricas (UI de checkboxes) y el mapa (filtrado).
 */
export function useFiltrosColor() {
  const [aeropuerto, setAeropuerto] = useState<Set<ColorSemaforo>>(() => new Set(COLORES_OCUPACION));
  const [vuelo, setVuelo] = useState<Set<ColorSemaforo>>(() => new Set(COLORES_OCUPACION));
  const toggleAeropuerto = useCallback((c: ColorSemaforo) => setAeropuerto((p) => toggle(p, c)), []);
  const toggleVuelo = useCallback((c: ColorSemaforo) => setVuelo((p) => toggle(p, c)), []);
  return { aeropuerto, vuelo, toggleAeropuerto, toggleVuelo };
}
