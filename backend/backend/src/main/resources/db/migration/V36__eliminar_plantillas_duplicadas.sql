-- V36: Eliminar plantillas duplicadas (causan duplicate key al clonar instancias)
-- Migracion analoga a V35 pero para plantillas (es_plantilla = true)

-- Eliminar instancias de vuelo que apuntan a plantillas duplicadas
WITH duplicados AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY codigo_vuelo ORDER BY id) AS rn
    FROM vuelos WHERE es_plantilla = true
)
UPDATE equipajes SET vuelo_actual_id = NULL
FROM duplicados d
WHERE equipajes.vuelo_actual_id = d.id AND d.rn > 1;

-- Eliminar segmentos que referencian vuelos duplicados
WITH duplicados AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY codigo_vuelo ORDER BY id) AS rn
    FROM vuelos WHERE es_plantilla = true
)
DELETE FROM segmentos_plan sp
USING duplicados d
WHERE sp.vuelo_id = d.id AND d.rn > 1;

-- Eliminar plantillas duplicadas (conserva la de menor id)
WITH duplicados AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY codigo_vuelo ORDER BY id) AS rn
    FROM vuelos WHERE es_plantilla = true
)
DELETE FROM vuelos v
USING duplicados d
WHERE v.id = d.id AND d.rn > 1;
