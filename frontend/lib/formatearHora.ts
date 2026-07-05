/**
 * Convierte un string ISO 8601 UTC a hora local del navegador.
 * Formato: DD/MM/YYYY HH:MM
 */
export function formatearHoraLocal(isoStr: string | null | undefined): string {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('es-PE', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
}

/**
 * Solo la parte de hora HH:MM:SS en hora local.
 */
export function formatearHoraLocalCorta(isoStr: string | null | undefined): string {
  if (!isoStr) return '--:--';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleString('es-PE', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
}

/**
 * Fecha + hora compacta, una sola linea ej. "17/07 13:40".
 * Pensada para chips dentro de items ajustados (vuelos, equipajes, tramos).
 */
export function formatearFechaHoraCorta(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '—';
  const fecha = d.toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit',
  });
  const hora = d.toLocaleTimeString('es-PE', {
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
  return `${fecha} ${hora}`;
}

/**
 * Devuelve la fecha formateada (DD/MM/YYYY) y la hora (HH:MM) por separado para
 * componer visualmente un item con la fecha como subtítulo y la hora destacada.
 */
export function formatearFechaHoraSeparado(isoStr: string | null | undefined): { fecha: string; hora: string } {
  if (!isoStr) return { fecha: '—', hora: '—' };
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return { fecha: '—', hora: '—' };
  return {
    fecha: d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' }),
    hora: d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}

const LIMA_TZ = 'America/Lima';

/**
 * Fecha + hora compacta SIEMPRE en hora Lima (America/Lima), independiente del TZ del
 * navegador. Pensada para renderizar el reloj virtual de la sesion, que el backend ya
 * almacena con offset -05 (Lima). Evita confusion cuando el navegador del operador
 * no esta en -05 y mostraba horas desfasadas (ej. UTC veia "19:40" en vez de "14:40").
 * Formato salida: "YYYY-MM-DD HH:MM:SS".
 */
export function formatearFechaHoraCortaLima(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '—';
  const fecha = d.toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: LIMA_TZ,
  });
  const hora = d.toLocaleTimeString('es-PE', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: LIMA_TZ,
  });
  return `${fecha} ${hora}`;
}

/**
 * Solo la parte de hora HH:MM en hora Lima. Util cuando el reloj virtual debe
 * compararse visualmente contra las horas de salida/llegada del panel de vuelos
 * (que tambien se muestran en Lima porque el backend emite con offset -05).
 */
export function formatearHoraLima(isoStr: string | null | undefined): string {
  if (!isoStr) return '--:--';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('es-PE', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: LIMA_TZ,
  });
}

