-- V18: Cola de Planificacion Asincrona
CREATE TABLE cola_planificacion (
    id               UUID PRIMARY KEY,
    equipaje_id      UUID         NOT NULL REFERENCES equipajes(id),
    tipo             VARCHAR(20)  NOT NULL,
    estado           VARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE',
    intentos         INT          NOT NULL DEFAULT 0,
    error            TEXT,
    fecha_creacion   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    fecha_procesado  TIMESTAMPTZ
);

CREATE INDEX idx_cola_planificacion_estado ON cola_planificacion(estado, fecha_creacion);
