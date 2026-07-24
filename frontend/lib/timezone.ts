export const TZ_AERO: Record<string, string> = {
  SPIM: 'America/Lima',
  SABE: 'America/Argentina/Buenos_Aires',
  EKCH: 'Europe/Copenhagen',
  VIDP: 'Asia/Kolkata',
};

export function tzAbrev(iata: string): string {
  const map: Record<string, string> = {
    SPIM: 'UTC-5',
    SABE: 'UTC-3',
    EKCH: 'UTC+1',
    VIDP: 'UTC+5:30',
  };
  return map[iata] ?? 'UTC';
}

export function formatLocal(iata: string, date: Date): string {
  const tz = TZ_AERO[iata];
  if (!tz) return date.toLocaleString();
  try {
    return date.toLocaleString('es-PE', { timeZone: tz, hour12: false });
  } catch {
    return date.toLocaleString();
  }
}

export function formatDateLocal(iata: string, date: Date): string {
  const tz = TZ_AERO[iata];
  if (!tz) return date.toISOString().slice(0, 10);
  try {
    return date.toLocaleDateString('es-PE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}