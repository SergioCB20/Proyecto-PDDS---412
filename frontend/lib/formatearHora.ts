const LIMA_TZ = 'America/Lima';

function pad(n: number, w = 2): string {
  return n.toString().padStart(w, '0');
}

function formatDate(d: Date, tz?: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: tz,
  }).formatToParts(d);
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  return `${day}/${month}/${year}`;
}

function formatTime(d: Date, tz?: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: tz,
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const second = parts.find((p) => p.type === 'second')?.value ?? '00';
  return `${hour}:${minute}:${second}`;
}

function parseOrNull(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * DD/MM/YYYY HH:MM:SS en hora local del navegador. "-" si vacio o invalido.
 */
export function formatearFechaHora(
  iso: string | null | undefined,
): string {
  const d = parseOrNull(iso);
  if (!d) return '-';
  return `${formatDate(d)} ${formatTime(d)}`;
}

/**
 * DD/MM/YYYY HH:MM:SS en hora Lima (America/Lima). "-" si vacio o invalido.
 * Pensada para timestamps del backend (que almacena con offset -05).
 */
export function formatearFechaHoraLima(
  iso: string | null | undefined,
): string {
  const d = parseOrNull(iso);
  if (!d) return '-';
  return `${formatDate(d, LIMA_TZ)} ${formatTime(d, LIMA_TZ)}`;
}

/**
 * Solo HH:MM:SS en hora Lima. "-" si vacio o invalido.
 */
export function formatearHoraLima(
  iso: string | null | undefined,
): string {
  const d = parseOrNull(iso);
  if (!d) return '-';
  return formatTime(d, LIMA_TZ);
}

/**
 * Fecha y hora por separado, mismo formato canonico. "-" si vacio o invalido.
 */
export function formatearFechaHoraSeparado(
  iso: string | null | undefined,
): { fecha: string; hora: string } {
  const d = parseOrNull(iso);
  if (!d) return { fecha: '-', hora: '-' };
  return {
    fecha: formatDate(d, LIMA_TZ),
    hora: formatTime(d, LIMA_TZ),
  };
}

/**
 * Convierte una duracion en segundos a HH:MM:SS. "-" si <= 0.
 */
export function formatDuracionHHMMSS(segundos: number | null | undefined): string {
  if (!segundos || segundos <= 0) return '-';
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// Aliases legacy (referencias historicas) — todos producen el mismo formato canonico.
export const formatearHoraLocal = formatearFechaHora;
export const formatearHoraLocalCorta = formatearFechaHoraLima;
export const formatearFechaHoraCorta = formatearFechaHoraLima;
export const formatearFechaHoraCortaLima = formatearFechaHoraLima;
