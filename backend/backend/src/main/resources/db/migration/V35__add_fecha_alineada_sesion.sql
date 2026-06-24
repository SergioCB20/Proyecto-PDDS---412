ALTER TABLE sesiones_ejecucion ADD COLUMN IF NOT EXISTS fecha_alineada_a DATE;

-- Limpiar equipajes que apuntan a vuelos duplicados antes de borrarlos
WITH duplicados AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY codigo_vuelo, fecha_operacion ORDER BY id) AS rn
    FROM vuelos WHERE es_plantilla = false
)
UPDATE equipajes SET vuelo_actual_id = NULL
FROM duplicados d
WHERE equipajes.vuelo_actual_id = d.id AND d.rn > 1;

-- Eliminar vuelos duplicados (conserva el de menor id)
WITH duplicados AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY codigo_vuelo, fecha_operacion ORDER BY id) AS rn
    FROM vuelos WHERE es_plantilla = false
)
DELETE FROM vuelos v
USING duplicados d
WHERE v.id = d.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vuelos_fecha_codigo_instancias
    ON vuelos(fecha_operacion, codigo_vuelo) WHERE es_plantilla = false;
