// Helpers para comparar la hora de salida de una plantilla contra el reloj virtual.
//
// Contexto: la columna `vuelos.hora_salida` para filas `es_plantilla=true` es un
// `TIMESTAMPTZ` absoluto apuntando al primer día de la migración V20 (entre
// 2026-01-15 y 2026-01-16). El reloj virtual del sesion es otro `OffsetDateTime`
// que el tick adelanta segun k. Sin re-anclar la hora de la plantilla al día
// virtual actual, la diferencia se distorsiona pasados unos minutos reales
// (a k=120, ~80 min reales ya cruzaste todo el horizonte de las plantillas).

/**
 * Minutos entre ahora-virtual y la salida canonica de la plantilla,
 * re-anclando esa salida al día virtual actual.
 *
 * Caso simple: minutosHastaSalida >= 0 si aun no salio, < 0 si ya salio.
 *
 * @param plantillaHoraSalidaIso ISO string de `Vuelo.hora_salida` (plantilla).
 * @param momentoVirtualIso      ISO string de la metrica virtual (`metricas.dia_hora_virtual`).
 * @returns minutos redondeados hacia abajo. `null` si alguna fecha es invalida.
 */
export function minutosHastaSalidaPlantilla(
  plantillaHoraSalidaIso: string,
  momentoVirtualIso: string,
): number | null {
  const mv = new Date(momentoVirtualIso);
  const hs = new Date(plantillaHoraSalidaIso);
  if (isNaN(mv.getTime()) || isNaN(hs.getTime())) return null;

  // Re-anclar: tomar la hora-del-dia de la plantilla y colocarla sobre la fecha
  // virtual actual. Construimos el timestamp con Date.UTC para evitar el offset
  // del navegador; las dos fechas llegan con su offset desde el backend, y
  // getUTCHours/getUTCMinutes devuelven los componentes absolutos del epoch.
  const plantillaEnHoyUtc = Date.UTC(
    mv.getUTCFullYear(),
    mv.getUTCMonth(),
    mv.getUTCDate(),
    hs.getUTCHours(),
    hs.getUTCMinutes(),
    hs.getUTCSeconds(),
  );
  return Math.floor((plantillaEnHoyUtc - mv.getTime()) / 60000);
}

/** True si faltan <= 60 min para la salida canonica de la plantilla. */
export function esPlantillaCaliente(
  plantillaHoraSalidaIso: string,
  momentoVirtualIso: string,
): boolean {
  const min = minutosHastaSalidaPlantilla(
    plantillaHoraSalidaIso,
    momentoVirtualIso,
  );
  return min !== null && min <= 60;
}
