/**
 * Tabla de referencia de los aeropuertos del plan de vuelos (código IATA → ciudad y país).
 * El backend maneja los envíos/vuelos por código IATA; aquí se traduce a ciudad y país para
 * mostrarlo de forma legible en la UI (listas de nodos, vuelos, popups del mapa).
 *
 * Fuente: seed de nodos (V20__seed_nodos_vuelos.sql). Si se agregan aeropuertos al plan,
 * añadirlos aquí; lo no mapeado cae de vuelta al propio código IATA.
 */
export interface InfoAeropuerto {
  ciudad: string;
}

export const AEROPUERTOS: Record<string, InfoAeropuerto> = {
  // América del Sur
  SKBO: { ciudad: 'Bogotá' },
  SEQM: { ciudad: 'Quito' },
  SVMI: { ciudad: 'Caracas' },
  SBBR: { ciudad: 'Brasilia' },
  SPIM: { ciudad: 'Lima' },
  SLLP: { ciudad: 'La Paz' },
  SCEL: { ciudad: 'Santiago' },
  SABE: { ciudad: 'Buenos Aires' },
  SGAS: { ciudad: 'Asunción' },
  SUAA: { ciudad: 'Montevideo' },
  // Europa
  LATI: { ciudad: 'Tirana' },
  EDDI: { ciudad: 'Berlín' },
  LOWW: { ciudad: 'Viena' },
  EBCI: { ciudad: 'Bruselas' },
  UMMS: { ciudad: 'Minsk' },
  LBSF: { ciudad: 'Sofía' },
  LKPR: { ciudad: 'Praga' },
  LDZA: { ciudad: 'Zagreb' },
  EKCH: { ciudad: 'Copenhague' },
  EHAM: { ciudad: 'Ámsterdam' },
  // Asia / Medio Oriente
  VIDP: { ciudad: 'Delhi' },
  OSDI: { ciudad: 'Damasco' },
  OERK: { ciudad: 'Riad' },
  OMDB: { ciudad: 'Dubái' },
  OAKB: { ciudad: 'Kabul' },
  OOMS: { ciudad: 'Mascate' },
  OYSN: { ciudad: 'Saná' },
  OPKC: { ciudad: 'Karachi' },
  UBBB: { ciudad: 'Bakú' },
  OJAI: { ciudad: 'Amán' },
};

/** Info del aeropuerto por IATA, o undefined si no está en la tabla. */
export function infoAeropuerto(iata?: string | null): InfoAeropuerto | undefined {
  if (!iata) return undefined;
  return AEROPUERTOS[iata.toUpperCase()];
}

/** Ciudad del aeropuerto; si no se conoce, devuelve el propio código IATA. */
export function ciudadDe(iata?: string | null): string {
  return infoAeropuerto(iata)?.ciudad ?? (iata ?? '');
}

/** "Ciudad" legible; si no se conoce, el propio código IATA. */
export function etiquetaAeropuerto(iata?: string | null): string {
  const info = infoAeropuerto(iata);
  return info ? `${info.ciudad}` : (iata ?? '');
}

/** Etiqueta para selects/filtros: "IATA — Ciudad" (o solo IATA si no se conoce). */
export function etiquetaFiltroAeropuerto(iata?: string | null): string {
  const info = infoAeropuerto(iata);
  return info ? `${iata} — ${info.ciudad}` : (iata ?? '');
}
