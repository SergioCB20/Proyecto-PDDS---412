export const COLOR_NODO = {
  VERDE: '#22c55e',
  AMBAR: '#eab308',
  ROJO: '#ef4444',
} as const;

export const COLOR_VUELO = {
  PROGRAMADO: '#3b82f6',
  EN_RUTA: '#22c55e',
  CANCELADO: '#ef4444',
  COMPLETADO: '#6b7280',
} as const;

export function colorNodoPorOcupacion(pct: number): string {
  if (pct < 70) return COLOR_NODO.VERDE;
  if (pct < 90) return COLOR_NODO.AMBAR;
  return COLOR_NODO.ROJO;
}
