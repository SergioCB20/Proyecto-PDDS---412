export const COLOR_AEROPUERTO = {
  VACIO: '#9ca3af',
  VERDE: '#22c55e',
  AMBAR: '#eab308',
  ROJO: '#ef4444',
} as const;

export const COLOR_VUELO = {
  PROGRAMADO: '#ffffff',
  EN_RUTA: '#f97316',
  CANCELADO: '#ef4444',
  COMPLETADO: '#6b7280',
  VACIO: '#9ca3af',
} as const;

const UMBRALES_DEFAULT = { verdeMax: 70, ambarMax: 90 } as const;

export function colorVueloPorEstado(estado: string | null | undefined): string {
  return COLOR_VUELO[estado as keyof typeof COLOR_VUELO] ?? COLOR_VUELO.VACIO;
}

export function colorAeropuertoPorOcupacion(
  pct: number,
  umbrales?: { verdeMax?: number; ambarMax?: number }
): string {
  if (pct <= 0) return COLOR_AEROPUERTO.VACIO;
  const vm = umbrales?.verdeMax ?? UMBRALES_DEFAULT.verdeMax;
  const am = umbrales?.ambarMax ?? UMBRALES_DEFAULT.ambarMax;
  if (pct < vm) return COLOR_AEROPUERTO.VERDE;
  if (pct < am) return COLOR_AEROPUERTO.AMBAR;
  return COLOR_AEROPUERTO.ROJO;
}

export type ColorSemaforo = 'VACIO' | 'VERDE' | 'AMBAR' | 'ROJO';

export function determinarColorSemaforo(
  pct: number,
  umbrales?: { verdeMax?: number; ambarMax?: number }
): ColorSemaforo {
  if (pct <= 0) return 'VACIO';
  const vm = umbrales?.verdeMax ?? UMBRALES_DEFAULT.verdeMax;
  const am = umbrales?.ambarMax ?? UMBRALES_DEFAULT.ambarMax;
  if (pct < vm) return 'VERDE';
  if (pct < am) return 'AMBAR';
  return 'ROJO';
}


