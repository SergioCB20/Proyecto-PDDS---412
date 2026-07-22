'use client';

import { useMemo } from 'react';
import type {
  AeropuertoEnMapa,
  VueloEnMapa,
  TelemetriaMensaje,
} from './types';
import type { UmbralesConfig } from '@/components/mapa/ConfigUmbrales';
import { colorAeropuertoPorOcupacion } from './colors';

const ESTADOS_VUELO_VALIDOS = [
  'PROGRAMADO',
  'EN_RUTA',
  'CANCELADO',
  'COMPLETADO',
] as const;

/** Normaliza el estado de vuelo que llega del backend a la unión conocida. */
export function matchEstadoVuelo(valor: string): VueloEnMapa['estado'] {
  if (
    ESTADOS_VUELO_VALIDOS.includes(
      valor as (typeof ESTADOS_VUELO_VALIDOS)[number],
    )
  ) {
    return valor as VueloEnMapa['estado'];
  }
  return 'PROGRAMADO';
}

export type EstadoSesionMapa =
  | 'CONFIGURADA'
  | 'EN_CURSO'
  | 'PAUSADA'
  | 'FINALIZADA'
  | 'COLAPSADA';

export type EquipajeFiltro = 'todos' | 'con_equipaje' | 'sin_equipaje';

interface UseMapaDataParams {
  telemetria: TelemetriaMensaje | null;
  estadoSesion: EstadoSesionMapa;
  sesionId: string | null;
  initialAeropuertos: AeropuertoEnMapa[];
  initialVuelos: VueloEnMapa[];
  configUmbrales: UmbralesConfig;
  vueloFilterOrigen: string;
  vueloFilterDestino: string;
  equipajeFilter: EquipajeFiltro;
}

interface UseMapaDataResult {
  /** True cuando el WebSocket de ESTA sesión es la fuente de datos. */
  enVivo: boolean;
  aeropuertosMapa: AeropuertoEnMapa[];
  vuelosMapa: VueloEnMapa[];
  /** Vuelos filtrados listos para pintar en el mapa (EN_RUTA/PROGRAMADO + filtros). */
  vuelosVisibles: VueloEnMapa[];
}

/**
 * Deriva los datos del mapa (aeropuertos y vuelos) desde una fuente ÚNICA de
 * verdad, compartida por las vistas de Simulación y Colapso (antes duplicada).
 *
 * Con la sesión EN_CURSO y telemetría de ESTA sesión, el WebSocket es la única
 * fuente. initialVuelos/initialAeropuertos (REST) solo alimentan la vista previa
 * (antes de arrancar o en pausa). Alternar entre las dos fuentes causaba aviones
 * duplicados, saltos al origen, rutas fantasma y estados inconsistentes: un tick
 * de telemetría vacío hacía caer a datos REST viejos (sin posicionActual/progreso
 * → el avión saltaba al origen). En vivo, telemetría vacía = "sin vuelos en la
 * ventana", no datos obsoletos.
 */
export function useMapaData({
  telemetria,
  estadoSesion,
  sesionId,
  initialAeropuertos,
  initialVuelos,
  configUmbrales,
  vueloFilterOrigen,
  vueloFilterDestino,
  equipajeFilter,
}: UseMapaDataParams): UseMapaDataResult {
  const enVivo =
    (estadoSesion === 'EN_CURSO' || estadoSesion === 'PAUSADA') &&
    !!telemetria &&
    telemetria.sesion_id === sesionId;

  const aeropuertosMapa: AeropuertoEnMapa[] = useMemo(
    () =>
      enVivo && telemetria!.nodos.length > 0
        ? telemetria!.nodos.map((n) => ({
            id: n.id,
            codigo_iata: n.codigo_iata,
            nombre: n.codigo_iata,
            latitud: n.lat,
            longitud: n.lon,
            capacidad_almacen: n.capacidad_almacen,
            ocupacion_actual: n.ocupacion_actual,
            zona_horaria: '',
            color: colorAeropuertoPorOcupacion(n.ocupacion_pct, {
              verdeMax: configUmbrales.verdeMax,
              ambarMax: configUmbrales.ambarMax,
            }),
            ocupacionPorcentaje: n.ocupacion_pct,
            continente: n.continente,
          }))
        : initialAeropuertos,
    [
      enVivo,
      telemetria,
      initialAeropuertos,
      configUmbrales.verdeMax,
      configUmbrales.ambarMax,
    ],
  );

  const vuelosMapa: VueloEnMapa[] = useMemo(
    () =>
      enVivo
        ? telemetria!.vuelos.map((v) => ({
            id: v.id,
            codigo_vuelo: v.codigo_vuelo,
            estado: matchEstadoVuelo(v.estado),
            origen: { id: '', codigo_iata: v.origen_iata, nombre: v.origen_iata },
            destino: {
              id: '',
              codigo_iata: v.destino_iata,
              nombre: v.destino_iata,
            },
            origen_lat: v.origen_lat,
            origen_lon: v.origen_lon,
            destino_lat: v.destino_lat,
            destino_lon: v.destino_lon,
            hora_salida: v.hora_salida ?? '',
            hora_llegada: v.hora_llegada ?? '',
            capacidad_carga: v.capacidad_carga,
            carga_disponible: v.carga_disponible,
            es_plantilla: false,
            fecha_operacion: '',
            posicionActual: { lat: v.lat_actual, lon: v.lon_actual },
            progreso: v.progreso,
          }))
        : initialVuelos,
    [enVivo, telemetria, initialVuelos],
  );

  const vuelosVisibles: VueloEnMapa[] = useMemo(() => {
    if (estadoSesion !== 'EN_CURSO' && estadoSesion !== 'PAUSADA') return [];
    return vuelosMapa.filter(
      (v) =>
        (v.estado === 'EN_RUTA' || v.estado === 'PROGRAMADO') &&
        (!vueloFilterOrigen || v.origen.codigo_iata === vueloFilterOrigen) &&
        (!vueloFilterDestino || v.destino.codigo_iata === vueloFilterDestino) &&
        (equipajeFilter === 'todos' ||
          (equipajeFilter === 'con_equipaje'
            ? v.carga_disponible < v.capacidad_carga
            : v.carga_disponible >= v.capacidad_carga)),
    );
  }, [
    vuelosMapa,
    estadoSesion,
    vueloFilterOrigen,
    vueloFilterDestino,
    equipajeFilter,
  ]);

  return { enVivo, aeropuertosMapa, vuelosMapa, vuelosVisibles };
}
