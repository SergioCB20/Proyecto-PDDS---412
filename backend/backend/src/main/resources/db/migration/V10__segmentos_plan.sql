CREATE TABLE segmentos_plan (
    id               UUID PRIMARY KEY,
    plan_viaje_id    UUID        NOT NULL REFERENCES planes_viaje(id),
    vuelo_id         UUID        NOT NULL REFERENCES vuelos(id),
    nodo_origen_id   UUID        NOT NULL REFERENCES nodos_logisticos(id),
    nodo_destino_id  UUID        NOT NULL REFERENCES nodos_logisticos(id),
    orden            INT         NOT NULL,
    hora_salida_prog TIMESTAMPTZ NOT NULL,
    estado           VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE'
);

ALTER TABLE segmentos_plan ADD CONSTRAINT chk_segmento_estado
    CHECK (estado IN ('PENDIENTE', 'EN_CURSO', 'COMPLETADO', 'CANCELADO'));

CREATE INDEX idx_segmentos_plan_viaje ON segmentos_plan(plan_viaje_id);
CREATE INDEX idx_segmentos_orden ON segmentos_plan(plan_viaje_id, orden);