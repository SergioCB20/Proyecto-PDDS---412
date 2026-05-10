CREATE TABLE nodos_logisticos (
    id                UUID PRIMARY KEY,
    codigo_iata       VARCHAR(10)  NOT NULL UNIQUE,
    nombre            VARCHAR(255) NOT NULL,
    latitud           DECIMAL(9,6) NOT NULL,
    longitud          DECIMAL(9,6) NOT NULL,
    capacidad_almacen INT          NOT NULL,
    ocupacion_actual  INT          NOT NULL DEFAULT 0
);