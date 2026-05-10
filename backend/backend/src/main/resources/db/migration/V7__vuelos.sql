CREATE TABLE vuelos (
    id               UUID PRIMARY KEY,
    plan_vuelos_id   UUID         NOT NULL REFERENCES plan_vuelos(id),
    codigo_vuelo     VARCHAR(20)  NOT NULL,
    estado           VARCHAR(50)  NOT NULL DEFAULT 'PROGRAMADO',
    origen_id        UUID         NOT NULL REFERENCES nodos_logisticos(id),
    destino_id       UUID         NOT NULL REFERENCES nodos_logisticos(id),
    origen_lat       DECIMAL(9,6) NOT NULL,
    origen_lon       DECIMAL(9,6) NOT NULL,
    destino_lat      DECIMAL(9,6) NOT NULL,
    destino_lon      DECIMAL(9,6) NOT NULL,
    capacidad_carga  INT          NOT NULL,
    carga_disponible INT          NOT NULL,
    hora_salida      TIMESTAMPTZ  NOT NULL,
    hora_llegada     TIMESTAMPTZ  NOT NULL
);

ALTER TABLE vuelos ADD CONSTRAINT chk_vuelo_estado
    CHECK (estado IN ('PROGRAMADO', 'EN_RUTA', 'CANCELADO', 'COMPLETADO'));

CREATE INDEX idx_vuelos_estado ON vuelos(estado);
CREATE INDEX idx_vuelos_hora_salida ON vuelos(hora_salida);
CREATE INDEX idx_vuelos_codigo ON vuelos(codigo_vuelo);