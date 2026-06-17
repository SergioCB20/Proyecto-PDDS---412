-- V37: Add index for planificador queries on equipajes (estado + fecha_operacion)
-- Sin este indice, las consultas de backlog escanean 44M filas

CREATE INDEX IF NOT EXISTS idx_equipajes_estado_fop
    ON equipajes(estado, fecha_operacion);
