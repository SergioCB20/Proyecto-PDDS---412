ALTER TABLE sesiones_ejecucion ADD COLUMN IF NOT EXISTS fecha_alineada_a DATE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vuelos_fecha_codigo_instancias
    ON vuelos(fecha_operacion, codigo_vuelo) WHERE es_plantilla = false;
