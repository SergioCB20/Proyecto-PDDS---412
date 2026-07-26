/**
 * Código IATA → zona horaria IANA de cada aeropuerto del plan de vuelos.
 * Debe cubrir TODOS los aeropuertos que el backend acepta (origen y destino),
 * no solo las sedes, para que las horas de salida y llegada se muestren en el
 * huso local del aeropuerto correspondiente. Fuente: seed V22__seed_zonas_horarias.sql.
 */
export const TZ_AERO: Record<string, string> = {
  // América del Sur
  SKBO: 'America/Bogota',
  SEQM: 'America/Guayaquil',
  SVMI: 'America/Caracas',
  SBBR: 'America/Sao_Paulo',
  SPIM: 'America/Lima',
  SLLP: 'America/La_Paz',
  SCEL: 'America/Santiago',
  SABE: 'America/Argentina/Buenos_Aires',
  SGAS: 'America/Asuncion',
  SUAA: 'America/Montevideo',
  // Europa
  LATI: 'Europe/Tirane',
  EDDI: 'Europe/Berlin',
  LOWW: 'Europe/Vienna',
  EBCI: 'Europe/Brussels',
  UMMS: 'Europe/Minsk',
  LBSF: 'Europe/Sofia',
  LKPR: 'Europe/Prague',
  LDZA: 'Europe/Zagreb',
  EKCH: 'Europe/Copenhagen',
  EHAM: 'Europe/Amsterdam',
  // Asia / Medio Oriente
  VIDP: 'Asia/Kolkata',
  OSDI: 'Asia/Damascus',
  OERK: 'Asia/Riyadh',
  OMDB: 'Asia/Dubai',
  OAKB: 'Asia/Kabul',
  OOMS: 'Asia/Muscat',
  OYSN: 'Asia/Aden',
  OPKC: 'Asia/Karachi',
  UBBB: 'Asia/Baku',
  OJAI: 'Asia/Amman',
};

/**
 * Zona horaria IANA del aeropuerto (por IATA), o undefined si no se conoce.
 * Útil para formatear timestamps en la hora local del aeropuerto correspondiente.
 */
export function tzDeIata(iata?: string | null): string | undefined {
  if (!iata) return undefined;
  return TZ_AERO[iata.toUpperCase()];
}

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