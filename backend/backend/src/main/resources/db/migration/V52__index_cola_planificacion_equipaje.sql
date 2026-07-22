-- V52: Índice en cola_planificacion.equipaje_id para acelerar DELETE/joins
CREATE INDEX IF NOT EXISTS idx_cola_planificacion_equipaje ON cola_planificacion(equipaje_id);
