-- V13: Eventos de Cancelación (BC2)
CREATE TABLE eventos_cancelacion (
    id                    UUID PRIMARY KEY,
    sesion_id             UUID         NOT NULL REFERENCES sesiones_ejecucion(id),
    vuelo_ref_id          UUID         NOT NULL,
    fuente                VARCHAR(100) NOT NULL,
    causa                 VARCHAR(255),
    ocurrirdo_en_virtual  TIMESTAMPTZ,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_eventos_cancelacion_sesion ON eventos_cancelacion(sesion_id);