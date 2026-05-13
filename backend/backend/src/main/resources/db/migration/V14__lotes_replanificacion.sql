-- V14: Lotes de Replanificación (BC2)
CREATE TABLE lotes_replanificacion (
    id               UUID PRIMARY KEY,
    evento_id        UUID        NOT NULL REFERENCES eventos_cancelacion(id),
    sesion_id        UUID        NOT NULL REFERENCES sesiones_ejecucion(id),
    estado           VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
    total_equipajes  INT         NOT NULL DEFAULT 0,
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lotes_sesion ON lotes_replanificacion(sesion_id);
CREATE INDEX idx_lotes_evento ON lotes_replanificacion(evento_id);