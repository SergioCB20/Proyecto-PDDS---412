-- FK equipajes.plan_viaje_id → planes_viaje.id NO tenía índice de soporte.
-- Sin él, cada `DELETE FROM planes_viaje` (en SimulacionEnrutamientoService
-- .deshacerEnrutadosEnRango cada ciclo de planificación, y en
-- SesionService.detenerSesion al detener) obligaba a PostgreSQL a hacer un
-- sequential scan de ~7.7M equipajes POR CADA fila borrada para validar la FK,
-- tardando minutos y bloqueando al planificador y al detener.
--
-- Es el mismo problema que V37 resolvió para vuelo_actual_id y segmentos.vuelo_id,
-- pero a esta FK le faltaba el índice. Índice parcial (la mayoría de equipajes
-- tienen plan_viaje_id NULL) → pequeño y suficiente para la validación de la FK.
CREATE INDEX IF NOT EXISTS idx_equipajes_plan_viaje
    ON equipajes(plan_viaje_id)
    WHERE plan_viaje_id IS NOT NULL;
