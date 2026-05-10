CREATE TABLE planes_viaje (
    id                  UUID PRIMARY KEY,
    equipaje_id         UUID         NOT NULL UNIQUE,
    estado_sla          VARCHAR(50)  NOT NULL DEFAULT 'EN_TIEMPO',
    tiempo_entrega_est  TIMESTAMPTZ,
    ubicacion_tipo      VARCHAR(20),
    ubicacion_id        UUID,
    ubicacion_lat       DECIMAL(9,6),
    ubicacion_lon       DECIMAL(9,6)
);

ALTER TABLE planes_viaje ADD CONSTRAINT chk_plan_viaje_estado_sla
    CHECK (estado_sla IN ('EN_TIEMPO', 'INCUMPLIMIENTO_SLA'));
ALTER TABLE planes_viaje ADD CONSTRAINT chk_plan_viaje_ubicacion_tipo
    CHECK (ubicacion_tipo IS NULL OR ubicacion_tipo IN ('NODO', 'VUELO'));