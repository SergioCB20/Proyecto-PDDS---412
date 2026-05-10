CREATE TABLE plan_vuelos (
    id              UUID PRIMARY KEY,
    descripcion     VARCHAR(255) NOT NULL,
    vigencia_desde  TIMESTAMPTZ  NOT NULL,
    vigencia_hasta  TIMESTAMPTZ  NOT NULL
);