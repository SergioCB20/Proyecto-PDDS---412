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
