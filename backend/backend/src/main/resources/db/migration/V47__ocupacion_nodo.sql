-- Ocupación de almacén separada por contexto: desacopla la operación día a día de cada sesión
-- de simulación (antes compartían el único contador nodos_logisticos.ocupacion_actual).
-- sesion_id = 00000000-0000-0000-0000-000000000000 (sentinela) para la operación día a día;
-- sesion_id = id de la sesión para cada simulación.
CREATE TABLE IF NOT EXISTS ocupacion_nodo (
    id         UUID PRIMARY KEY,
    nodo_id    UUID NOT NULL REFERENCES nodos_logisticos(id),
    sesion_id  UUID NOT NULL,
    ocupacion  INT  NOT NULL DEFAULT 0,
    CONSTRAINT uk_ocupacion_nodo_ctx UNIQUE (nodo_id, sesion_id)
);

CREATE INDEX IF NOT EXISTS idx_ocupacion_nodo_sesion ON ocupacion_nodo (sesion_id);

-- La columna nodos_logisticos.ocupacion_actual queda obsoleta (la ocupación ahora es por
-- contexto en ocupacion_nodo). Se pone a 0 para no arrastrar valores viejos en lecturas legacy.
UPDATE nodos_logisticos SET ocupacion_actual = 0;
