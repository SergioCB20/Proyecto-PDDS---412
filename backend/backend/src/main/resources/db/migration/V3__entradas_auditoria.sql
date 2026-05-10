CREATE TABLE entradas_auditoria (
    id                UUID PRIMARY KEY,
    usuario_id        UUID         NOT NULL REFERENCES usuarios(id),
    accion            VARCHAR(255) NOT NULL,
    entidad_afectada  VARCHAR(255) NOT NULL,
    ocurrido_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditoria_usuario ON entradas_auditoria(usuario_id, ocurrido_en);