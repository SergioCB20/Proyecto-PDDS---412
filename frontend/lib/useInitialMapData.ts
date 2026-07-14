'use client';

import { useState, useEffect } from 'react';
import { api } from './api';
import { colorAeropuertoPorOcupacion } from './colors';
import type {
  Aeropuerto,
  AeropuertoEnMapa,
  Vuelo,
  VueloEnMapa,
  VueloPageResponse,
} from './types';
import type { UmbralesConfig } from '@/components/mapa/ConfigUmbrales';
import type { EstadoSesionMapa } from './useMapaData';

interface UseInitialMapDataParams {
  sesionId: string | null;
  estadoSesion: EstadoSesionMapa;
  configUmbrales: UmbralesConfig;
}

interface UseInitialMapDataResult {
  initialAeropuertos: AeropuertoEnMapa[];
  initialVuelos: VueloEnMapa[];
  /** Limpia los datos de vista previa (al arrancar una sesión). */
  resetInitialData: () => void;
}

/**
 * Carga por REST los datos de VISTA PREVIA del mapa (aeropuertos y vuelos), usados
 * antes de arrancar la sesión o en pausa. Con la sesión EN_CURSO el polling se
 * detiene: la telemetría (WebSocket) pasa a ser la fuente única (ver useMapaData).
 * Lógica compartida por las vistas de Simulación y Colapso (antes duplicada).
 */
export function useInitialMapData({
  sesionId,
  estadoSesion,
  configUmbrales,
}: UseInitialMapDataParams): UseInitialMapDataResult {
  const [initialAeropuertos, setInitialAeropuertos] = useState<
    AeropuertoEnMapa[]
  >([]);
  const [initialVuelos, setInitialVuelos] = useState<VueloEnMapa[]>([]);

  // Aeropuertos visibles aun antes de iniciar la simulacion (solo nodos, sin vuelos).
  useEffect(() => {
    api
      .get<Aeropuerto[]>('/nodos')
      .then((aeropuertosData) => {
        setInitialAeropuertos(
          aeropuertosData.map((n) => {
            const pct =
              n.capacidad_almacen > 0
                ? (n.ocupacion_actual / n.capacidad_almacen) * 100
                : 0;
            return {
              ...n,
              color: colorAeropuertoPorOcupacion(pct, {
                verdeMax: configUmbrales.verdeMax,
                ambarMax: configUmbrales.ambarMax,
              }),
              ocupacionPorcentaje: pct,
            };
          }),
        );
      })
      .catch(() => {});
  }, [configUmbrales.verdeMax, configUmbrales.ambarMax]);

  useEffect(() => {
    if (!sesionId) return;
    const cargar = () => {
      api
        .get<Aeropuerto[]>('/nodos')
        .then((aeropuertosData) => {
          setInitialAeropuertos(
            aeropuertosData.map((n) => {
              const pct =
                n.capacidad_almacen > 0
                  ? (n.ocupacion_actual / n.capacidad_almacen) * 100
                  : 0;
              return {
                ...n,
                color: colorAeropuertoPorOcupacion(pct, {
                  verdeMax: configUmbrales.verdeMax,
                  ambarMax: configUmbrales.ambarMax,
                }),
                ocupacionPorcentaje: pct,
              };
            }),
          );
        })
        .catch(() => {});
      api
        .get<VueloPageResponse>('/vuelos?size=200&estado=PROGRAMADO')
        .then((r1) => {
          api
            .get<VueloPageResponse>('/vuelos?size=200&estado=EN_RUTA')
            .then((r2) => {
              setInitialVuelos(
                [...r1.content, ...r2.content].map(
                  (v: Vuelo): VueloEnMapa => ({
                    ...v,
                  }),
                ),
              );
            })
            .catch(() => {});
        })
        .catch(() => {});
    };
    cargar();
    // Con la sesión EN_CURSO la telemetría (WebSocket) es la fuente única del
    // mapa; el polling REST solo alimenta la vista previa antes de arrancar o en
    // pausa. Mantenerlo en vivo duplicaba aviones y provocaba parpadeos.
    if (estadoSesion === 'EN_CURSO') return;
    const interval = setInterval(cargar, 5000);
    return () => clearInterval(interval);
  }, [sesionId, estadoSesion, configUmbrales.verdeMax, configUmbrales.ambarMax]);

  const resetInitialData = () => {
    setInitialVuelos([]);
    setInitialAeropuertos([]);
  };

  return { initialAeropuertos, initialVuelos, resetInitialData };
}
