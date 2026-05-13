-- V17: Puntos SLA (BC2)
CREATE TABLE puntos_sla (
    id                   UUID PRIMARY KEY,
    reporte_id           UUID          NOT NULL REFERENCES reportes_sesion(id),
    momento_virtual      TIMESTAMPTZ   NOT NULL,
    sla_pct              DECIMAL(5,2)  NOT NULL,
    hubo_cancelacion     BOOLEAN       NOT NULL DEFAULT FALSE,
    vuelo_cancelado_ref_id UUID
);

CREATE INDEX idx_puntos_sla_reporte ON puntos_sla(reporte_id);