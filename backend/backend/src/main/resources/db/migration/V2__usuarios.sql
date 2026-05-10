CREATE TABLE usuarios (
    id               UUID PRIMARY KEY,
    rol_id           UUID         NOT NULL REFERENCES roles(id),
    nombre           VARCHAR(255) NOT NULL,
    correo           VARCHAR(255) NOT NULL UNIQUE,
    estado           VARCHAR(50)  NOT NULL DEFAULT 'ACTIVO',
    hash_password    VARCHAR(255) NOT NULL,
    ultimo_acceso    TIMESTAMPTZ,
    intentos_fallidos INT         NOT NULL DEFAULT 0,
    nodo_ref_id      UUID,
    asignado_en      TIMESTAMPTZ
);

ALTER TABLE usuarios ADD CONSTRAINT chk_usuario_estado
    CHECK (estado IN ('ACTIVO', 'INACTIVO'));

CREATE INDEX idx_usuarios_correo ON usuarios(correo);
CREATE INDEX idx_usuarios_estado ON usuarios(estado);