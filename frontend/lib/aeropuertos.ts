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
  pais: string;
}

export const AEROPUERTOS: Record<string, InfoAeropuerto> = {
  // América del Sur
  SKBO: { ciudad: 'Bogotá', pais: 'Colombia' },
  SEQM: { ciudad: 'Quito', pais: 'Ecuador' },
  SVMI: { ciudad: 'Caracas', pais: 'Venezuela' },
  SBBR: { ciudad: 'Brasilia', pais: 'Brasil' },
  SPIM: { ciudad: 'Lima', pais: 'Perú' },
  SLLP: { ciudad: 'La Paz', pais: 'Bolivia' },
  SCEL: { ciudad: 'Santiago', pais: 'Chile' },
  SABE: { ciudad: 'Buenos Aires', pais: 'Argentina' },
  SGAS: { ciudad: 'Asunción', pais: 'Paraguay' },
  SUAA: { ciudad: 'Montevideo', pais: 'Uruguay' },
  // Europa
  LATI: { ciudad: 'Tirana', pais: 'Albania' },
  EDDI: { ciudad: 'Berlín', pais: 'Alemania' },
  LOWW: { ciudad: 'Viena', pais: 'Austria' },
  EBCI: { ciudad: 'Bruselas', pais: 'Bélgica' },
  UMMS: { ciudad: 'Minsk', pais: 'Bielorrusia' },
  LBSF: { ciudad: 'Sofía', pais: 'Bulgaria' },
  LKPR: { ciudad: 'Praga', pais: 'Chequia' },
  LDZA: { ciudad: 'Zagreb', pais: 'Croacia' },
  EKCH: { ciudad: 'Copenhague', pais: 'Dinamarca' },
  EHAM: { ciudad: 'Ámsterdam', pais: 'Países Bajos' },
  // Asia / Medio Oriente
  VIDP: { ciudad: 'Delhi', pais: 'India' },
  OSDI: { ciudad: 'Damasco', pais: 'Siria' },
  OERK: { ciudad: 'Riad', pais: 'Arabia Saudita' },
  OMDB: { ciudad: 'Dubái', pais: 'Emiratos Árabes Unidos' },
  OAKB: { ciudad: 'Kabul', pais: 'Afganistán' },
  OOMS: { ciudad: 'Mascate', pais: 'Omán' },
  OYSN: { ciudad: 'Saná', pais: 'Yemen' },
  OPKC: { ciudad: 'Karachi', pais: 'Pakistán' },
  UBBB: { ciudad: 'Bakú', pais: 'Azerbaiyán' },
  OJAI: { ciudad: 'Amán', pais: 'Jordania' },
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

/** País del aeropuerto (cadena vacía si se desconoce). */
export function paisDe(iata?: string | null): string {
  return infoAeropuerto(iata)?.pais ?? '';
}

/** "Ciudad, País" legible; si no se conoce, el propio código IATA. */
export function etiquetaAeropuerto(iata?: string | null): string {
  const info = infoAeropuerto(iata);
  return info ? `${info.ciudad}, ${info.pais}` : (iata ?? '');
}

/** Etiqueta para selects/filtros: "IATA — Ciudad" (o solo IATA si no se conoce). */
export function etiquetaFiltroAeropuerto(iata?: string | null): string {
  const info = infoAeropuerto(iata);
  return info ? `${iata} — ${info.ciudad}` : (iata ?? '');
}
