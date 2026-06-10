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

const UMBRALES_DEFAULT = { verdeMax: 70, ambarMax: 90 } as const;

export function colorNodoPorOcupacion(
  pct: number,
  umbrales?: { verdeMax?: number; ambarMax?: number }
): string {
  const vm = umbrales?.verdeMax ?? UMBRALES_DEFAULT.verdeMax;
  const am = umbrales?.ambarMax ?? UMBRALES_DEFAULT.ambarMax;
  if (pct < vm) return COLOR_NODO.VERDE;
  if (pct < am) return COLOR_NODO.AMBAR;
  return COLOR_NODO.ROJO;
}

export function colorNodoDesdeTelemetria(colorStr: string): string {
  return COLOR_NODO[colorStr as keyof typeof COLOR_NODO] || COLOR_NODO.VERDE;
}
