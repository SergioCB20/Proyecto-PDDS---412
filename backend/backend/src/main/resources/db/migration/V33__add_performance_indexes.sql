-- V32: Índices compuestos para rendimiento en consultas frecuentes

-- TickService.procesarVuelosSalida: findByEstadoAndEsPlantillaAndHoraSalidaLessThanEqual
CREATE INDEX IF NOT EXISTS idx_vuelos_est_plant_hsalida
    ON vuelos(estado, es_plantilla, hora_salida);

-- TickService.procesarVuelosLlegada: findByEstadoAndEsPlantillaAndHoraLlegadaLessThanEqual
CREATE INDEX IF NOT EXISTS idx_vuelos_est_plant_hllegada
    ON vuelos(estado, es_plantilla, hora_llegada);

-- TelemetriaService, MotorEnrutamiento: findByEstadoInAndEsPlantilla, findByEstadoAndEsPlantilla
CREATE INDEX IF NOT EXISTS idx_vuelos_est_plant
    ON vuelos(estado, es_plantilla) INCLUDE (hora_salida, hora_llegada, carga_disponible, capacidad_carga);

-- SimulacionEnrutamientoService: consulta equipajes por estado + fecha_operacion
CREATE INDEX IF NOT EXISTS idx_equipajes_est_fop
    ON equipajes(estado, fecha_operacion) INCLUDE (origen_iata, destino_iata, sla_comprometido, cantidad);

-- TickService.actualizarSla: findBySesionIdWithEquipaje
CREATE INDEX IF NOT EXISTS idx_planes_viaje_sesion
    ON planes_viaje(sesion_id);

-- VueloService: findByEsPlantillaAndFechaOperacionBetween
CREATE INDEX IF NOT EXISTS idx_vuelos_plant_fop
    ON vuelos(es_plantilla, fecha_operacion);

-- SesionService: findByEstado
CREATE INDEX IF NOT EXISTS idx_sesiones_estado_tipo
    ON sesiones_ejecucion(estado, tipo);
